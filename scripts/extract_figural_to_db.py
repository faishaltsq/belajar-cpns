"""
extract_figural_to_db.py
Ekstrak soal figural dari TIU SKD CPNS.pdf dan E-BOOK CPNS 2024.pdf
Render setiap soal sebagai gambar, crop, encode base64, simpan ke question_bank Neon DB.

Kunci jawaban dari halaman pembahasan ebook (verified):
  Analogi Gambar (1-19): C C E B E A B A C C C C E B A A D A C
  Ketidaksamaan Gambar (1-14): A D E C C D A D E E D C B C
  Serial Gambar (1-15): E E A D B C E B C D C C B C D
"""

import os, sys, base64, json, re
import pymupdf
from pathlib import Path

# DB connection via psycopg2

# Read env
env_path = Path(r'C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/.env.local')
env_text = env_path.read_text(encoding='utf-8')
match = re.search(r'POSTGRES_URL=([^\r\n]+)', env_text)
if not match:
    raise SystemExit("POSTGRES_URL not found in .env.local")
DATABASE_URL = match.group(1).strip()

# DB connection logic
# ponytail: use requests+neon http api
import urllib.request, urllib.parse

def neon_query(sql, params=None):
    """Simple Neon HTTP query via psycopg2"""
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(sql, params)
    try:
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        result = [dict(zip(cols, r)) for r in rows]
    except Exception:
        result = []
    conn.commit()
    cur.close()
    conn.close()
    return result

# ── KUNCI JAWABAN DARI EBOOK ──────────────────────────────────────────────────

ANSWER_KEYS = {
    'analogi': {  # 1-19
        1: 'C', 2: 'C', 3: 'E', 4: 'B', 5: 'E',
        6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C',
        11: 'C', 12: 'C', 13: 'E', 14: 'B', 15: 'A',
        16: 'A', 17: 'D', 18: 'A', 19: 'C',
    },
    'ketidaksamaan': {  # 1-14
        1: 'A', 2: 'D', 3: 'E', 4: 'C', 5: 'C',
        6: 'D', 7: 'A', 8: 'D', 9: 'E', 10: 'E',
        11: 'D', 12: 'C', 13: 'B', 14: 'C',
    },
    'serial': {  # 1-15
        1: 'E', 2: 'E', 3: 'A', 4: 'D', 5: 'B',
        6: 'C', 7: None, 8: 'B', 9: 'C', 10: 'D',
        11: 'C', 12: 'C', 13: 'B', 14: 'C', 15: 'D',
    },
}

# ── PAGE RANGES (PDF pages, 1-indexed) ───────────────────────────────────────
# Tiap halaman berisi 2 soal, kecuali halaman tertentu
SECTION_PAGES = {
    'analogi': {
        # pdf_page_num: [soal_numbers_on_this_page]
        176: [1, 2],
        177: [3],
        178: [4, 5],
        179: [6, 7],
        180: [8, 9],
        181: [10],
        182: [11, 12],
        183: [13],
        184: [14],
        185: [15],
        186: [16, 17],
        187: [18, 19],
    },
    'ketidaksamaan': {
        191: [1, 2],
        192: [3, 4],
        193: [5, 6],
        194: [7, 8, 9],
        195: [10, 11, 12, 13, 14],
    },
    'serial': {
        199: [1, 2],
        200: [3, 4],
        201: [5, 6],
        202: [7, 8, 9],
        203: [10, 11, 12],
        204: [13, 14, 15],
    },
}

# ── RENDER AND ENCODE ─────────────────────────────────────────────────────────

PDF_PATH = r'C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS\NEW - 12 SEPTEMBER 2024\TIU SKD CPNS.pdf'
OUT_DIR = Path(r'C:\Users\cubeb\AppData\Local\hermes\cache\scratch\tiu_soal_crop')
OUT_DIR.mkdir(parents=True, exist_ok=True)

doc = pymupdf.open(PDF_PATH)

def page_to_base64_png(page_idx: int, clip_rect=None) -> str:
    """Render a PDF page (0-indexed) to base64 PNG."""
    page = doc[page_idx]
    mat = pymupdf.Matrix(2.5, 2.5)  # 250 DPI for good quality
    if clip_rect:
        clip = pymupdf.Rect(clip_rect)
        pix = page.get_pixmap(matrix=mat, clip=clip)
    else:
        pix = page.get_pixmap(matrix=mat)
    png_bytes = pix.tobytes("png")
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode()

