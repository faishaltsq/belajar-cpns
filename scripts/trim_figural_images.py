"""
Trim whitespace from all figural question images.
Removes leading/trailing empty rows/columns.
Handles single-row noise artifacts at edges.
Overwrites images in-place.
"""
from PIL import Image
import numpy as np
import os

DIR = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"

def smart_trim(img, threshold_pct=0.01, min_run=8, pad=10):
    """Trim whitespace but require min_run consecutive empty rows/cols to trim."""
    arr = np.array(img)
    H, W = arr.shape[:2]
    
    # Row and column darkness percentages
    row_dark = (arr.mean(axis=2) < 200).sum(axis=1) / W
    col_dark = (arr.mean(axis=2) < 200).sum(axis=0) / H
    
    def find_content_bounds(pcts, min_run):
        """Find first and last indices of sustained content."""
        n = len(pcts)
        
        # From top: find first row with content, but skip isolated noise
        top = 0
        for i in range(n):
            if pcts[i] > threshold_pct:
                # Check if this is sustained (at least 3 of next 10 rows also have content)
                window = pcts[i:i+10]
                if (window > threshold_pct).sum() >= 3:
                    top = i
                    break
        
        # From bottom: same
        bot = n - 1
        for i in range(n - 1, -1, -1):
            if pcts[i] > threshold_pct:
                window = pcts[max(0, i-9):i+1]
                if (window > threshold_pct).sum() >= 3:
                    bot = i
                    break
        
        return max(0, top - pad), min(n, bot + pad + 1)
    
    r0, r1 = find_content_bounds(row_dark, min_run)
    c0, c1 = find_content_bounds(col_dark, min_run)
    
    return img.crop((c0, r0, c1, r1))

files = sorted([f for f in os.listdir(DIR) 
                if f.startswith('fig_') and f.endswith('.png')
                and not '_stem' in f and not '_opt_' in f
                and not '_debug' in f and not '_verify' in f and not '_clean' in f])

print(f"Processing {len(files)} files...")
total_saved = 0
for fname in files:
    fpath = os.path.join(DIR, fname)
    img = Image.open(fpath)
    original_size = img.size
    original_bytes = os.path.getsize(fpath)
    
    trimmed = smart_trim(img)
    new_size = trimmed.size
    
    if new_size != original_size:
        trimmed.save(fpath, optimize=True)
        new_bytes = os.path.getsize(fpath)
        saved = original_bytes - new_bytes
        total_saved += saved
        print(f"  {fname}: {original_size[0]}x{original_size[1]} -> {new_size[0]}x{new_size[1]} (saved {saved//1024}KB)")
    else:
        print(f"  {fname}: {original_size[0]}x{original_size[1]} (no change)")

print(f"\nTotal saved: {total_saved//1024}KB")
