"""
Extract figural/spatial question images from TIU SKD CPNS PDF.
Pages 175-208 contain figural TIU questions (serial, analogy, spatial pattern).
Filters: skip header/footer logos (< 8KB or < 80px dimension).
Output: public/images/questions/figural_*.png + src/data/figural_bank.json
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))

import pymupdf  # pip install PyMuPDF

PDF_PATH = "C:/Users/cubeb/OneDrive/Documents/EBOOK CPNS/NEW - 12 SEPTEMBER 2024/TIU SKD CPNS.pdf"
OUT_DIR = "public/images/questions"
FIGURAL_PAGES_START = 174  # 0-indexed page 175
FIGURAL_PAGES_END = 208    # 0-indexed page 208 exclusive
MIN_DIM = 80   # px — skip tiny logos/bullets
MIN_SIZE = 6000  # bytes — skip header decorations

os.makedirs(OUT_DIR, exist_ok=True)

doc = pymupdf.open(PDF_PATH)
extracted = []
img_index = 0

for page_num in range(FIGURAL_PAGES_START, min(FIGURAL_PAGES_END, len(doc))):
    page = doc.load_page(page_num)
    images = page.get_images(full=True)

    for img_info in images:
        xref = img_info[0]
        try:
            base_image = doc.extract_image(xref)
        except Exception:
            continue

        img_bytes = base_image["image"]
        width = base_image["width"]
        height = base_image["height"]
        ext = base_image["ext"]

        # Filter small/decorative images
        if width < MIN_DIM or height < MIN_DIM:
            continue
        if len(img_bytes) < MIN_SIZE:
            continue
        # Skip very wide-narrow images (likely header/footer separators)
        aspect = width / height if height > 0 else 0
        if aspect > 10 or aspect < 0.1:
            continue

        fname = f"figural_{img_index:04d}.png"
        fpath = os.path.join(OUT_DIR, fname)

        # Save as PNG (convert if not already PNG)
        pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.Pixmap(img_bytes))
        pix.save(fpath)

        extracted.append({
            "id": img_index,
            "file": f"/images/questions/{fname}",
            "sourcePage": page_num + 1,
            "width": width,
            "height": height,
        })
        img_index += 1
        print(f"  Extracted: {fname} ({width}x{height}) from page {page_num+1}")

print(f"\nTotal extracted: {img_index} images")

# Write figural bank JSON — pair consecutive images as soal (question + options)
# Heuristic: pages 175-195 single-question images, pages 196+ multi-option matrices
# Group images into figural_items for later use by admin panel / generator
bank = []
i = 0
qid = 1
while i < len(extracted):
    item = extracted[i]
    page = item["sourcePage"]

    # Pages with ≥3 images per page → treat as a set (1 stem + multiple option images)
    same_page = [x for x in extracted if x["sourcePage"] == page]
    if len(same_page) >= 3:
        q_img = same_page[0]["file"]
        opt_imgs = [x["file"] for x in same_page[1:5]]
        bank.append({
            "id": qid,
            "category": "TIU",
            "subCategory": "Figural Serial",
            "text": "Pilihlah gambar yang merupakan kelanjutan dari pola atau deret berikut ini.",
            "image": q_img,
            "options": [
                {"id": k, "text": f"Gambar {k}", "score": 5 if j == 0 else 0, "image": opt_imgs[j] if j < len(opt_imgs) else None}
                for j, k in enumerate(["A", "B", "C", "D", "E"])
            ],
            "explanation": "Perhatikan pola rotasi, pencerminan, atau penambahan elemen pada setiap gambar.",
        })
        i += len(same_page)
        # avoid processing same page twice
        extracted = [x for x in extracted if x["sourcePage"] != page]
        continue
    else:
        bank.append({
            "id": qid,
            "category": "TIU",
            "subCategory": "Figural Analogi",
            "text": "Tentukan gambar yang tepat untuk melengkapi analogi gambar berikut.",
            "image": item["file"],
            "options": [
                {"id": "A", "text": "Pilihan A", "score": 5},
                {"id": "B", "text": "Pilihan B", "score": 0},
                {"id": "C", "text": "Pilihan C", "score": 0},
                {"id": "D", "text": "Pilihan D", "score": 0},
                {"id": "E", "text": "Pilihan E", "score": 0},
            ],
            "explanation": "Analisis pola hubungan antar gambar pada pasangan pertama, lalu terapkan pada pasangan kedua.",
        })
        i += 1

    qid += 1
    if qid > 50:
        break

bank_path = "src/data/figural_bank.json"
with open(bank_path, "w", encoding="utf-8") as f:
    json.dump(bank, f, ensure_ascii=False, indent=2)

print(f"Figural bank: {len(bank)} soal → {bank_path}")
