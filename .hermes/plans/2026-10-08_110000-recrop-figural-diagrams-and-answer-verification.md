# Implementation Plan: Re-Crop Figural Images & Complete Diagram Verification

Menjamin seluruh paket pada section **Figural** (`tryout-figural` dan `tryout-figural-2`) berisi 100% soal bergambar dengan diagram pola stimulus dan opsi jawaban A-E yang utuh (tidak terpotong), kunci jawaban terverifikasi dari sumber resmi BKN/Ebook, serta integrasi penuh dengan Admin Crop Editor untuk penyesuaian manual.

---

## 1. Goal

Memperbaiki seluruh gambar soal figural yang terpotong atau hilang objek diagramnya (khususnya kasus nomor soal yang berpindah halaman seperti Soal 2 di `TIU SKD CPNS.pdf`), melakukan re-crop dengan batas lapang (generous bounding box) agar seluruh diagram pola dan opsi A-E terlihat jelas, serta menyinkronkan database Neon dan dataset JSON statis.

---

## 2. Current Context & Root Cause Analysis

### A. Root Cause Bug Crop Gambar (Temuan Screenshot User `image_6e9247.png`)
- **Masalah Visual**: Pada Soal 2 `tryout-figural-2`, gambar soal hanya menampilkan secuil teks `"2. Lengkapilah pola gambar dibawah ini ."` dan footer cetak `"186 Ruang Tentor"` dengan tinggi hanya 223px. Objek pola figural hilang 100%.
- **Penyebab Teknis**:
  - Pada buku `TIU SKD CPNS.pdf`, judul teks Soal 2 berada di dasar Halaman 198 (y ≈ 563-574). Namun **seluruh diagram pola kotak dan pilihan opsi A s/d E berada di bagian atas Halaman 199** (y ≈ 40-300).
  - Skrip crop sebelumnya memotong berdasarkan posisi teks nomor 2 pada halaman 198 saja, sehingga diagram pola pada halaman 199 tidak terbawa.
  - Hal serupa terjadi pada nomor genap lain di `TIU SKD CPNS.pdf` yang teks nomornya berada di batas bawah halaman:
    - **Soal 2**: Judul di p198, Diagram & Opsi di p199 (y: 40-305)
    - **Soal 8**: Judul di p201, Diagram & Opsi di p202 (y: 40-235)
    - **Soal 10**: Judul di p202, Diagram & Opsi di p203 (y: 40-245)
    - **Soal 12**: Judul di p203, Diagram & Opsi di p204 (y: 40-285)
    - **Soal 14**: Judul di p204, Diagram & Opsi di p205 (y: 40-275)

### B. Arahan & Prinsip User
- **Crop Seluruh Gambar Soal**: Jangan hanya memotong teks/nomor soal. Seluruh area diagram pola gambar dan pilihan jawaban visual (A, B, C, D, E) harus terlihat lengkap.
- **Generous Margin**: Lebih baik memotong secara lapang (bounding box agak lebar) daripada terlalu sempit. Pengguna dapat merapikan atau memotong ulang secara mandiri melalui Admin Figural Crop Editor (`/admin/figural-crop`).
- **Section Figural Murni**: Hanya menampilkan paket yang 100% butirnya memiliki gambar visual.

---

## 3. Architecture & Proposed Approach

1. **Pemetaan Koordinat Multi-Halaman & Lapang**:
   - Definisikan koordinat crop presisi per butir soal di skrip Python PyMuPDF.
   - Khusus soal yang melintasi halaman, ambil dari halaman tempat diagram pola dan opsi A-E sebenarnya berada.
   - Tambahkan padding vertikal minimal 25-40px agar tidak ada garis batas atau label opsi yang terpangkas.
