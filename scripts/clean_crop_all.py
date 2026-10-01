"""
Crop ONLY the figures from the PDF for all 46 questions, EXCLUDING:
1. Question instruction text (e.g. "1. Carilah pasangan gambar...")
2. Option label text (e.g. "A. Gambar A", "B. Gambar B"...)
Result: PURE figures (stem + option pictures), tight crop, no duplicate text.
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

doc = fitz.open(PDF_PATH)

def render_page(pg_idx):
    page = doc[pg_idx]
    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def trim_whitespace(img, pad=10):
    arr = np.array(img)
    H, W = arr.shape[:2]
    row_dark = (arr.mean(axis=2) < 200).sum(axis=1) / W
    col_dark = (arr.mean(axis=2) < 200).sum(axis=0) / H
    
    rows = np.where(row_dark > 0.005)[0]
    cols = np.where(col_dark > 0.005)[0]
    
    if len(rows) == 0 or len(cols) == 0:
        return img
    
    r0 = max(0, rows[0] - pad)
    r1 = min(H, rows[-1] + pad + 1)
    c0 = max(0, cols[0] - pad)
    c1 = min(W, cols[-1] + pad + 1)
    return img.crop((c0, r0, c1, r1))

# Page cache
page_cache = {}
def get_page(pg_idx):
    if pg_idx not in page_cache:
        page_cache[pg_idx] = render_page(pg_idx)
    return page_cache[pg_idx]

def crop_box(pg_idx, y0_pdf, y1_pdf, x0_pdf=45, x1_pdf=400):
    img = get_page(pg_idx)
    box = (int(x0_pdf * SCALE), int(y0_pdf * SCALE), int(x1_pdf * SCALE), int(y1_pdf * SCALE))
    return img.crop(box)

def stack_vertical(img1, img2):
    w = max(img1.width, img2.width)
    h = img1.height + img2.height
    new_img = Image.new("RGB", (w, h), (255, 255, 255))
    new_img.paste(img1, (0, 0))
    new_img.paste(img2, (0, img1.height))
    return new_img

# ─── CROPPING COORDINATES PER SOAL (FIGURES ONLY, NO TEXT) ─────────────────
# Each entry: (filename, [(page_0idx, y_top_pdf, y_bot_pdf)])
# y_bot_pdf stops BEFORE the first "A." text label to exclude option text!

CROPS = [
    # ─── ANALOGI (17 soal) ───
    ("fig_analogi_01.png", [(175, 258, 381)]),                 # P176: Q1 stem + opt figs (cut before A at 383.7)
    ("fig_analogi_02.png", [(175, 485, 610), (176, 50, 219)]), # P176 bot + P177 top (cut before A at 221.4)
    ("fig_analogi_03.png", [(176, 310, 487)]),                 # P177: Q3 (cut before A at 489.8)
    ("fig_analogi_04.png", [(177, 85, 271)]),                  # P178: Q4 (cut before A at 273.3)
    ("fig_analogi_05.png", [(177, 385, 508)]),                 # P178: Q5 (cut before A at 510.4)
    ("fig_analogi_06.png", [(178, 120, 276)]),                 # P179: Q6 (cut before A at 278.3)
    ("fig_analogi_07.png", [(178, 390, 531)]),                 # P179: Q7 (cut before A at 533.4)
    ("fig_analogi_08.png", [(179, 135, 323)]),                 # P180: Q8 (cut before A at 325.1)
    ("fig_analogi_09.png", [(179, 435, 610), (180, 50, 272)]), # P180 bot + P181 top (cut before A at 274.2)
    ("fig_analogi_10.png", [(180, 360, 548)]),                 # P181: Q10 (cut before A at 550.5)
    ("fig_analogi_11.png", [(181, 155, 398)]),                 # P182: Q11 (cut before A at 400.7)
    ("fig_analogi_12.png", [(181, 515, 610), (182, 50, 261)]), # P182 bot + P183 top (cut before A at 263.4)
    ("fig_analogi_13.png", [(182, 380, 610), (183, 50, 255)]), # P183 bot + P184 top (cut before A at 257.4)
    ("fig_analogi_14.png", [(183, 370, 610), (184, 50, 260)]), # P184 bot + P185 top (cut before A at 262.0)
    ("fig_analogi_15.png", [(184, 375, 533)]),                 # P185: Q15 (cut before A at 535.8)
    ("fig_analogi_16.png", [(185, 135, 248)]),                 # P186: Q16 (cut before A at 250.2)
    ("fig_analogi_17.png", [(185, 365, 471)]),                 # P186: Q17 (cut before A at 473.9)

    # ─── KETIDAKSAMAAN (14 soal) ───
    ("fig_ketidaksamaan_01.png", [(190, 105, 182)]), # P191: Q1 (cut before A at 184.7)
    ("fig_ketidaksamaan_02.png", [(190, 295, 338)]), # P191: Q2 (cut before A at 340.7)
    ("fig_ketidaksamaan_03.png", [(190, 455, 510)]), # P191: Q3 (cut before A at 512.8)
    ("fig_ketidaksamaan_04.png", [(191, 118, 187)]), # P192: Q4 (cut before A at 189.3)
    ("fig_ketidaksamaan_05.png", [(191, 300, 359)]), # P192: Q5 (cut before A at 361.8)
    ("fig_ketidaksamaan_06.png", [(191, 470, 543)]), # P192: Q6 (cut before A at 545.7)
    ("fig_ketidaksamaan_07.png", [(192, 150, 222)]), # P193: Q7 (cut before A at 224.3)
    ("fig_ketidaksamaan_08.png", [(192, 335, 408)]), # P193: Q8 (cut before A at 410.3)
    ("fig_ketidaksamaan_09.png", [(192, 510, 610), (193, 50, 128)]), # P193 bot + P194 top (cut before A at 130.0)
    ("fig_ketidaksamaan_10.png", [(193, 225, 316)]), # P194: Q10 (cut before A at 318.4)
    ("fig_ketidaksamaan_11.png", [(193, 430, 495)]), # P194: Q11 (cut before A at 497.0)
    ("fig_ketidaksamaan_12.png", [(194, 100, 161)]), # P195: Q12 (cut before A at 163.6)
    ("fig_ketidaksamaan_13.png", [(194, 275, 348)]), # P195: Q13 (cut before A at 350.6)
    ("fig_ketidaksamaan_14.png", [(194, 460, 528)]), # P195: Q14 (cut before A at 530.6)

    # ─── SERIAL (15 soal) ───
    ("fig_serial_01.png", [(197, 360, 476)]),                 # P198: Q1 (cut before A at 478.2)
    ("fig_serial_02.png", [(197, 560, 610), (198, 50, 234)]), # P198 bot + P199 top (cut before A at 236.8)
    ("fig_serial_03.png", [(198, 345, 501)]),                 # P199: Q3 (cut before A at 503.7)
    ("fig_serial_04.png", [(199, 100, 265)]),                 # P200: Q4 (cut before A at 267.8)
    ("fig_serial_05.png", [(199, 360, 508)]),                 # P200: Q5 (cut before A at 510.6)
    ("fig_serial_06.png", [(200, 100, 217)]),                 # P201: Q6 (cut before A at 219.5)
    ("fig_serial_07.png", [(200, 330, 441)]),                 # P201: Q7 (cut before A at 443.0)
    ("fig_serial_08.png", [(200, 520, 610), (201, 50, 166)]), # P201 bot + P202 top (cut before A at 168.9)
    ("fig_serial_09.png", [(201, 275, 429)]),                 # P202: Q9 (cut before A at 431.7)
    ("fig_serial_10.png", [(201, 515, 610), (202, 50, 178)]), # P202 bot + P203 top (cut before A at 180.9)
    ("fig_serial_11.png", [(202, 290, 430)]),                 # P203: Q11 (cut before A at 432.6)
    ("fig_serial_12.png", [(202, 515, 610), (203, 50, 215)]), # P203 bot + P204 top (cut before A at 217.4)
    ("fig_serial_13.png", [(203, 325, 451)]),                 # P204: Q13 (cut before A at 453.3)
    ("fig_serial_14.png", [(203, 530, 610), (204, 50, 203)]), # P204 bot + P205 top (cut before A at 205.4)
    ("fig_serial_15.png", [(204, 315, 440)]),                 # P205: Q15 (cut before A at 442.2)
]

print(f"Total planned crops: {len(CROPS)}")

success = 0
for fname, segments in CROPS:
    try:
        imgs = [crop_box(pg, y0, y1) for pg, y0, y1 in segments]
        combined = imgs[0]
        for img in imgs[1:]:
            combined = stack_vertical(combined, img)
        
        trimmed = trim_whitespace(combined)
        out_path = os.path.join(OUT_DIR, fname)
        trimmed.save(out_path, optimize=True)
        print(f"  OK: {fname} -> {trimmed.size[0]}x{trimmed.size[1]}px")
        success += 1
    except Exception as e:
        print(f"  ERR: {fname}: {e}")

print(f"\nCompleted {success}/{len(CROPS)} crops successfully!")
