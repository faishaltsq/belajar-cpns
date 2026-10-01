"""
Split figural questions into stem + individual option images.
For each question:
  - fig_{section}_{num:02d}_stem.png — question figure only
  - fig_{section}_{num:02d}_opt_{a-e}.png — each option image

Layout analysis from PDF:
- Analogi (17 soal, pages 176-187): stem = pasangan gambar, 5 options below
- Ketidaksamaan (14 soal, pages 191-195): NO stem, only 5 option images
- Serial (15 soal, pages 198-207): stem = series pattern, 5 options below

All figural questions follow a pattern:
  - Text instruction (e.g. "1. Carilah pasangan...")
  - Image region (stem + options embedded as raster in page background)
  - Text labels "A. Gambar A", "B. Gambar B", etc.

Strategy: render page at 280 DPI, detect text label positions to split regions.
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
    """Render a page at DPI resolution, return PIL Image."""
    page = doc[pg_idx]
    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def pdf_to_px(y_pdf):
    return int(y_pdf * SCALE)

def pdf_to_px_x(x_pdf):
    return int(x_pdf * SCALE)

def get_page_words(pg_idx):
    """Get all words with coordinates from a page."""
    page = doc[pg_idx]
    return page.get_text('words')

def find_option_groups(words):
    """Find groups of option labels (A.-E.) on a page.
    Returns list of dicts: {a_y, b_y, c_y, d_y, e_y, top_y, bot_y, left_col_x, right_col_x}
    """
    # Find all A. labels
    a_labels = sorted([w for w in words if w[4] == 'A.'], key=lambda w: w[1])
    
    groups = []
    for a in a_labels:
        a_y = a[1]
        a_x = a[0]
        # Find nearby B, C, D, E within 80pt below A
        nearby = [w for w in words if w[1] >= a_y - 5 and w[1] <= a_y + 80 
                  and w[4] in ['B.', 'C.', 'D.', 'E.']]
        
        labels = {'A': a_y}
        for w in nearby:
            labels[w[4][0]] = w[1]
        
        # Determine if 2-column (A,B,C left + D,E right) or 1-column layout
        d_words = [w for w in nearby if w[4] == 'D.']
        is_2col = any(w[0] > 200 for w in d_words) if d_words else False
        
        top_y = a_y
        bot_y = max(w[1] + 15 for w in [a] + nearby)  # ~15pt below last label
        
        groups.append({
            'labels': labels,
            'top_y': top_y,
            'bot_y': bot_y,
            'is_2col': is_2col,
            'a_x': a_x,
        })
    
    return groups

def find_questions(words):
    """Find question number labels and their y-position."""
    qs = []
    for w in words:
        text = w[4]
        if text.endswith('.') and text[:-1].isdigit() and w[0] < 80:
            qs.append({'num': int(text[:-1]), 'y': w[1]})
    return sorted(qs, key=lambda q: q['y'])

def crop_and_save(img, box_pdf, filename, page_w_pdf=439.68, margin_l=40, margin_r=40):
    """Crop image using PDF coordinates. box_pdf = (y_top, y_bot)."""
    y_top, y_bot = box_pdf
    x0 = pdf_to_px_x(margin_l)
    x1 = img.width - pdf_to_px_x(margin_r)
    y0 = pdf_to_px(y_top)
    y1 = pdf_to_px(y_bot)
    
    # Clamp
    y0 = max(0, y0)
    y1 = min(img.height, y1)
    x0 = max(0, x0)
    x1 = min(img.width, x1)
    
    cropped = img.crop((x0, y0, x1, y1))
    
    # Trim whitespace (remove rows/cols that are >98% white)
    arr = np.array(cropped)
    row_means = arr.mean(axis=(1, 2))
    col_means = arr.mean(axis=(0, 2))
    
    row_mask = row_means < 252
    col_mask = col_means < 252
    
    if row_mask.any() and col_mask.any():
        r0 = np.argmax(row_mask)
        r1 = len(row_mask) - np.argmax(row_mask[::-1])
        c0 = np.argmax(col_mask)
        c1 = len(col_mask) - np.argmax(col_mask[::-1])
        # Add small padding
        pad = 8
        r0 = max(0, r0 - pad)
        r1 = min(cropped.height, r1 + pad)
        c0 = max(0, c0 - pad)
        c1 = min(cropped.width, c1 + pad)
        cropped = cropped.crop((c0, r0, c1, r1))
    
    fpath = os.path.join(OUT_DIR, filename)
    cropped.save(fpath, optimize=True)
    return filename, cropped.size

def crop_option_2col(img, opt_group, opt_letter, page_w_pdf=439.68):
    """Crop a single option image from 2-column layout.
    A,B,C are left column. D,E are right column.
    Each option image is ABOVE its text label.
    """
    labels = opt_group['labels']
    
    # Determine row heights
    # Options are stacked: image above label. Row height ~17pt text + variable image.
    # In 2-col layout: left = A,B,C; right = D,E
    # The image for each option is between previous label bottom and current label top.
    
    half_x = page_w_pdf / 2
    
    if opt_letter in ['A', 'B', 'C']:
        x0, x1 = 40, half_x - 5
    else:
        x0, x1 = half_x + 5, page_w_pdf - 40
    
    return x0, x1

def crop_option_1col(img, opt_group, opt_letter, page_w_pdf=439.68):
    """Crop a single option image from 1-column layout (all 5 in one column)."""
    # All options stacked vertically
    x0, x1 = 40, page_w_pdf - 40
    return x0, x1


# =============================================================================
# HARDCODED LAYOUT: Each soal with exact page index and y-coordinates
# Format: (page_idx, q_text_y, stem_top_y, stem_bot_y, opts_top_y, opts_bot_y, layout)
# stem_top/bot = y range of question figure
# opts_top/bot = y range of option images (above the A. labels)
# layout = '2col' or '1col' for option arrangement
# =============================================================================

# First, let's auto-detect layout for all soal from page structure
# We'll analyze each page and build the soal list

all_soal = []

# ======================== ANALOGI (17 soal) ========================
# Analogi pages: 175-186 (0-indexed)
ANALOGI_PAGES = range(175, 187)

def analyze_page_soal(pg_idx, section, expected_nums=None):
    """Analyze a page and return detected soal with their regions."""
    words = get_page_words(pg_idx)
    qs = find_questions(words)
    opt_groups = find_option_groups(words)
    
    page = doc[pg_idx]
    page_h = page.rect.height
    page_w = page.rect.width
    
    soal_list = []
    
    # Match questions to option groups
    # Each question's image region is between its text and its first option label
    # The stem is between question text bottom and option labels top
    
    for i, q in enumerate(qs):
        if expected_nums and q['num'] not in expected_nums:
            continue
            
        q_text_y = q['y']
        
        # Find the option group that follows this question
        # It's the first opt_group with top_y > q_text_y
        matching_opts = [og for og in opt_groups if og['top_y'] > q_text_y + 30]
        
        if not matching_opts:
            # Last question on page, options might be on next page
            print(f"  WARNING: Page {pg_idx+1} Q{q['num']} - no matching option group found")
            continue
        
        opt_group = matching_opts[0]
        
        # Stem region: from ~20pt below question text to option labels top - 5pt
        # But we need to find where the actual text ends
        q_text_words = [w for w in words if abs(w[1] - q_text_y) < 3]
        q_text_bottom = q_text_y + 15  # default: 1 line
        # Check for multi-line question text
        for w in words:
            if w[1] > q_text_y and w[1] < q_text_y + 40 and w[0] > 60:
                if not any(w[4] == opt for opt in ['A.', 'B.', 'C.', 'D.', 'E.']):
                    q_text_bottom = max(q_text_bottom, w[3])
        
        stem_top = q_text_bottom + 2
        stem_bot = opt_group['top_y'] - 3
        
        soal_list.append({
            'section': section,
            'num': q['num'],
            'page': pg_idx,
            'stem_top': stem_top,
            'stem_bot': stem_bot,
            'opt_group': opt_group,
            'page_w': page_w,
        })
    
    return soal_list

# Let's just detect and print first, then we'll hardcode corrections
print("=== AUTO-DETECTION PASS ===")
for pg_idx in ANALOGI_PAGES:
    page = doc[pg_idx]
    words = get_page_words(pg_idx)
    qs = find_questions(words)
    opt_groups = find_option_groups(words)
    
    if qs or opt_groups:
        print(f"\nPage {pg_idx+1}:")
        for q in qs:
            print(f"  Q{q['num']} at y={q['y']:.1f}")
        for i, og in enumerate(opt_groups):
            print(f"  OptGroup {i}: top_y={og['top_y']:.1f} bot_y={og['bot_y']:.1f} 2col={og['is_2col']} labels={list(og['labels'].keys())}")
