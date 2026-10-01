"""
Tight crop v4: find the actual figure boxes using HIGH-confidence signals only.
A FIGURE ROW has max_contiguous_dark_run >= 50px (box borders or large shapes).
No smoothing. No density tricks. Hard threshold.
Skip all text rows (max_run < 50).
"""
from PIL import Image
import numpy as np
import os

DIR = r'C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions'
PAD = 10  # padding around tight crop
MIN_BLOCK_H = 25  # discard tiny isolated figure-row blips

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


def tight_crop(fpath):
    im = Image.open(fpath).convert('RGB')
    arr = np.array(im)
    H, W = arr.shape[:2]
    dark = arr.min(axis=2) < 220

    max_runs = max_run_per_row(dark)

    # Figure row = max_run >= 50px (clear geometric line or box border)
    is_fig = max_runs >= 50

    # Find contiguous figure blocks (allow internal gaps of <= 45 rows)
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
                if gap >= 45:
                    in_block = False
                    blocks.append((start, y - gap))
    if in_block:
        blocks.append((start, H))

    # Filter tiny blocks
    real_blocks = [b for b in blocks if (b[1] - b[0]) >= MIN_BLOCK_H]

    if not real_blocks:
        # Fallback: lower threshold to 35px if no blocks found
        is_fig2 = max_runs >= 35
        for y, f in enumerate(is_fig2):
            if f:
                if not in_block:
                    in_block = True
                    start = max(0, y - gap)
                gap = 0
            else:
                if in_block:
                    gap += 1
                    if gap >= 45:
                        in_block = False
                        blocks.append((start, y - gap))
        if in_block:
            blocks.append((start, H))
        real_blocks = [b for b in blocks if (b[1] - b[0]) >= MIN_BLOCK_H]

    if not real_blocks:
        print(f"  WARNING: no figure blocks found in {os.path.basename(fpath)}, skipping")
        return im

    y0 = max(0, real_blocks[0][0] - PAD)
    y1 = min(H, real_blocks[-1][1] + PAD)

    # Horizontal crop
    strip = dark[y0:y1]
    col_content = np.where(strip.any(axis=0))[0]
    if len(col_content):
        x0 = max(0, col_content[0] - PAD)
        x1 = min(W, col_content[-1] + PAD + 1)
    else:
        x0, x1 = 0, W

    return im.crop((x0, y0, x1, y1))


# Process all 46 images
files = sorted([f for f in os.listdir(DIR) if f.startswith('fig_') and f.endswith('.png')])
print(f"Processing {len(files)} images...")
changed = 0
for fname in files:
    fpath = os.path.join(DIR, fname)
    orig = Image.open(fpath)
    orig_size = orig.size
    orig.close()

    result = tight_crop(fpath)
    new_size = result.size

    if new_size != orig_size:
        result.save(fpath, optimize=True)
        saved_h = orig_size[1] - new_size[1]
        print(f"  FIXED {fname}: {orig_size[0]}x{orig_size[1]} → {new_size[0]}x{new_size[1]} (trimmed {saved_h}px height)")
        changed += 1
    else:
        print(f"  ok    {fname}: {orig_size[0]}x{orig_size[1]}")

print(f"\nDone. {changed}/{len(files)} images changed.")