def render_full_page(page_idx: int, filename: str) -> str:
    """Render full page and save, return base64."""
    page = doc[page_idx]
    mat = pymupdf.Matrix(2.5, 2.5)
    pix = page.get_pixmap(matrix=mat)
    out_path = OUT_DIR / filename
    pix.save(str(out_path))
    png_bytes = pix.tobytes("png")
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode()

# ── BUILD QUESTION RECORDS ────────────────────────────────────────────────────

def build_options(correct_letter: str) -> list:
    """Build standard 5-option structure for figural question."""
    letters = ['A', 'B', 'C', 'D', 'E']
    if correct_letter is None:
        # Skip questions with unknown answer
        return None
    return [
        {
            'id': l,
            'text': f'Gambar {l}',
            'score': 5 if l == correct_letter else 0,
        }
        for l in letters
    ]

questions = []

# Process each section
section_meta = {
    'analogi': {
        'subcat': 'Analogi Gambar',
        'text_template': 'Carilah pasangan gambar berikut sehingga memiliki hubungan yang sama dengan pasangan gambar sebelumnya.',
        'explanation_template': 'Lihat pola hubungan antara gambar pertama dan kedua, kemudian terapkan pola yang sama.',
    },
    'ketidaksamaan': {
        'subcat': 'Ketidaksamaan Gambar',
        'text_template': 'Tentukanlah satu gambar yang berbeda dari yang lainnya.',
        'explanation_template': 'Cari gambar yang memiliki pola berbeda dari gambar-gambar lainnya.',
    },
    'serial': {
        'subcat': 'Serial Gambar',
        'text_template': 'Lengkapilah pola gambar berikut ini.',
        'explanation_template': 'Perhatikan pola urutan gambar dan temukan gambar yang melanjutkan pola tersebut.',
    },
}

for section, page_map in SECTION_PAGES.items():
    meta = section_meta[section]
    answers = ANSWER_KEYS[section]
    
    for pdf_page_num, soal_nums in page_map.items():
        page_idx = pdf_page_num - 1  # convert to 0-indexed
        
        # Render full page as base64 (each page = the visual context for its questions)
        data_url = render_full_page(page_idx, f'{section}_p{pdf_page_num}.png')
        
        for soal_no in soal_nums:
            correct_letter = answers.get(soal_no)
            if correct_letter is None:
                print(f"  SKIP {section} soal {soal_no}: no answer key")
                continue
            
            opts = build_options(correct_letter)
            
            q = {
                'section': section,
                'soal_no': soal_no,
                'text': f'Soal Figural – {meta["subcat"]} No. {soal_no}: {meta["text_template"]}',
                'category': 'TIU',
                'sub_category': meta['subcat'],
                'options': opts,
                'correct_answer': correct_letter,
                'explanation': meta['explanation_template'],
                'difficulty': 'medium',
                'source': 'TIU SKD CPNS Ebook - Ruang Tentor 2024',
                'image': data_url,
                'pdf_page': pdf_page_num,
            }
            questions.append(q)

doc.close()

# ── SAVE TO DB ────────────────────────────────────────────────────────────────

print(f"\nTotal questions to insert: {len(questions)}")

import psycopg2
import psycopg2.extras

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

inserted = 0
skipped = 0

for q in questions:
    opts_json = json.dumps(q['options'])
    
    # Check duplicate by text
    cur.execute(
        "SELECT COUNT(*) FROM question_bank WHERE text = %s",
        (q['text'],)
    )
    count = cur.fetchone()[0]
    if count > 0:
        skipped += 1
        print(f"  SKIP (dup): {q['section']} soal {q['soal_no']}")
        continue
    
    cur.execute("""
        INSERT INTO question_bank 
            (category, sub_category, text, options, correct_answer, explanation, difficulty, source, image, used_count)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
    """, (
        q['category'],
        q['sub_category'],
        q['text'],
        opts_json,
        q['correct_answer'],
        q['explanation'],
        q['difficulty'],
        q['source'],
        q['image'],
    ))
    inserted += 1
    print(f"  Inserted: {q['section']} soal {q['soal_no']} (jawaban {q['correct_answer']}) - image {len(q['image'])//1024}KB")

conn.commit()
cur.close()
conn.close()

print(f"\n=== DONE ===")
print(f"Inserted: {inserted}")
print(f"Skipped (duplicates): {skipped}")
print(f"Total: {inserted + skipped}")