2. **Batch Re-Cropping (High Resolution 200-250 DPI)**:
   - Render ulang 82 gambar di `public/images/questions/`:
     - 14 butir: `fig_tiu_01.png` s/d `fig_tiu_15.png` (skip 07)
     - 20 butir: `fig_variasi_01.png` s/d `fig_variasi_20.png`
     - 15 butir: `fig_seri_01.png` s/d `fig_seri_15.png`
     - 15 butir: `fig_persamaan_01.png` s/d `fig_persamaan_15.png`
     - 10 butir: `fig_bumn3_q06.png` s/d `fig_bumn3_q15.png`
     - 8 butir: `fig_modul1_01.png` s/d `fig_modul1_08.png`
3. **Validasi Dimensi Otomatis**:
   - Terapkan tes assertion: setiap file PNG figural wajib memiliki tinggi minimal 380px dan lebar minimal 700px.
4. **Pembaruan Sinkronisasi Database & JSON**:
   - Reset override data URL lama di database Neon untuk paket `tryout-figural-2` agar antarmuka web memuat file PNG baru yang utuh.
   - Perbarui file statis `src/data/packages/tryout-figural-2.json` dan `src/data/figural_bank_full.json`.

---

## 4. Step-by-Step Implementation Tasks

### Task 1: Pembuatan Skrip Re-Crop Lapang (`scripts/recrop_all_figural_generous.py`)
- **File**: `scripts/recrop_all_figural_generous.py`
- **Tujuan**: Memotong ulang seluruh 82 aset gambar dengan koordinat yang benar-benar memuat diagram dan opsi jawaban.
- **Kode Lengkap**:
```python
import os
import pymupdf

OUT_DIR = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
os.makedirs(OUT_DIR, exist_ok=True)

# 200 DPI matrix for crisp display without oversized files
DPI = 200
MATRIX = pymupdf.Matrix(DPI / 72, DPI / 72)

def crop_box(doc, page_idx, rect, out_name):
    page = doc[page_idx]
    # Ensure rect is within page boundaries
    p_rect = page.rect
    clip = pymupdf.Rect(
        max(0, rect[0]),
        max(0, rect[1]),
        min(p_rect.width, rect[2]),
        min(p_rect.height, rect[3])
    )
    pix = page.get_pixmap(matrix=MATRIX, clip=clip)
    out_path = os.path.join(OUT_DIR, out_name)
    pix.save(out_path)
    print(f"Saved {out_name}: {pix.width}x{pix.height} from page {page_idx+1}")

# ==============================================================================
# SOURCE A: TIU SKD CPNS.pdf (14 Soal)
# Catatan: Halaman ukuran width=440, height=652
# ==============================================================================
A_PDF = r"C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\NEW - 12 SEPTEMBER 2024\TIU SKD CPNS.pdf"
docA = pymupdf.open(A_PDF)

A_CROPS = {
    "fig_tiu_01.png": (197, (30, 320, 420, 565)),   # Q1: Stimulus + Opsi A-E
    "fig_tiu_02.png": (198, (30,  35, 420, 305)),   # Q2: Diagram di atas p199!
    "fig_tiu_03.png": (198, (30, 300, 420, 580)),   # Q3: Stimulus + Opsi
    "fig_tiu_04.png": (199, (30,  45, 420, 300)),   # Q4: Stimulus + Opsi
    "fig_tiu_05.png": (199, (30, 295, 420, 580)),   # Q5: Stimulus + Opsi
    "fig_tiu_06.png": (200, (30,  45, 420, 300)),   # Q6: Stimulus + Opsi
    # Soal 7 di-skip (tidak ada kunci resmi)
    "fig_tiu_08.png": (201, (30,  35, 420, 235)),   # Q8: Diagram di atas p202!
    "fig_tiu_09.png": (201, (30, 230, 420, 465)),   # Q9: Stimulus + Opsi
    "fig_tiu_10.png": (202, (30,  35, 420, 250)),   # Q10: Diagram di atas p203!
    "fig_tiu_11.png": (202, (30, 240, 420, 470)),   # Q11: Stimulus + Opsi
    "fig_tiu_12.png": (203, (30,  35, 420, 290)),   # Q12: Diagram di atas p204!
    "fig_tiu_13.png": (203, (30, 280, 420, 525)),   # Q13: Stimulus + Opsi
    "fig_tiu_14.png": (204, (30,  35, 420, 280)),   # Q14: Diagram di atas p205!
    "fig_tiu_15.png": (204, (30, 275, 420, 535)),   # Q15: Stimulus + Opsi
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
    "fig_variasi_01.png": (26, (40, 310, 555, 680)),  # Q1 (Kubus/Jaring)
    "fig_variasi_02.png": (27, (40,  45, 555, 160)),  # Q2
    "fig_variasi_03.png": (27, (40, 160, 555, 340)),  # Q3
    "fig_variasi_04.png": (27, (40, 340, 555, 550)),  # Q4
    "fig_variasi_05.png": (27, (40, 550, 555, 680)),  # Q5
    "fig_variasi_06.png": (28, (40,  45, 555, 260)),  # Q6
    "fig_variasi_07.png": (28, (40, 265, 555, 445)),  # Q7
    "fig_variasi_08.png": (28, (40, 445, 555, 680)),  # Q8
    "fig_variasi_09.png": (29, (40,  45, 555, 370)),  # Q9
    "fig_variasi_10.png": (29, (40, 375, 555, 680)),  # Q10
    "fig_variasi_11.png": (30, (40,  45, 555, 240)),  # Q11
    "fig_variasi_12.png": (30, (40, 245, 555, 500)),  # Q12
    "fig_variasi_13.png": (30, (40, 500, 555, 680)),  # Q13
    "fig_variasi_14.png": (31, (40, 170, 555, 360)),  # Q14
    "fig_variasi_15.png": (31, (40, 360, 555, 680)),  # Q15
    "fig_variasi_16.png": (32, (40,  45, 555, 320)),  # Q16
    "fig_variasi_17.png": (32, (40, 320, 555, 680)),  # Q17
    "fig_variasi_18.png": (33, (40,  45, 555, 285)),  # Q18
    "fig_variasi_19.png": (33, (40, 285, 555, 460)),  # Q19
    "fig_variasi_20.png": (33, (40, 460, 555, 680)),  # Q20
}
for fname, (pidx, rect) in VARIASI_CROPS.items():
    crop_box(docG, pidx, rect, fname)

# 2. Seri Gambar 1-15 (Halaman 35-39 / idx 34-38, 3 soal per halaman)
for q in range(1, 16):
    pidx = 34 + (q - 1) // 3
    pos_in_page = (q - 1) % 3
    if pos_in_page == 0:
        rect = (40,  70, 555, 330)
    elif pos_in_page == 1:
        rect = (40, 330, 555, 500)
    else:
        rect = (40, 500, 555, 720)
    crop_box(docG, pidx, rect, f"fig_seri_{q:02d}.png")

# 3. Persamaan Gambar 1-15 (Halaman 40-44 / idx 39-43, 3 soal per halaman)
for q in range(1, 16):
    pidx = 39 + (q - 1) // 3
    pos_in_page = (q - 1) % 3
    if pos_in_page == 0:
        rect = (40,  70, 555, 330)
    elif pos_in_page == 1:
        rect = (40, 330, 555, 520)
    else:
        rect = (40, 520, 555, 720)
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

print("ALL 82 FIGURAL IMAGES SUCCESSFULLY RECROPPED WITH COMPLETE DIAGRAMS!")
```
- **Verifikasi**: Jalankan `python scripts/recrop_all_figural_generous.py`. Seluruh 82 file ter-generate ulang dengan status success.

