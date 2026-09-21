#!/usr/bin/env python3
"""Windows-native port of extract_worksheets.py.

Same behavior as the original (render 0.pdf..10.pdf to six page PNGs each,
extract numeral click-zones, patch wrong numerals, write manifest.json)
but uses PyMuPDF instead of the poppler binaries (pdftoppm/pdftotext),
which are not fully available on this machine.

Coordinate compatibility notes:
- pdftotext -bbox and PyMuPDF get_text('words') both report PDF-point
  boxes with a top-left origin — same space, same cluster math works.
- pdftoppm -r 110 and get_pixmap(dpi=110) produce identical pixel scales,
  so the hand-measured pixel template for numbers 2/3 stays valid.
- FONT_PATH moved to a Windows system font (Arial Bold), metric twin of
  the Liberation Sans Bold the original used.

Usage:  python extract-worksheets-win.py <source_dir> <out_dir>
        (expects <source_dir>/0.pdf .. 10.pdf)
"""
import json
import os
import re
import subprocess
import sys

import pymupdf
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else "./source_pdfs"
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else "./output"
IMG_DIR = os.path.join(OUT_DIR, "images")
os.makedirs(IMG_DIR, exist_ok=True)

NUMBERS = list(range(0, 11))
KEEP_PAGES = {1: "learn", 2: "write", 3: "countChoose", 4: "circleFind", 5: "trace", 6: "color"}
DPI = 110
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"

# Numbers 2 and 3 render their countChoose answer numerals as raster images,
# not real PDF text, so text extraction can't see them. Both share the exact
# same 2x2 cluster template (measured directly from the rendered page via
# grid-line detection) — only the target value differs.
IMAGE_BASED_COUNTCHOOSE_LAYOUT = {
    "tl": {"box": (56, 447, 525, 634), "order": [2, 1, 3]},
    "tr": {"box": (489, 880, 525, 634), "order": [3, 1, 2]},
    "bl": {"box": (56, 447, 1004, 1122), "order": [3, 1, 2]},
    "br": {"box": (489, 880, 1004, 1122), "order": [2, 1, 3]},
}
IMAGE_BASED_NUMBERS = {2, 3}


def render_pages(n):
    """Render all pages of n.pdf at DPI, keep pages 1-6, drop the rest."""
    doc = pymupdf.open(os.path.join(SRC_DIR, f"{n}.pdf"))
    files = {}
    for page_num in KEEP_PAGES:
        if page_num - 1 >= len(doc):
            continue
        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=DPI)
        out = os.path.join(IMG_DIR, f"{n}_page-{page_num}.png")
        pix.save(out)
        files[page_num] = out
    doc.close()
    # Remove leftovers from a previous run that are no longer kept.
    for i in range(1, 8):
        if i not in KEEP_PAGES:
            c = os.path.join(IMG_DIR, f"{n}_page-{i}.png")
            if os.path.exists(c):
                os.remove(c)
    return files


def get_numeral_boxes(n, page_num):
    """Digit word boxes in PDF points for one page (mirrors pdftotext -bbox)."""
    doc = pymupdf.open(os.path.join(SRC_DIR, f"{n}.pdf"))
    page = doc[page_num - 1]
    pw, ph = page.rect.width, page.rect.height
    boxes = []
    for w in page.get_text("words"):
        x0, y0, x1, y1, text = w[0], w[1], w[2], w[3], w[4]
        text = text.strip()
        if re.fullmatch(r"\d+", text):
            boxes.append({"value": int(text), "xmin": x0, "ymin": y0,
                          "xmax": x1, "ymax": y1})
    doc.close()
    return boxes, pw, ph


def cluster_rows(boxes, row_tol=15):
    boxes = sorted(boxes, key=lambda b: b["ymin"])
    rows = []
    for b in boxes:
        placed = False
        for row in rows:
            if abs(row[0]["ymin"] - b["ymin"]) < row_tol:
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])
    clusters = []
    for row in rows:
        row_sorted = sorted(row, key=lambda b: -b["xmin"])
        for i in range(0, len(row_sorted), 3):
            chunk = row_sorted[i:i + 3]
            if chunk:
                clusters.append(chunk)
    return clusters


