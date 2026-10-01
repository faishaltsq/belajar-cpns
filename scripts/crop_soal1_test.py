"""
Precise cropper for Analogi questions into stem + 5 individual options.
Layout: 1-column stacked options (each option is ~16pt tall).
"""
import fitz
import os
import json
from PIL import Image
import numpy as np

PDF_PATH = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\NEW - 12 SEPTEMBER 2024\TIU SKD CPNS.pdf"
OUT_DIR = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
DPI = 280
SCALE = DPI / 72.0

os.makedirs(OUT_DIR, exist_ok=True)
doc = fitz.open(PDF_PATH)

def render_page(pg_idx):
    page = doc[pg_idx]
    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def trim_whitespace(img, pad=6):
    arr = np.array(img)
    row_means = arr.mean(axis=(1, 2))
    col_means = arr.mean(axis=(0, 2))
    row_mask = row_means < 252
    col_mask = col_means < 252
    if row_mask.any() and col_mask.any():
        r0 = max(0, int(np.argmax(row_mask)) - pad)
        r1 = min(img.height, len(row_mask) - int(np.argmax(row_mask[::-1])) + pad)
        c0 = max(0, int(np.argmax(col_mask)) - pad)
        c1 = min(img.width, len(col_mask) - int(np.argmax(col_mask[::-1])) + pad)
        return img.crop((c0, r0, c1, r1))
    return img

def crop_box(img, box_pdf, pad_x=(40, 40)):
    y0_pdf, y1_pdf = box_pdf
    y0 = int(y0_pdf * SCALE)
    y1 = int(y1_pdf * SCALE)
    x0 = int(pad_x[0] * SCALE)
    x1 = img.width - int(pad_x[1] * SCALE)
    return img.crop((x0, y0, x1, y1))

# Process Page 176 - Soal 1 (2-col layout)
page_img = render_page(175)
pw_pdf = 439.68

# Stem: y=257-380
stem = crop_box(page_img, (257, 380))
stem = trim_whitespace(stem)
stem.save(os.path.join(OUT_DIR, "fig_analogi_01_stem.png"))
print(f"Soal 1 stem: {stem.size}")

# Soal 1 has 2-column options:
# A: y=381-395 (left), B: y=398-412 (left), C: y=415-429 (left)
# D: y=381-395 (right), E: y=398-412 (right)
# In 2-col layout, the actual figure is next to the label:
# Left col = x: 40 to 220. Label at x=74-142. Figure at x=145-220
# Right col = x: 220 to 400. Label at x=248-316. Figure at x=318-400
opts = {
    'a': (380, 396, 40, 220),
    'b': (397, 413, 40, 220),
    'c': (414, 430, 40, 220),
    'd': (380, 396, 220, 400),
    'e': (397, 413, 220, 400),
}

for opt, (y0, y1, x0, x1) in opts.items():
    crop = page_img.crop((int(x0*SCALE), int(y0*SCALE), int(x1*SCALE), int(y1*SCALE)))
    crop = trim_whitespace(crop)
    crop.save(os.path.join(OUT_DIR, f"fig_analogi_01_opt_{opt}.png"))
    print(f"Soal 1 opt_{opt}: {crop.size}")

print("Soal 1 done")
