"""
extract_ebooks.py
Ekstrak teks dari 417 PDF ebook CPNS → klasifikasi kategori → simpan ke Neon DB.
Jalankan: python scripts/extract_ebooks.py
"""

import os, sys, glob, re, time
from pathlib import Path

# Load .env.local
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
if not DATABASE_URL:
    sys.exit('ERROR: DATABASE_URL tidak ditemukan di .env.local')

try:
    import pdfplumber
except ImportError:
    sys.exit('ERROR: pip install pdfplumber')

try:
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
except ImportError:
    # Fallback: pakai requests ke neon HTTP API via psycopg2 unavailable
    sys.exit('ERROR: pip install psycopg2-binary')

EBOOK_DIR = r'C:\Users\cubeb\OneDrive\Documents\EBOOK CPNS'

# ── Keyword classifier ──────────────────────────────────────────────
TWK_KEYWORDS = [
    'pancasila', 'uud 1945', 'uud45', 'bela negara', 'nasionalisme',
    'integritas', 'wawasan nusantara', 'bhinneka', 'sumpah pemuda',
    'proklamasi', 'demokrasi pancasila', 'bahasa indonesia', 'ejaan',
    'tata bahasa', 'konjungsi', 'paragraf', 'ide pokok',
]
TIU_KEYWORDS = [
    'analogi', 'silogisme', 'premis', 'kesimpulan', 'deret', 'pola bilangan',
    'aritmetika', 'geometri', 'aljabar', 'perbandingan', 'probabilitas',
    'logika', 'figural', 'bangun', 'rotasi', 'refleksi', 'pola gambar',
    'soal cerita', 'kecepatan', 'jarak', 'waktu', 'persentase',
]
TKP_KEYWORDS = [
    'pelayanan publik', 'profesionalisme', 'jejaring kerja', 'teknologi informasi',
    'anti radikalisme', 'sosio kultural', 'manajemen diri', 'motivasi',
    'integritas', 'kerjasama', 'kepemimpinan', 'akhlak', 'etika',
    'orientasi berprestasi', 'empati', 'komunikasi',
]

SUB_CATEGORY_MAP = {
    'TWK': {
        'Nasionalisme': ['nasionalisme', 'wawasan nusantara', 'bela negara'],
        'Pilar Pancasila': ['pancasila', 'sila'],
        'UUD 1945': ['uud 1945', 'uud45', 'pasal', 'amandemen'],
        'Bela Negara': ['bela negara', 'pertahanan', 'militer'],
        'Integritas': ['integritas', 'kejujuran', 'antikorupsi'],
        'Bahasa Indonesia': ['bahasa indonesia', 'ejaan', 'tata bahasa', 'paragraf', 'konjungsi'],
    },
    'TIU': {
        'Analogi': ['analogi', 'persamaan kata', 'hubungan kata'],
        'Silogisme': ['silogisme', 'premis', 'kesimpulan', 'modus ponens'],
        'Analitis': ['analitis', 'logika', 'penalaran'],
        'Deret Angka': ['deret', 'pola bilangan', 'barisan'],
        'Soal Cerita': ['soal cerita', 'kecepatan', 'jarak', 'waktu', 'persentase', 'aritmetika'],
        'Figural': ['figural', 'bangun', 'rotasi', 'pola gambar'],
    },
    'TKP': {
        'Pelayanan Publik': ['pelayanan publik', 'layanan'],
        'Profesionalisme': ['profesionalisme', 'profesional'],
        'Jejaring Kerja': ['jejaring kerja', 'networking', 'kerjasama'],
        'TIK': ['teknologi informasi', 'tik', 'komputer', 'internet'],
        'Anti-Radikalisme': ['anti radikalisme', 'radikalisme', 'ekstremisme'],
        'Sosio-Kultural': ['sosio kultural', 'budaya', 'keberagaman'],
        'Manajemen Diri': ['manajemen diri', 'motivasi', 'disiplin', 'emosi'],
    },
}