def patch_image(img_path, edits, pw, ph):
    """edits: list of (box_dict, new_value) in PDF-point coordinates."""
    im = Image.open(img_path).convert("RGB")
    draw = ImageDraw.Draw(im)
    scale_x = im.width / pw
    scale_y = im.height / ph
    for box, new_value in edits:
        x0, y0 = box["xmin"] * scale_x, box["ymin"] * scale_y
        x1, y1 = box["xmax"] * scale_x, box["ymax"] * scale_y
        pad = 4
        draw.rectangle([x0 - pad, y0 - pad, x1 + pad, y1 + pad], fill="white")
        font_size = int((y1 - y0) * 0.95)
        font = ImageFont.truetype(FONT_PATH, font_size)
        text = str(new_value)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = x0 + ((x1 - x0) - tw) / 2 - bbox[0]
        ty = y0 + ((y1 - y0) - th) / 2 - bbox[1]
        draw.text((tx, ty), text, fill="black", font=font)
    im.save(img_path)


def process_count_choose(n, img_path, report):
    if n in IMAGE_BASED_NUMBERS:
        # Hand-measured template shared by 2 and 3 (image-based numerals).
        im = Image.open(img_path)
        w, h = im.size
        numerals = []
        for _, spec in IMAGE_BASED_COUNTCHOOSE_LAYOUT.items():
            x0, x1, y0, y1 = spec["box"]
            cw = (x1 - x0) / 3
            for i, val in enumerate(spec["order"]):
                cx0, cx1 = x0 + i * cw, x0 + (i + 1) * cw
                numerals.append({
                    "value": val,
                    "xPct": round(cx0 / w * 100, 2),
                    "yPct": round(y0 / h * 100, 2),
                    "wPct": round((cx1 - cx0) / w * 100, 2),
                    "hPct": round((y1 - y0) / h * 100, 2),
                    "correct": val == n,
                })
        return numerals

    boxes, pw, ph = get_numeral_boxes(n, 3)
    clusters = cluster_rows(boxes)
    edits = []
    for cluster in clusters:
        values = [b["value"] for b in cluster]
        if n not in values:
            worst = max(cluster, key=lambda b: abs(b["value"] - n))
            edits.append((dict(worst), n))
            worst["value"] = n
            report.append(f"number {n} page3 (countChoose): patched a cluster missing the correct answer")
    if edits:
        patch_image(img_path, edits, pw, ph)
    numerals = [{
        "value": b["value"],
        "xPct": round(b["xmin"] / pw * 100, 2),
        "yPct": round(b["ymin"] / ph * 100, 2),
        "wPct": round((b["xmax"] - b["xmin"]) / pw * 100, 2),
        "hPct": round((b["ymax"] - b["ymin"]) / ph * 100, 2),
        "correct": b["value"] == n,
    } for b in boxes]
    if not any(x["correct"] for x in numerals):
        report.append(f"!! number {n} page3 (countChoose): NO correct numeral even after fix")
    return numerals


def process_circle_find(n, img_path, report):
    boxes, pw, ph = get_numeral_boxes(n, 4)
    has_correct = any(b["value"] == n for b in boxes)
    if not has_correct and boxes:
        # Whole-page fix: relabel the single closest-value token to the target.
        closest = min(boxes, key=lambda b: abs(b["value"] - n))
        patch_image(img_path, [(dict(closest), n)], pw, ph)
        closest["value"] = n
        report.append(f"number {n} page4 (circleFind): page had zero matches for {n}, relabeled one token")
    numerals = [{
        "value": b["value"],
        "xPct": round(b["xmin"] / pw * 100, 2),
        "yPct": round(b["ymin"] / ph * 100, 2),
        "wPct": round((b["xmax"] - b["xmin"]) / pw * 100, 2),
        "hPct": round((b["ymax"] - b["ymin"]) / ph * 100, 2),
        "correct": b["value"] == n,
    } for b in boxes]
    return numerals


def main():
    manifest = {}
    report = []
    for n in NUMBERS:
        pdf_path = os.path.join(SRC_DIR, f"{n}.pdf")
        if not os.path.exists(pdf_path):
            print(f"!! missing {n}.pdf")
            continue
        print(f"Processing {n}...")
        page_files = render_pages(n)
        entry = {"pages": {}}
        for page_num, page_type in KEEP_PAGES.items():
            img_path = page_files.get(page_num)
            page_entry = {"type": page_type, "image": os.path.basename(img_path) if img_path else None}
            if page_num == 3 and img_path:
                page_entry["numerals"] = process_count_choose(n, img_path, report)
            elif page_num == 4 and img_path:
                page_entry["numerals"] = process_circle_find(n, img_path, report)
            entry["pages"][str(page_num)] = page_entry
        manifest[str(n)] = entry

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n--- Fix report ---")
    print("\n".join(report) if report else "No mismatches found.")


if __name__ == "__main__":
    main()
