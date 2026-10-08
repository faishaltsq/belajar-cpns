import os, glob
from PIL import Image

qdir = r"C:\Users\cubeb\OneDrive\Documents\coding\projects\belajar-cpns-saas\public\images\questions"
files = glob.glob(os.path.join(qdir, "fig_*.png"))

print(f"Auditing {len(files)} figural images...")
short_images = []
for f in sorted(files):
    im = Image.open(f)
    w, h = im.size
    if h < 300:
        short_images.append((os.path.basename(f), w, h))

if short_images:
    print(f"FAILED: Found {len(short_images)} images with height < 300px:")
    for fname, w, h in short_images:
        print(f"  - {fname}: {w}x{h}")
    exit(1)
else:
    print(f"SUCCESS: All {len(files)} figural images meet the minimum height standard (> 300px)!")
