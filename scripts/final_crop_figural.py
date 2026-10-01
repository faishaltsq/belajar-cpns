"""
Final crop: full per-soal dari PDF, include instruksi + gambar + opsi.
Kunci jawaban dari pembahasan resmi ebook.
Output: fig_analogi_NN.png, fig_ketidaksamaan_NN.png, fig_serial_NN.png
"""
import fitz
from PIL import Image
import numpy as np
import os, json

PDF_PATH = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\NEW - 12 SEPTEMBER 2024\TIU SKD CPNS.pdf"
OUT_DIR  = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
DPI = 280
SCALE = DPI / 72.0

doc = fitz.open(PDF_PATH)
os.makedirs(OUT_DIR, exist_ok=True)

# ── Kunci jawaban dari pembahasan buku ─────────────────────────────────────
KEYS = {
    'Analogi':        {1:'C',2:'C',3:'E',4:'B',5:'E',6:'A',7:'B',8:'A',9:'C',10:'C',11:'C',12:'C',13:'E',14:'B',15:'A',16:'A',17:'D'},
    'Ketidaksamaan':  {1:'A',2:'D',3:'E',4:'C',5:'C',6:'D',7:'A',8:'D',9:'E',10:'E',11:'D',12:'C',13:'B',14:'C'},
    'Serial':         {1:'E',2:'E',3:'A',4:'D',5:'B',6:'C',7:'B',8:'B',9:'C',10:'D',11:'C',12:'C',13:'B',14:'C',15:'D'},
}
# Serial 7 = "-" di buku → pakai 'B' sebagai placeholder (tidak ada jawaban resmi)

page_cache: dict = {}
def get_page_img(pg_idx: int) -> Image.Image:
    if pg_idx not in page_cache:
        page = doc[pg_idx]
        mat = fitz.Matrix(SCALE, SCALE)
        pix = page.get_pixmap(matrix=mat)
        page_cache[pg_idx] = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return page_cache[pg_idx]

def trim_h(img: Image.Image, pad: int = 8) -> Image.Image:
    """Trim left/right whitespace only (keep full height)."""
    arr = np.array(img)
    col_dark = (arr.mean(axis=2) < 200).sum(axis=0) / arr.shape[0]
    cols = np.where(col_dark > 0.003)[0]
    if not len(cols):
        return img
    c0 = max(0, cols[0] - pad)
    c1 = min(img.width, cols[-1] + pad + 1)
    return img.crop((c0, 0, c1, img.height))

def crop_segment(pg_idx: int, y0_pdf: float, y1_pdf: float) -> Image.Image:
    img = get_page_img(pg_idx)
    x0 = int(30 * SCALE)
    x1 = img.width - int(10 * SCALE)
    y0 = max(0, int(y0_pdf * SCALE))
    y1 = min(img.height, int(y1_pdf * SCALE))
    return img.crop((x0, y0, x1, y1))

def stack(*imgs: Image.Image) -> Image.Image:
    w = max(i.width for i in imgs)
    h = sum(i.height for i in imgs)
    out = Image.new("RGB", (w, h), (255, 255, 255))
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.height
    return out

# ── Crop coords: (page_0idx, y_top, y_bot)  per soal ──────────────────────
# Soal lintas halaman → list of segments

ANALOGI = [
    # (num, [(pg, y0, y1), ...])
    (1,  [(175, 227, 449)]),
    (2,  [(175, 450, 652), (176, 50, 272)]),   # Q2 mulai dari hal 176 bawah + hal 177 atas (before Q3 at y=288)
    (3,  [(176, 288, 652)]),
    (4,  [(177, 56, 355)]),
    (5,  [(177, 357, 652)]),
    (6,  [(178, 90, 360)]),
    (7,  [(178, 362, 652)]),
    (8,  [(179, 105, 403)]),
    (9,  [(179, 405, 652), (180, 50, 272)]),   # Q9 overflow ke hal 181 (before Q10 opt group at y=274)
    (10, [(180, 274, 548)]),                   # Q10 options are on page 181 (before Q11 stem area)
    (11, [(181, 125, 483)]),
    (12, [(181, 485, 652), (182, 50, 261)]),   # Q12 overflow ke hal 183
    (13, [(182, 348, 652), (183, 50, 255)]),   # Q13 overflow ke hal 184
    (14, [(183, 341, 652), (184, 50, 260)]),   # Q14 overflow ke hal 185
    (15, [(184, 346, 652)]),
    (16, [(185, 107, 332)]),
    (17, [(185, 334, 652)]),
]