def classify(text: str):
    text_low = text.lower()
    twk = sum(1 for k in TWK_KEYWORDS if k in text_low)
    tiu = sum(1 for k in TIU_KEYWORDS if k in text_low)
    tkp = sum(1 for k in TKP_KEYWORDS if k in text_low)

    # File nama clue
    scores = {'TWK': twk, 'TIU': tiu, 'TKP': tkp}
    cat = max(scores, key=scores.get)
    if scores[cat] == 0:
        return None, None  # Skip jika tidak relevan

    # Sub category
    sub = None
    for sub_name, keywords in SUB_CATEGORY_MAP.get(cat, {}).items():
        if any(k in text_low for k in keywords):
            sub = sub_name
            break

    return cat, sub

def has_soal_pattern(text: str) -> bool:
    """Cek apakah halaman mengandung pola soal pilihan ganda."""
    patterns = [
        r'\b[aAbBcCdDeE]\.\s+\w+',     # "a. kata" atau "A. kata"
        r'\d+\.\s+[A-Z]',               # "1. Apakah..."
        r'pilih(an|lah).*benar',
        r'jawab(an)?\s*:',
        r'\bsoal\b.*\d+',
    ]
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)

def chunk_text(text: str, max_chars: int = 2000) -> list[str]:
    """Potong teks jadi chunk maks ~2000 char, split di batas kalimat/baris."""
    chunks = []
    while len(text) > max_chars:
        cut = text.rfind('\n', 0, max_chars)
        if cut == -1:
            cut = text.rfind('. ', 0, max_chars)
        if cut == -1:
            cut = max_chars
        chunks.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        chunks.append(text)
    return [c for c in chunks if len(c) > 100]  # buang chunk terlalu pendek

# ── Main ──────────────────────────────────────────────────────────────
def main():
    pdf_files = glob.glob(os.path.join(EBOOK_DIR, '**', '*.pdf'), recursive=True)
    print(f'Ditemukan {len(pdf_files)} PDF files')

    cur = conn.cursor()

    # Cek sudah berapa yang diproses
    cur.execute("SELECT COUNT(*) FROM ebook_contexts")
    existing = cur.fetchone()[0]
    print(f'Sudah ada {existing} konteks di DB')

    # Ambil source_file yang sudah diproses
    cur.execute("SELECT DISTINCT source_file FROM ebook_contexts")
    processed = {row[0] for row in cur.fetchall()}

    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    for i, pdf_path in enumerate(pdf_files):
        rel_path = pdf_path.replace(EBOOK_DIR, '').strip('\\/')
        if rel_path in processed:
            total_skipped += 1
            continue

        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text() or ''
                    except Exception:
                        continue

                    if len(text) < 80:
                        continue  # Halaman kosong / gambar saja

                    # Hanya proses halaman yang mengandung soal atau materi relevan
                    cat, sub = classify(text)
                    if cat is None:
                        continue

                    # Chunk teks agar tidak terlalu panjang
                    chunks = chunk_text(text)
                    for chunk in chunks:
                        cur.execute("""
                            INSERT INTO ebook_contexts 
                              (source_file, category, sub_category, content, page_num, char_count)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (rel_path, cat, sub, chunk, page_num + 1, len(chunk)))
                        total_inserted += 1

            conn.commit()
            if (i + 1) % 20 == 0 or total_inserted % 100 == 0:
                print(f'[{i+1}/{len(pdf_files)}] Inserted: {total_inserted} | Skipped: {total_skipped} | Errors: {total_errors}')

        except Exception as e:
            total_errors += 1
            print(f'  ERROR {rel_path}: {e}')
            conn.rollback()
            continue

    conn.commit()
    conn.close()
    print(f'\nSelesai! Total inserted: {total_inserted} | Skipped: {total_skipped} | Errors: {total_errors}')

    # Statistik per kategori
    conn2 = psycopg2.connect(DATABASE_URL)
    cur2 = conn2.cursor()
    cur2.execute("SELECT category, COUNT(*) FROM ebook_contexts GROUP BY category ORDER BY category")
    rows = cur2.fetchall()
    print('\nDistribusi per kategori:')
    for row in rows:
        print(f'  {row[0]}: {row[1]} chunks')
    conn2.close()

if __name__ == '__main__':
    main()
