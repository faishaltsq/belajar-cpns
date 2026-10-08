import os
import pymupdf

OUT_DIR = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
os.makedirs(OUT_DIR, exist_ok=True)

# 200 DPI matrix for crisp display without oversized files
DPI = 200
MATRIX = pymupdf.Matrix(DPI / 72, DPI / 72)

def crop_box(doc, page_idx, rect, out_name):
    page = doc[page_idx]
    p_rect = page.rect
    clip = pymupdf.Rect(
        max(0, rect[0]),
        max(0, rect[1]),
        min(p_rect.width, rect[2]),
        min(p_rect.height, rect[3])
    )
    pix = page.get_pixmap(matrix=MATRIX, clip=clip)
    out_path = os.path.join(OUT_DIR, out_name)
    with open(out_path, "wb") as f:
        f.write(pix.tobytes("png"))
    print(f"Saved {out_name}: {pix.width}x{pix.height} from page {page_idx+1}")

# ==============================================================================
# SOURCE A: TIU SKD CPNS.pdf (14 Soal)
# Halaman width=440, height=652
# Perbaikan: Soal genap (2, 8, 10, 12, 14) diagramnya ada di halaman berikutnya!
# ==============================================================================
A_PDF = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\NEW - 12 SEPTEMBER 2024\TIU SKD CPNS.pdf"
docA = pymupdf.open(A_PDF)

A_CROPS = {
    "fig_tiu_01.png": (197, (30, 325, 420, 565)),   # Q1: Pola + Opsi A-E
    "fig_tiu_02.png": (198, (30,  35, 420, 315)),   # Q2: Pola + Opsi A-E di atas p199
    "fig_tiu_03.png": (198, (30, 315, 420, 580)),   # Q3: Pola + Opsi A-E di bawah p199
    "fig_tiu_04.png": (199, (30,  45, 420, 305)),   # Q4: Pola + Opsi A-E di atas p200
    "fig_tiu_05.png": (199, (30, 300, 420, 580)),   # Q5: Pola + Opsi A-E di bawah p200
    "fig_tiu_06.png": (200, (30,  45, 420, 300)),   # Q6: Pola + Opsi A-E di atas p201
    # Q7 diskip
    "fig_tiu_08.png": (201, (30,  35, 420, 235)),   # Q8: Pola + Opsi A-E di atas p202
    "fig_tiu_09.png": (201, (30, 235, 420, 470)),   # Q9: Pola + Opsi A-E di bawah p202
    "fig_tiu_10.png": (202, (30,  35, 420, 255)),   # Q10: Pola + Opsi A-E di atas p203
    "fig_tiu_11.png": (202, (30, 240, 420, 475)),   # Q11: Pola + Opsi A-E di bawah p203
    "fig_tiu_12.png": (203, (30,  35, 420, 295)),   # Q12: Pola + Opsi A-E di atas p204
    "fig_tiu_13.png": (203, (30, 280, 420, 530)),   # Q13: Pola + Opsi A-E di bawah p204
    "fig_tiu_14.png": (204, (30,  35, 420, 285)),   # Q14: Pola + Opsi A-E di atas p205
    "fig_tiu_15.png": (204, (30, 280, 420, 535)),   # Q15: Pola + Opsi A-E di bawah p205
}

for fname, (pidx, rect) in A_CROPS.items():
    crop_box(docA, pidx, rect, fname)

# ==============================================================================
# SOURCE G: Soal-CPNS-Paket-1.pdf (50 Soal)
# Halaman width=595, height=842
# ==============================================================================
G_PDF = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\CPNS\Materi CPNS\Soal-CPNS-Paket-1.pdf"
docG = pymupdf.open(G_PDF)

# 1. Variasi Gambar 1-20 (Halaman 27-34 / idx 26-33)
VARIASI_CROPS = {
    "fig_variasi_01.png": (26, (35, 310, 560, 680)),
    "fig_variasi_02.png": (27, (35,  45, 560, 165)),
    "fig_variasi_03.png": (27, (35, 160, 560, 345)),
    "fig_variasi_04.png": (27, (35, 340, 560, 555)),
    "fig_variasi_05.png": (27, (35, 550, 560, 685)),
    "fig_variasi_06.png": (28, (35,  45, 560, 270)),
    "fig_variasi_07.png": (28, (35, 265, 560, 450)),
    "fig_variasi_08.png": (28, (35, 445, 560, 685)),
    "fig_variasi_09.png": (29, (35,  45, 560, 375)),
    "fig_variasi_10.png": (29, (35, 375, 560, 685)),
    "fig_variasi_11.png": (30, (35,  45, 560, 245)),
    "fig_variasi_12.png": (30, (35, 245, 560, 505)),
    "fig_variasi_13.png": (30, (35, 500, 560, 685)),
    "fig_variasi_14.png": (31, (35, 170, 560, 365)),
    "fig_variasi_15.png": (31, (35, 360, 560, 685)),
    "fig_variasi_16.png": (32, (35,  45, 560, 325)),
    "fig_variasi_17.png": (32, (35, 320, 560, 685)),
    "fig_variasi_18.png": (33, (35,  45, 560, 290)),
    "fig_variasi_19.png": (33, (35, 285, 560, 465)),
    "fig_variasi_20.png": (33, (35, 460, 560, 685)),
}
for fname, (pidx, rect) in VARIASI_CROPS.items():
    crop_box(docG, pidx, rect, fname)