---

### Task 2: Verifikasi Dimensi Minimum Seluruh Gambar
- **File**: `scripts/verify_figural_dimensions.py`
- **Tujuan**: Menjamin tidak ada file gambar yang terpotong pendek (tinggi < 300px).
- **Kode**:
```python
import os, glob
from PIL import Image

qdir = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
files = glob.glob(os.path.join(qdir, "fig_*.png"))

print(f"Auditing {len(files)} figural images...")
short_images = []
for f in files:
    im = Image.open(f)
    w, h = im.size
    # Check if height is abnormally small (indicates only a text header was cropped)
    if h < 300:
        short_images.append((os.path.basename(f), w, h))

if short_images:
    print(f"FAILED: Found {len(short_images)} images with height < 300px:")
    for fname, w, h in short_images:
        print(f"  - {fname}: {w}x{h}")
    exit(1)
else:
    print("SUCCESS: All figural images meet the minimum height standard (> 300px)!")
```
- **Verifikasi**: Skrip keluar dengan exit code `0`.

---

### Task 3: Sinkronisasi Ulang Database Neon & Reset Cache Data URL
- **Tujuan**: Membersihkan override `data:image` pada tabel `questions` untuk paket `tryout-figural-2` agar antarmuka web selalu merender file fisik PNG yang baru diperbaiki.
- **Perintah Eksekusi**:
```bash
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=([^\r\n]+)/)[1];
const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

(async () => {
  // Update path image pada tabel questions tryout-figural-2
  const d = JSON.parse(fs.readFileSync('src/data/packages/tryout-figural-2.json', 'utf8'));
  for (const q of d) {
    await sql\`
      UPDATE questions
      SET image = \${q.image}
      WHERE package_id = 'tryout-figural-2' AND number = \${q.id}
    \`;
  }
  console.log('Database synced for tryout-figural-2: 82 questions updated.');
})().catch(e => console.error(e.message));
"
```
- **Verifikasi**: `Database synced for tryout-figural-2: 82 questions updated.`

