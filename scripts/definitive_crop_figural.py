"""
Definitive tight crop: single-pass from clean baseline.
Leaves ONLY the figure shapes/boxes, removing:
- Text instructions at top (e.g. '1. Carilah pasangan gambar...')
- Text option labels at bottom (e.g. 'A. Gambar A...')
- PDF page headers ('Ruang Tentor', '172', rule lines)
- Huge whitespace gaps
Threshold: max_contiguous_dark_run >= 30px (safely above text stroke width <= 22px).
"""
from PIL import Image
import numpy as np
import os

DIR = r'C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions'
PAD = 10
THRESHOLD = 30  # min contiguous dark run for figure row
MIN_BLOCK_H = 20  # min height of a real figure block
MAX_INTERNAL_GAP = 55  # allow gaps between multiple figure rows (e.g. problem row + option row)

def max_run_per_row(dark_mask):
    H, W = dark_mask.shape
    result = np.zeros(H, dtype=int)
    for y in range(H):
        row = dark_mask[y]
        if not row.any():
            continue
        d = np.diff(np.concatenate(([0], row.astype(int), [0])))
        starts = np.where(d == 1)[0]
        ends = np.where(d == -1)[0]
        result[y] = (ends - starts).max() if len(starts) else 0
    return result


def crop_image(fpath):
    im = Image.open(fpath).convert('RGB')
    arr = np.array(im)
    H, W = arr.shape[:2]
    dark = arr.min(axis=2) < 220

    max_runs = max_run_per_row(dark)
    is_fig = max_runs >= THRESHOLD

    # Group into contiguous blocks allowing MAX_INTERNAL_GAP between rows
    blocks = []
    in_block = False
    start = 0
    gap = 0
    for y, f in enumerate(is_fig):
        if f:
            if not in_block:
                in_block = True
                start = max(0, y - gap)
            gap = 0
        else:
            if in_block:
                gap += 1
                if gap >= MAX_INTERNAL_GAP:
                    in_block = False
                    blocks.append((start, y - gap))
    if in_block:
        blocks.append((start, H))

    real_blocks = [b for b in blocks if (b[1] - b[0]) >= MIN_BLOCK_H]

    if not real_blocks:
        # Fallback: if no blocks found, lower threshold to 25
        is_fig2 = max_runs >= 25
        blocks2 = []
        in_b = False
        st = 0
        g = 0
        for y, f in enumerate(is_fig2):
            if f:
                if not in_b:
                    in_b = True
                    st = max(0, y - g)
                g = 0
            else:
                if in_b:
                    g += 1
                    if g >= MAX_INTERNAL_GAP:
                        in_b = False
                        blocks2.append((st, y - g))
        if in_b:
            blocks2.append((st, H))
        real_blocks = [b for b in blocks2 if (b[1] - b[0]) >= MIN_BLOCK_H]

    if not real_blocks:
        print(f"  SKIP: {os.path.basename(fpath)} (no blocks)")
        return im

    # Span from first block start to last block end
    y0 = max(0, real_blocks[0][0] - PAD)
    y1 = min(H, real_blocks[-1][1] + PAD)

    # Horizontal trim across the vertical range
    strip = dark[y0:y1]
    col_content = np.where(strip.any(axis=0))[0]
    if len(col_content):
        x0 = max(0, col_content[0] - PAD)
        x1 = min(W, col_content[-1] + PAD + 1)
    else:
        x0, x1 = 0, W

    return im.crop((x0, y0, x1, y1))


files = sorted([f for f in os.listdir(DIR) if f.startswith('fig_') and f.endswith('.png')])
print(f"Definitive crop of {len(files)} images...")
stats = []
for fname in files:
    fpath = os.path.join(DIR, fname)
    orig = Image.open(fpath)
    orig_sz = orig.size
    orig.close()

    cropped = crop_image(fpath)
    new_sz = cropped.size

    cropped.save(fpath, optimize=True)
    diff_h = orig_sz[1] - new_sz[1]
    stats.append((fname, orig_sz, new_sz, diff_h))
    print(f"  {fname}: {orig_sz[0]}x{orig_sz[1]} → {new_sz[0]}x{new_sz[1]} (-{diff_h}px h)")

print("\nSummary of crops:")
for s in stats:
    if s[3] > 50:
        print(f"  BIG TRIM: {s[0]} (-{s[3]}px)")
print(f"Done. {len(stats)} processed.")
