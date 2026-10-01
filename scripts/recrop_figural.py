"""
Re-crop all 46 figural questions from PDF.
Crops ONLY the figure area (stem + option images), EXCLUDING text labels like "A. Gambar A".
Uses PDF text coordinates to find exact cut point above first "A." label.

Output: overwrites existing fig_analogi_XX.png, fig_ketidaksamaan_XX.png, fig_serial_XX.png
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

def smart_crop(img_or_arr, y0_px, y1_px, x_margin_px=(50, 50), pad=10):
    """Crop and smart-trim horizontal whitespace."""
    if isinstance(img_or_arr, np.ndarray):
        full = img_or_arr
    else:
        full = np.array(img_or_arr)
    
    W = full.shape[1]
    strip = full[y0_px:y1_px, :, :]
    
    # Find horizontal content bounds (trim left/right whitespace)
    col_dark = (strip.mean(axis=2) < 200).sum(axis=0) / strip.shape[0]
    
    content_cols = np.where(col_dark > 0.005)[0]
    if len(content_cols) == 0:
        return None
    
    c0 = max(0, content_cols[0] - pad)
    c1 = min(W, content_cols[-1] + pad + 1)
    
    # Also trim top/bottom whitespace within strip
    row_dark = (strip.mean(axis=2) < 200).sum(axis=1) / W
    content_rows = np.where(row_dark > 0.005)[0]
    if len(content_rows) == 0:
        return None
    
    r0 = max(0, content_rows[0] - pad)
    r1 = min(strip.shape[0], content_rows[-1] + pad + 1)
    
    cropped = strip[r0:r1, c0:c1, :]
    return Image.fromarray(cropped)

def get_words(pg_idx):
    return doc[pg_idx].get_text('words')

def find_a_labels(words, min_y=50, max_y=650):
    """Find all 'A.' labels within a y-range."""
    return [w for w in words 
            if w[4] == 'A.' and min_y <= w[1] <= max_y and w[0] < 130]

def find_q_text_bottom(words, q_y, page_w=439):
    """Find bottom of question text block starting at q_y."""
    q_words = [w for w in words if abs(w[1] - q_y) <= 30 and w[0] > 50 and w[0] < page_w]
    if not q_words:
        return q_y + 30
    return max(w[3] for w in q_words) + 2

# ─── HARDCODED SOAL LAYOUT ─────────────────────────────────────────────────
# Each entry: (page_0idx, q_y_approx, number)
# We'll auto-detect the "A." label y for each soal to find cut point.
#
# Sections from figural_answer_keys.json (authoritative order)
with open(os.path.join(OUT_DIR, 'figural_answer_keys.json')) as f:
    answer_keys = json.load(f)

# ─── SECTION PAGES ──────────────────────────────────────────────────────────
# Analogi questions: pages 175-186 (0-idx)
# Ketidaksamaan questions: pages 190-195 (0-idx)
# Serial questions: pages 197-206 (0-idx)
# We'll scan all relevant pages and auto-assign soal by order

def extract_section(pages_range, section_name, expected_count, first_num=1):
    """
    Extract figures from a section. Returns list of PIL images in order.
    Strategy: for each page, find all option groups (by "A." label).
    For each group, crop from (previous soal's "A." y OR page top) to (this soal's "A." y).
    The image above "A." is the stem+option figures area.
    """
    results = []
    
    # Collect all (page_idx, q_y, a_y) across all pages
    all_groups = []
    
    for pg_idx in pages_range:
        if pg_idx >= len(doc):
            break
        words = get_words(pg_idx)
        a_labels = find_a_labels(words)
        
        for a in sorted(a_labels, key=lambda w: w[1]):
            a_y = a[1]
            # Find question number before this A. label
            q_candidates = [w for w in words 
                           if w[4][:-1].isdigit() and w[4].endswith('.')
                           and w[1] < a_y and w[1] > a_y - 400
                           and w[0] < 80
                           and int(w[4][:-1]) <= expected_count]
            
            if q_candidates:
                q_word = max(q_candidates, key=lambda w: w[1])
                q_num = int(q_word[4][:-1])
                q_y = q_word[1]
                q_bottom = find_q_text_bottom(words, q_y)
            else:
                q_num = None
                q_y = None
                q_bottom = None
            
            all_groups.append({
                'page': pg_idx,
                'q_num': q_num,
                'q_y': q_y,
                'q_bottom': q_bottom,
                'a_y': a_y,
                'words': words,
            })
    
    print(f"\n{section_name}: found {len(all_groups)} option groups")
    for g in all_groups:
        qy_str = f"{g['q_y']:.1f}" if g['q_y'] is not None else 'N/A'
        print(f"  Page {g['page']+1}: Q{g['q_num']} q_y={qy_str} a_y={g['a_y']:.1f}")
    
    return all_groups

# ─── ANALOGI (17 soal) ──────────────────────────────────────────────────────
print("=" * 60)
print("ANALOGI GAMBAR")
analogi_groups = extract_section(range(175, 188), "Analogi", 17)

# ─── KETIDAKSAMAAN (14 soal) ────────────────────────────────────────────────
print("\n" + "=" * 60)
print("KETIDAKSAMAAN GAMBAR")
ketidaksamaan_groups = extract_section(range(190, 196), "Ketidaksamaan", 14)

# ─── SERIAL (15 soal) ───────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SERIAL GAMBAR")
serial_groups = extract_section(range(197, 208), "Serial", 15)
