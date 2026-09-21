#!/usr/bin/env python3
import subprocess, re, json, os
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = "./source_pdfs"   # put 0.pdf, 1.pdf, ..., 10.pdf here
OUT_DIR = "./output"
IMG_DIR = os.path.join(OUT_DIR, "images")
os.makedirs(IMG_DIR, exist_ok=True)

NUMBERS = list(range(0, 11))
KEEP_PAGES = {1: "learn", 2: "write", 3: "countChoose", 4: "circleFind", 5: "trace", 6: "color"}
DPI = 110
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# Numbers 2 and 3 render their countChoose answer numerals as raster images,
# not real PDF text, so pdftotext -bbox can't see them. Both share the exact
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
    out_prefix = os.path.join(IMG_DIR, f"{n}_page")
    subprocess.run(["pdftoppm", "-png", "-r", str(DPI), f"{SRC_DIR}/{n}.pdf", out_prefix],
                    check=True, capture_output=True)
    files = {}
    for i in KEEP_PAGES:
        for c in (f"{out_prefix}-{i}.png", f"{out_prefix}-0{i}.png"):
            if os.path.exists(c):
                files[i] = c
                break
    for i in range(1, 8):
        if i not in KEEP_PAGES:
            for c in (f"{out_prefix}-{i}.png", f"{out_prefix}-0{i}.png"):
                if os.path.exists(c):
                    os.remove(c)
    return files


def get_numeral_boxes(n, page_num):
    result = subprocess.run(
        ["pdftotext", "-bbox", "-f", str(page_num), "-l", str(page_num), f"{SRC_DIR}/{n}.pdf", "-"],
        check=True, capture_output=True, text=True)
    xml_text = result.stdout
    page_m = re.search(r'<page width="([\d.]+)" height="([\d.]+)"', xml_text)
    if not page_m:
        return [], 612.0, 792.0
    pw, ph = float(page_m.group(1)), float(page_m.group(2))
    boxes = []
    for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)</word>', xml_text):
        xmin, ymin, xmax, ymax, text = m.groups()
        text = text.strip()
        if re.fullmatch(r"\d+", text):
            xmin, ymin, xmax, ymax = map(float, (xmin, ymin, xmax, ymax))
            boxes.append({"value": int(text), "xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax})
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
        pdf_path = f"{SRC_DIR}/{n}.pdf"
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
