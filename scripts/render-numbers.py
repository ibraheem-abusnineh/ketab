#!/usr/bin/env python3
"""Regenerate the Numbers (Math) worksheet assets from the source PDFs.

For each of numbers 1..10 this:
  1. Renders PDF pages 1..6 to public/numbers/{n}/page-{1..6}.png
     at 110 DPI (935x1210, matching the shipped assets).
  2. Rewrites that number's entry in src/data/numbersManifest.json
     (page 3 = countChoose, page 4 = circleFind, each with the
     tappable numeral hotspots the app positions by percentage).

Source page order (7 pages per PDF):
  1 learn · 2 write · 3 countChoose · 4 circleFind · 5 trace · 6 color
  7 "أعد ثم أصل بالعدد الصحيح" (connect/match) — NOT used yet, skipped.

If a source countChoose page is missing the target number inside one of
its four option clusters, the worst wrong numeral is relabeled to the
target (image + manifest), mirroring the legacy extract-worksheets.py.

Numbers 0 and any number without a PDF are left untouched.

PyMuPDF (pymupdf) is required:  pip install pymupdf

Usage:
  python scripts/render-numbers.py --src "<folder with العدد N.pdf>"
  python scripts/render-numbers.py --src "..." --dry-run
"""

import argparse
import json
import os
import re
import sys

try:
    import pymupdf
except ImportError:  # pragma: no cover - environment guard
    print("pymupdf is required: pip install pymupdf", file=sys.stderr)
    sys.exit(2)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MANIFEST = os.path.join(REPO, "src", "data", "numbersManifest.json")
DEFAULT_OUT = os.path.join(REPO, "public", "numbers")
DEFAULT_SRC = r"C:\Users\iblfe\Downloads\أوراق أعمال للأعداد 0-1000 (1)\أوراق العمل word"

DPI = 110
REF_W, REF_H = 935, 1210  # render size the image-based template was measured at

# PDF page index (1-based) -> app page type. Page 7 is skipped on purpose.
PAGE_TYPES = {1: "learn", 2: "write", 3: "countChoose", 4: "circleFind", 5: "trace", 6: "color"}

# Numbers 2 and 3 render their countChoose answer numerals as raster
# images (no extractable text), so their option boxes/values are read
# from this hand-measured 2x2 template. Box = (x0, x1, y0, y1) in
# reference pixels; order = the three option values left-to-right.
IMAGE_BASED_NUMBERS = {2, 3}
IMAGE_BASED_TEMPLATE = {
    "tl": {"box": (56, 447, 525, 634), "order": [2, 1, 3]},
    "tr": {"box": (489, 880, 525, 634), "order": [3, 1, 2]},
    "bl": {"box": (56, 447, 1004, 1122), "order": [3, 1, 2]},
    "br": {"box": (489, 880, 1004, 1122), "order": [2, 1, 3]},
}

# Some source countChoose pages are missing the target number inside one
# of their four option clusters (e.g. number 7's bottom-left cluster
# offers 8 9 6). Like the legacy extract-worksheets.py, we relabel the
# worst wrong numeral in that cluster to the target so every cluster has
# a correct (circlable) answer. The fix is drawn onto the rendered page
# with the source font (Calibri) and reflected in the manifest.
CALIBRI_CANDIDATES = [
    r"C:\Windows\Fonts\calibri.ttf",
    "/usr/share/fonts/truetype/crosextra/Calibri.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]
# A page's four option clusters split at ~50% x and ~60% y.
CLUSTER_X_SPLIT, CLUSTER_Y_SPLIT = 50.0, 60.0


def pdf_path(src, n):
    return os.path.join(src, f"العدد {n}.pdf")


def find_font():
    for path in CALIBRI_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def text_numerals(page, n):
    """Hotspots for a countChoose/circleFind page whose numerals are text."""
    w_pt, h_pt = page.rect.width, page.rect.height
    out = []
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        if not re.fullmatch(r"\d+", word):
            continue
        out.append({
            "value": int(word),
            "xPct": round(x0 / w_pt * 100, 2),
            "yPct": round(y0 / h_pt * 100, 2),
            "wPct": round((x1 - x0) / w_pt * 100, 2),
            "hPct": round((y1 - y0) / h_pt * 100, 2),
            "correct": int(word) == n,
        })
    return out


def template_numerals(n, img_w, img_h):
    """Hotspots for the image-based countChoose pages (numbers 2 and 3)."""
    sx, sy = img_w / REF_W, img_h / REF_H
    out = []
    for spec in IMAGE_BASED_TEMPLATE.values():
        x0, x1, y0, y1 = spec["box"]
        x0, x1, y0, y1 = x0 * sx, x1 * sx, y0 * sy, y1 * sy
        cw = (x1 - x0) / 3
        for i, val in enumerate(spec["order"]):
            cx0, cx1 = x0 + i * cw, x0 + (i + 1) * cw
            out.append({
                "value": val,
                "xPct": round(cx0 / img_w * 100, 2),
                "yPct": round(y0 / img_h * 100, 2),
                "wPct": round((cx1 - cx0) / img_w * 100, 2),
                "hPct": round((y1 - y0) / img_h * 100, 2),
                "correct": val == n,
            })
    return out


def cluster_of(num):
    """Which of the four countChoose option clusters a numeral sits in."""
    col = 0 if num["xPct"] < CLUSTER_X_SPLIT else 1
    row = 0 if num["yPct"] < CLUSTER_Y_SPLIT else 1
    return row, col


def plan_cluster_fixes(numerals, n, img_w, img_h):
    """For any cluster lacking n, pick the worst wrong numeral and plan a
    pixel-space edit that relabels it to n. Mutates `numerals` to match.
    Returns a list of (x0, y0, x1, y1, text) edits in image pixels."""
    clusters = {}
    for i, num in enumerate(numerals):
        clusters.setdefault(cluster_of(num), []).append(i)

    edits, fixed = [], []
    for idxs in clusters.values():
        if any(numerals[i]["correct"] for i in idxs):
            continue
        worst = max(idxs, key=lambda i: abs(numerals[i]["value"] - n))
        num = numerals[worst]
        x0 = num["xPct"] / 100 * img_w
        y0 = num["yPct"] / 100 * img_h
        x1 = x0 + num["wPct"] / 100 * img_w
        y1 = y0 + num["hPct"] / 100 * img_h
        edits.append((x0, y0, x1, y1, str(n)))
        fixed.append(num["value"])
        num["value"] = n
        num["correct"] = True
    return edits, fixed


def patch_png(png_path, edits):
    """White out each edit box and draw the replacement digit centered."""
    from PIL import Image, ImageDraw, ImageFont

    font_path = find_font()
    im = Image.open(png_path).convert("RGB")
    draw = ImageDraw.Draw(im)
    for x0, y0, x1, y1, text in edits:
        draw.rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], fill="white")
        size = max(8, int(round(y1 - y0)))
        font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        tb = draw.textbbox((0, 0), text, font=font)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        tx = x0 + ((x1 - x0) - tw) / 2 - tb[0]
        ty = y0 + ((y1 - y0) - th) / 2 - tb[1]
        draw.text((tx, ty), text, fill="black", font=font)
    im.save(png_path)