KETIDAKSAMAAN = [
    (1,  [(190,  77, 267)]),
    (2,  [(190, 268, 423)]),
    (3,  [(190, 424, 652)]),
    (4,  [(191,  90, 271)]),
    (5,  [(191, 273, 442)]),
    (6,  [(191, 444, 652)]),
    (7,  [(192, 124, 306)]),
    (8,  [(192, 307, 492)]),
    (9,  [(192, 493, 652), (193, 50, 128)]),   # Q9 overflow ke hal 194
    (10, [(193, 225, 316)]),
    (11, [(193, 403, 652)]),
    (12, [(194,  74, 246)]),
    (13, [(194, 248, 432)]),
    (14, [(194, 434, 652)]),
]

SERIAL = [
    (1,  [(197, 335, 562)]),
    (2,  [(197, 563, 652), (198, 50, 235)]),   # Q2 overflow ke hal 199
    (3,  [(198, 320, 652)]),
    (4,  [(199,  73, 332)]),
    (5,  [(199, 334, 652)]),
    (6,  [(200,  73, 302)]),
    (7,  [(200, 303, 524)]),
    (8,  [(200, 526, 652), (201, 50, 167)]),   # Q8 overflow ke hal 202
    (9,  [(201, 249, 652)]),
    (10, [(201, 652, 652), (202, 50, 181)]),   # Q10 full page 202 top
    (11, [(202, 266, 498)]),
    (12, [(202, 500, 652), (203, 50, 215)]),   # Q12 overflow ke hal 204
    (13, [(203, 301, 535)]),
    (14, [(203, 537, 652), (204, 50, 203)]),   # Q14 overflow ke hal 205
    (15, [(204, 289, 652)]),
]

SECTIONS = [
    ('Analogi',       'fig_analogi',       ANALOGI,       KEYS['Analogi']),
    ('Ketidaksamaan', 'fig_ketidaksamaan', KETIDAKSAMAAN, KEYS['Ketidaksamaan']),
    ('Serial',        'fig_serial',        SERIAL,        KEYS['Serial']),
]

LETTERS = ['A','B','C','D','E']
answer_records = []
ok = 0

for section, prefix, soal_list, keys in SECTIONS:
    print(f"\n=== {section} ===")
    for num, segments in soal_list:
        fname = f"{prefix}_{num:02d}.png"
        try:
            segs = [crop_segment(pg, y0, y1) for pg, y0, y1 in segments]
            combined = stack(*segs) if len(segs) > 1 else segs[0]
            final = trim_h(combined)
            final.save(os.path.join(OUT_DIR, fname), optimize=True)

            correct = keys.get(num, 'A')
            correct_idx = LETTERS.index(correct.upper()) if correct.upper() in LETTERS else 0
            answer_records.append({
                "section": section,
                "number": num,
                "filename": fname,
                "image": f"/images/questions/{fname}",
                "correct_answer": correct.lower(),
                "correct_index": correct_idx,
            })
            print(f"  OK  {fname}  {final.size[0]}x{final.size[1]}  answer={correct}")
            ok += 1
        except Exception as e:
            print(f"  ERR {fname}: {e}")

# Save answer key JSON
out_json = os.path.join(OUT_DIR, "figural_answer_keys.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(answer_records, f, ensure_ascii=False, indent=2)

print(f"\n{ok}/46 crops done. Answer keys → {out_json}")