# 2. Seri Gambar 1-15 (Halaman 35-39 / idx 34-38, 3 soal per halaman)
for q in range(1, 16):
    pidx = 34 + (q - 1) // 3
    pos_in_page = (q - 1) % 3
    if pos_in_page == 0:
        rect = (35,  70, 560, 335)
    elif pos_in_page == 1:
        rect = (35, 330, 560, 505)
    else:
        rect = (35, 500, 560, 725)
    crop_box(docG, pidx, rect, f"fig_seri_{q:02d}.png")

# 3. Persamaan Gambar 1-15 (Halaman 40-44 / idx 39-43, 3 soal per halaman)
for q in range(1, 16):
    pidx = 39 + (q - 1) // 3
    pos_in_page = (q - 1) % 3
    if pos_in_page == 0:
        rect = (35,  70, 560, 335)
    elif pos_in_page == 1:
        rect = (35, 330, 560, 525)
    else:
        rect = (35, 520, 560, 725)
    crop_box(docG, pidx, rect, f"fig_persamaan_{q:02d}.png")

# ==============================================================================
# SOURCE C: 5_6327771640704796042.pdf (10 Soal)
# Halaman width=419, height=595
# ==============================================================================
C_PDF = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\BONUS GRATIS\BUMN\KUMPULAN SOAL BUMN & CPNS 3\5_6327771640704796042.pdf"
docC = pymupdf.open(C_PDF)

C_CROPS = {
    "fig_bumn3_q06.png": (55, (25,  40, 395, 350)),  # Jaring-jaring
    "fig_bumn3_q07.png": (56, (25,  40, 395, 350)),  # Bangun ruang
    "fig_bumn3_q08.png": (56, (25, 280, 395, 560)),  # Jaring-jaring
    "fig_bumn3_q09.png": (57, (25,  40, 395, 450)),  # Bangun ruang
    "fig_bumn3_q10.png": (58, (25,  40, 395, 450)),  # Bangun ruang
    "fig_bumn3_q11.png": (58, (25, 300, 395, 560)),  # Ketidaksamaan
    "fig_bumn3_q12.png": (59, (25,  40, 395, 350)),  # Ketidaksamaan
    "fig_bumn3_q13.png": (59, (25, 280, 395, 560)),  # Ketidaksamaan
    "fig_bumn3_q14.png": (60, (25,  40, 395, 350)),  # Ketidaksamaan
    "fig_bumn3_q15.png": (60, (25, 280, 395, 560)),  # Ketidaksamaan
}
for fname, (pidx, rect) in C_CROPS.items():
    crop_box(docC, pidx, rect, fname)

# ==============================================================================
# SOURCE B: SOAL FIGURAL 1.pdf (8 Soal)
# ==============================================================================
B_PDF = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\BONUS GRATIS\BUMN\KUMPULAN SOAL BUMN & CPNS 1\SOAL FIGURAL 1.pdf"
docB = pymupdf.open(B_PDF)

B_CROPS = {
    "fig_modul1_01.png": (1, (30,  50, 565, 350)),
    "fig_modul1_02.png": (1, (30, 360, 565, 680)),
    "fig_modul1_03.png": (2, (30,  50, 565, 450)),
    "fig_modul1_04.png": (3, (30,  50, 565, 420)),
    "fig_modul1_05.png": (4, (30,  50, 565, 420)),
    "fig_modul1_06.png": (5, (30,  50, 565, 350)),
    "fig_modul1_07.png": (5, (30, 360, 565, 680)),
    "fig_modul1_08.png": (6, (30,  50, 565, 450)),
}
for fname, (pidx, rect) in B_CROPS.items():
    crop_box(docB, pidx, rect, fname)

print("SUCCESS: ALL 82 FIGURAL IMAGES RECROPPED WITH COMPLETE DIAGRAMS!")