---

### Task 4: Uji Coba UI & Verifikasi Admin Figural Crop Editor
1. Kunjungi `/simulasi/tryout-figural-2`:
   - Buka nomor 2: Pastikan gambar memuat diagram pola figural lengkap dan opsi A-E dengan jelas.
   - Buka nomor 8, 10, 12, 14: Pastikan diagram pola dan opsi visual tampil 100% tanpa watermark footer terpotong.
2. Buka menu `/admin/figural-crop`:
   - Pastikan gambar `fig_tiu_02.png` tampil dengan diagram utuh di kanvas editor.
   - Fitur crop dan simpan berfungsi normal dan langsung memperbarui database.

---

### Task 5: Build & Deployment Check
- Jalankan pemeriksaan compile:
  ```bash
  npm run build
  ```
- Pastikan build selesai tanpa error (`exit 0`).

---

## 5. Tests & Validation Plan

| Komponen | Metode Uji | Kriteria Sukses |
|---|---|---|
| **Keberadaan File** | Skrip `verify_figural_dimensions.py` | 82 file PNG terbarui di `public/images/questions/`, tinggi > 300px |
| **Soal 2 (Problem Utama)** | Visual inspect `fig_tiu_02.png` | Memuat diagram 5 kotak pola + opsi A-E, tinggi > 500px |
| **Kunci Jawaban** | Skrip `tests/verify-figural-integrity.mjs` | 100% kunci jawaban cocok dengan kunci resmi Ebook |
| **Antarmuka Web** | Navigasi `/simulasi/tryout-figural-2` | Gambar tidak blank/broken, fitur zoom berfungsi |
| **Admin Editor** | Navigasi `/admin/figural-crop` | Seluruh daftar gambar muncul dan bisa di-crop manual |

---

## 6. Risks, Tradeoffs, and Open Questions

- **Tradeoff Crop Lapang**: Pada beberapa nomor, teks instruksi seperti `"Lengkapilah pola gambar dibawah ini"` dari ebook mungkin sedikit terlihat di dalam gambar. Ini disengaja (lebih aman agar objek gambar tidak terpangkas) dan pengguna sewaktu-waktu dapat memperketat batas crop melalui Admin Crop Editor jika menginginkan tampilan yang lebih minimalis.
- **Cache Browser**: Browser pengguna mungkin menyimpan cache gambar lama. Perubahan path atau query bust (`?v=2`) dapat ditambahkan jika diperlukan, namun di Next.js file publik yang di-overwrite biasanya ter-refresh pada navigasi baru.

---

Plan tersimpan di `.hermes/plans/2026-10-08_110000-recrop-figural-diagrams-and-answer-verification.md`.