def build_number(src, out_dir, n, dry_run):
    path = pdf_path(src, n)
    if not os.path.exists(path):
        print(f"  n={n}: no PDF, skipping ({os.path.basename(path)})")
        return None

    doc = pymupdf.open(path)
    if doc.page_count < 6:
        print(f"  n={n}: only {doc.page_count} pages, skipping", file=sys.stderr)
        return None

    entry = {"pages": {}}
    warnings = []
    for k, ptype in PAGE_TYPES.items():
        page = doc[k - 1]
        img_w = round(page.rect.width * DPI / 72)
        img_h = round(page.rect.height * DPI / 72)
        pdata = {"type": ptype, "image": f"{n}_page-{k}.png"}
        edits = []

        if k == 3:
            if n in IMAGE_BASED_NUMBERS:
                pdata["numerals"] = template_numerals(n, REF_W, REF_H)
            else:
                pdata["numerals"] = text_numerals(page, n)
                edits, fixed = plan_cluster_fixes(pdata["numerals"], n, img_w, img_h)
                if fixed:
                    warnings.append(
                        f"page {k}: relabeled {fixed} -> {n} in a cluster missing the answer"
                    )
        elif k == 4:
            pdata["numerals"] = text_numerals(page, n)

        if "numerals" in pdata:
            if not pdata["numerals"]:
                warnings.append(f"page {k} ({ptype}): no numerals found")
            elif not any(x["correct"] for x in pdata["numerals"]):
                warnings.append(f"page {k} ({ptype}): no correct numeral (value {n} missing)")

        if not dry_run:
            dest_dir = os.path.join(out_dir, str(n))
            os.makedirs(dest_dir, exist_ok=True)
            png_path = os.path.join(dest_dir, f"page-{k}.png")
            page.get_pixmap(dpi=DPI, alpha=False).save(png_path)
            if edits:
                patch_png(png_path, edits)

        entry["pages"][str(k)] = pdata

    doc.close()
    suffix = ("  !! " + "; ".join(warnings)) if warnings else ""
    print(f"  n={n}: wrote 6 pages{suffix}")
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--manifest", default=DEFAULT_MANIFEST)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--numbers", default="1-10")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if "-" in args.numbers:
        lo, hi = args.numbers.split("-")
        numbers = list(range(int(lo), int(hi) + 1))
    else:
        numbers = [int(x) for x in args.numbers.split(",")]

    if not os.path.isdir(args.src):
        print(f"source folder not found: {args.src}", file=sys.stderr)
        sys.exit(2)

    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)

    print(f"source : {args.src}")
    print(f"images : {args.out}")
    print(f"manifest: {args.manifest}{'  (dry run)' if args.dry_run else ''}")
    changed = 0
    for n in numbers:
        entry = build_number(args.src, args.out, n, args.dry_run)
        if entry is not None:
            manifest[str(n)] = entry
            changed += 1

    if not args.dry_run and changed:
        with open(args.manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"done: {changed} number(s) updated")


if __name__ == "__main__":
    main()
