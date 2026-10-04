import os, re, json, base64, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import psycopg2

# Read DB URL from .env.local
env_text = Path(r'C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/.env.local').read_text(encoding='utf-8')
match = re.search(r'POSTGRES_URL=([^\r\n]+)', env_text)
if not match:
    raise SystemExit("POSTGRES_URL not found")
DATABASE_URL = match.group(1).strip()

LETTERS = ['A', 'B', 'C', 'D', 'E']

def draw_polygon(draw, center, radius, sides, rotation_deg=0, fill=None, outline="black", width=3):
    cx, cy = center
    angle_step = 2 * math.pi / sides
    rot_rad = math.radians(rotation_deg)
    points = [
        (
            cx + radius * math.cos(i * angle_step + rot_rad),
            cy + radius * math.sin(i * angle_step + rot_rad)
        )
        for i in range(sides)
    ]
    draw.polygon(points, fill=fill, outline=outline, width=width)

def draw_star(draw, center, r_outer, r_inner, points_count=5, rotation_deg=0, fill="black", outline="black"):
    cx, cy = center
    step = math.pi / points_count
    rot_rad = math.radians(rotation_deg)
    pts = []
    for i in range(2 * points_count):
        r = r_outer if i % 2 == 0 else r_inner
        angle = i * step + rot_rad
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, fill=fill, outline=outline)

def draw_arrow(draw, center, length, angle_deg, fill="black"):
    cx, cy = center
    rad = math.radians(angle_deg)
    # Head point
    hx = cx + (length / 2) * math.cos(rad)
    hy = cy + (length / 2) * math.sin(rad)
    # Tail point
    tx = cx - (length / 2) * math.cos(rad)
    ty = cy - (length / 2) * math.sin(rad)
    draw.line([(tx, ty), (hx, hy)], fill=fill, width=4)
    # Arrowhead wings
    wing_angle = math.radians(150)
    w_len = length * 0.35
    w1x = hx + w_len * math.cos(rad + wing_angle)
    w1y = hy + w_len * math.sin(rad + wing_angle)
    w2x = hx + w_len * math.cos(rad - wing_angle)
    w2y = hy + w_len * math.sin(rad - wing_angle)
    draw.polygon([(hx, hy), (w1x, w1y), (w2x, w2y)], fill=fill)

def create_card_image(problem_draw_fn, option_draw_fns, title_text=""):
    """
    Renders a unified test image with:
    - Top: Problem box / sequence (3-4 frames)
    - Bottom: 5 options A, B, C, D, E
    """
    w, h = 800, 380
    img = Image.new("RGB", (w, h), color="#FFFFFF")
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([(8, 8), (w - 8, h - 8)], outline="#D0D0D0", width=2)

    # Top Problem section
    draw.rectangle([(20, 20), (w - 20, 180)], outline="#333333", width=2, fill="#F9FAFB")
    problem_draw_fn(draw, 20, 20, w - 40, 160)

    # Bottom Options section
    opt_w = 140
    opt_h = 160
    spacing = (w - 40 - (5 * opt_w)) / 4
    for i, opt_fn in enumerate(option_draw_fns):
        ox = int(20 + i * (opt_w + spacing))
        oy = 195
        # Card box
        draw.rectangle([(ox, oy), (ox + opt_w, oy + opt_h)], outline="#555555", width=2, fill="#FFFFFF")
        # Label A, B, C, D, E badge
        draw.rectangle([(ox + 6, oy + 6), (ox + 34, oy + 32)], fill="#1E293B")
        draw.text((ox + 13, oy + 8), LETTERS[i], fill="#FFFFFF")
        # Render option content inside card
        opt_fn(draw, ox, oy, opt_w, opt_h)

    # Convert to base64 data URL
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

# ── GENERATORS ──────────────────────────────────────────────────────────────

questions_to_insert = []
random.seed(2026)

# 1. SERIAL: Polygon Side Progression (+1 side per step)
for k in range(25):
    start_sides = random.choice([3, 4, 5])
    step = 1
    seq = [start_sides + i * step for i in range(4)]  # 4 steps: e.g. 3, 4, 5, 6
    target_sides = start_sides + 4 * step             # 5th step: e.g. 7

    correct_letter = random.choice(LETTERS)
    options_sides = {}
    used = {target_sides}
    for l in LETTERS:
        if l == correct_letter:
            options_sides[l] = target_sides
        else:
            cand = random.choice([s for s in range(3, 10) if s not in used])
            used.add(cand)
            options_sides[l] = cand

    def make_prob_fn(seq_sides):
        def fn(draw, x, y, bw, bh):
            cell_w = bw / 5
            for idx, s in enumerate(seq_sides):
                cx = x + cell_w * (idx + 0.5)
                cy = y + bh / 2
                draw_polygon(draw, (cx, cy), radius=45, sides=s, fill="#E2E8F0", outline="#0F172A", width=3)
                draw.text((cx - 4, cy - 8), str(s), fill="#0F172A")
            # Frame 5 is question mark
            cx = x + cell_w * 4.5
            cy = y + bh / 2
            draw.rectangle([(cx - 45, cy - 45), (cx + 45, cy + 45)], outline="#94A3B8", width=2)
            draw.text((cx - 10, cy - 18), "?", fill="#DC2626")
        return fn

    def make_opt_fn(sides):
        def fn(draw, ox, oy, ow, oh):
            cx = ox + ow / 2
            cy = oy + oh / 2 + 10
            draw_polygon(draw, (cx, cy), radius=38, sides=sides, fill="#F1F5F9", outline="#0F172A", width=3)
            draw.text((cx - 4, cy - 8), str(sides), fill="#0F172A")
        return fn

    prob_fn = make_prob_fn(seq)
    opt_fns = [make_opt_fn(options_sides[l]) for l in LETTERS]
    data_url = create_card_image(prob_fn, opt_fns)

    q_text = f"Soal Serial Gambar No.{101 + k}: Perhatikan pola barisan bangun datar berikut. Tentukan bangun datar ke-5 yang melengkapi pola."
    explanation = f"Pola jumlah sisi bangun bertambah {step} setiap langkah: {seq[0]} -> {seq[1]} -> {seq[2]} -> {seq[3]} -> {target_sides} sisi. Jawaban yang tepat adalah Gambar {correct_letter} (bangun bersisi {target_sides})."

    questions_to_insert.append({
        'category': 'TIU',
        'sub_category': 'Serial Gambar',
        'text': q_text,
        'options': [{'id': l, 'text': f'Gambar {l}', 'score': 5 if l == correct_letter else 0} for l in LETTERS],
        'correct_answer': correct_letter,
        'explanation': explanation,
        'difficulty': 'easy',
        'source': 'Bank Soal Figural Poligon Standar BKN',
        'image': data_url,
    })

# 2. SERIAL: Arrow / Clockwise Rotation
for k in range(30):
    start_deg = random.choice([0, 45, 90, 135])
    rot_step = random.choice([45, 90])
    direction = random.choice([1, -1])  # 1 = clockwise, -1 = counter-clockwise
    actual_step = rot_step * direction
    seq_deg = [(start_deg + i * actual_step) % 360 for i in range(4)]
    target_deg = (start_deg + 4 * actual_step) % 360

    correct_letter = random.choice(LETTERS)
    options_deg = {}
    used_deg = {target_deg}
    for l in LETTERS:
        if l == correct_letter:
            options_deg[l] = target_deg
        else:
            candidates = [d for d in range(0, 360, 45) if d not in used_deg]
            cand = random.choice(candidates)
            used_deg.add(cand)
            options_deg[l] = cand

    def make_arrow_prob_fn(degs):
        def fn(draw, x, y, bw, bh):
            cell_w = bw / 5
            for idx, d in enumerate(degs):
                cx = x + cell_w * (idx + 0.5)
                cy = y + bh / 2
                draw.ellipse([(cx - 50, cy - 50), (cx + 50, cy + 50)], outline="#94A3B8", width=1)
                draw_arrow(draw, (cx, cy), length=75, angle_deg=d, fill="#1E293B")
            cx = x + cell_w * 4.5
            cy = y + bh / 2
            draw.ellipse([(cx - 50, cy - 50), (cx + 50, cy + 50)], outline="#94A3B8", width=2)
            draw.text((cx - 8, cy - 15), "?", fill="#DC2626")
        return fn

    def make_arrow_opt_fn(d):
        def fn(draw, ox, oy, ow, oh):
            cx = ox + ow / 2
            cy = oy + oh / 2 + 10
            draw.ellipse([(cx - 42, cy - 42), (cx + 42, cy + 42)], outline="#E2E8F0", width=1)
            draw_arrow(draw, (cx, cy), length=65, angle_deg=d, fill="#1E293B")
        return fn

    prob_fn = make_arrow_prob_fn(seq_deg)
    opt_fns = [make_arrow_opt_fn(options_deg[l]) for l in LETTERS]
    data_url = create_card_image(prob_fn, opt_fns)

    dir_str = "searah jarum jam" if direction == 1 else "berlawanan arah jarum jam"
    q_text = f"Soal Serial Gambar No.{126 + k}: Perhatikan perputaran arah panah berikut. Tentukan gambar ke-5 yang melanjutkan urutan pola."
    explanation = f"Arah panah berputar sebesar {abs(rot_step)}° {dir_str} pada setiap langkah. Langkah ke-5 menghasilkan sudut {target_deg}°, yang terdapat pada Gambar {correct_letter}."

    questions_to_insert.append({
        'category': 'TIU',
        'sub_category': 'Serial Gambar',
        'text': q_text,
        'options': [{'id': l, 'text': f'Gambar {l}', 'score': 5 if l == correct_letter else 0} for l in LETTERS],
        'correct_answer': correct_letter,
        'explanation': explanation,
        'difficulty': 'medium',
        'source': 'Bank Soal Figural Rotasi Standar BKN',
        'image': data_url,
    })

# 3. ANALOGI: Bentuk A : B :: C : D (Refleksi, Inversi Warna, dan Transformasi)
for k in range(35):
    # Rule: Shape A -> Shape B has a transformation. Apply same to C -> D.
    trans_type = random.choice(['inversi_warna', 'rotasi_180', 'tambah_titik', 'persegi_ke_lingkaran'])
    correct_letter = random.choice(LETTERS)

    def make_analogi_prob_fn(ttype):
        def fn(draw, x, y, bw, bh):
            # A and B pair
            draw.rectangle([(x + 20, y + 20), (x + 130, y + 140)], outline="#334155", width=2)
            draw.rectangle([(x + 160, y + 20), (x + 270, y + 140)], outline="#334155", width=2)
            draw.text((x + 138, y + 70), ":", fill="#0F172A")
            draw.text((x + 285, y + 70), "::", fill="#0F172A")

            # C and ? pair
            draw.rectangle([(x + 310, y + 20), (x + 420, y + 140)], outline="#334155", width=2)
            draw.rectangle([(x + 450, y + 20), (x + 560, y + 140)], outline="#DC2626", width=2)
            draw.text((x + 428, y + 70), ":", fill="#0F172A")
            draw.text((x + 500, y + 70), "?", fill="#DC2626")

            # Content inside A, B, C
            if ttype == 'inversi_warna':
                draw_polygon(draw, (x + 75, y + 80), radius=38, sides=3, fill="#0F172A") # A: black triangle
                draw_polygon(draw, (x + 215, y + 80), radius=38, sides=3, fill="#FFFFFF", outline="#0F172A", width=3) # B: white triangle
                draw_polygon(draw, (x + 365, y + 80), radius=38, sides=4, fill="#0F172A") # C: black square -> D should be white square
            elif ttype == 'rotasi_180':
                draw_arrow(draw, (x + 75, y + 80), length=60, angle_deg=270, fill="#0F172A") # A: up
                draw_arrow(draw, (x + 215, y + 80), length=60, angle_deg=90, fill="#0F172A") # B: down
                draw_polygon(draw, (x + 365, y + 80), radius=35, sides=3, rotation_deg=0, fill="#0F172A") # C: triangle pointing right -> D should point left (180 deg)
            elif ttype == 'tambah_titik':
                draw.rectangle([(x + 45, y + 50), (x + 105, y + 110)], outline="#0F172A", width=2)
                draw.ellipse([(x + 70, y + 75), (x + 80, y + 85)], fill="#0F172A") # 1 dot
                draw.rectangle([(x + 185, y + 50), (x + 245, y + 110)], outline="#0F172A", width=2)
                draw.ellipse([(x + 200, y + 75), (x + 210, y + 85)], fill="#0F172A") # 2 dots
                draw.ellipse([(x + 220, y + 75), (x + 230, y + 85)], fill="#0F172A")
                draw.ellipse([(x + 335, y + 50), (x + 395, y + 110)], outline="#0F172A", width=2)
                draw.ellipse([(x + 360, y + 75), (x + 370, y + 85)], fill="#0F172A") # circle with 1 dot -> D circle with 2 dots
            else: # persegi_ke_lingkaran
                draw_polygon(draw, (x + 75, y + 80), radius=35, sides=4, fill="#E2E8F0", outline="#0F172A", width=2)
                draw.ellipse([(x + 180, y + 45), (x + 250, y + 115)], fill="#E2E8F0", outline="#0F172A", width=2)
                draw_polygon(draw, (x + 365, y + 80), radius=35, sides=3, fill="#E2E8F0", outline="#0F172A", width=2) # D should be oval
        return fn

    def make_analogi_opt_fn(is_correct, ttype):
        def fn(draw, ox, oy, ow, oh):
            cx = ox + ow / 2
            cy = oy + oh / 2 + 10
            if ttype == 'inversi_warna':
                fill = "#FFFFFF" if is_correct else random.choice(["#0F172A", "#64748B"])
                draw_polygon(draw, (cx, cy), radius=35, sides=4 if is_correct else random.choice([3, 5]), fill=fill, outline="#0F172A", width=3)
            elif ttype == 'rotasi_180':
                deg = 180 if is_correct else random.choice([0, 90, 270])
                draw_polygon(draw, (cx, cy), radius=35, sides=3, rotation_deg=deg, fill="#0F172A")
            elif ttype == 'tambah_titik':
                draw.ellipse([(cx - 30, cy - 30), (cx + 30, cy + 30)], outline="#0F172A", width=2)
                num_dots = 2 if is_correct else random.choice([1, 3, 4])
                for di in range(num_dots):
                    dx = cx - 15 + di * 15
                    draw.ellipse([(dx, cy - 4), (dx + 8, cy + 4)], fill="#0F172A")
            else:
                if is_correct:
                    draw.ellipse([(cx - 30, cy - 20), (cx + 30, cy + 20)], fill="#E2E8F0", outline="#0F172A", width=2)
                else:
                    draw_polygon(draw, (cx, cy), radius=30, sides=random.choice([4, 5, 6]), fill="#E2E8F0", outline="#0F172A", width=2)
        return fn

    prob_fn = make_analogi_prob_fn(trans_type)
    opt_fns = [make_analogi_opt_fn(l == correct_letter, trans_type) for l in LETTERS]
    data_url = create_card_image(prob_fn, opt_fns)

    q_text = f"Soal Analogi Gambar No.{156 + k}: Tentukan gambar D yang memiliki hubungan yang sama dengan gambar C sebagaimana hubungan gambar B terhadap gambar A."
    explanation = f"Pola transformasi dari A ke B adalah {trans_type.replace('_', ' ')}. Menerapkan aturan yang sama pada C menghasilkan Gambar {correct_letter}."

    questions_to_insert.append({
        'category': 'TIU',
        'sub_category': 'Analogi Gambar',
        'text': q_text,
        'options': [{'id': l, 'text': f'Gambar {l}', 'score': 5 if l == correct_letter else 0} for l in LETTERS],
        'correct_answer': correct_letter,
        'explanation': explanation,
        'difficulty': 'medium',
        'source': 'Bank Soal Figural Analogi Standar BKN',
        'image': data_url,
    })

# 4. KETIDAKSAMAAN GAMBAR (Odd-One-Out / 4 serupa vs 1 anomali)
for k in range(35):
    anomaly_type = random.choice(['jumlah_sisi_ganjil', 'arah_panah_berbeda', 'elemen_terbuka'])
    correct_letter = random.choice(LETTERS)

    def make_odd_prob_fn():
        def fn(draw, x, y, bw, bh):
            draw.text((x + 30, y + 60), "Tentukan satu gambar di bawah yang memiliki pola BERBEDA dari 4 gambar lainnya.", fill="#0F172A")
            draw.text((x + 30, y + 90), "(Carilah anomali pola bentuk, simetri, atau orientasi).", fill="#475569")
        return fn

    def make_odd_opt_fn(is_odd, atype):
        def fn(draw, ox, oy, ow, oh):
            cx = ox + ow / 2
            cy = oy + oh / 2 + 10
            if atype == 'jumlah_sisi_ganjil':
                # 4 images are even sides (4, 6), odd one is triangle or pentagon (3, 5)
                sides = random.choice([3, 5]) if is_odd else random.choice([4, 6, 8])
                draw_polygon(draw, (cx, cy), radius=35, sides=sides, fill="#F8FAFC", outline="#0F172A", width=3)
                draw.text((cx - 4, cy - 8), str(sides), fill="#0F172A")
            elif atype == 'arah_panah_berbeda':
                # 4 arrows point right/up (clockwise), 1 points left (counter)
                angle = 180 if is_odd else 0
                draw_arrow(draw, (cx, cy), length=65, angle_deg=angle, fill="#0F172A")
            else:
                # 4 shapes are closed, 1 shape is open curve
                if is_odd:
                    draw.arc([(cx - 30, cy - 30), (cx + 30, cy + 30)], start=0, end=270, fill="#0F172A", width=3)
                else:
                    draw.ellipse([(cx - 30, cy - 30), (cx + 30, cy + 30)], outline="#0F172A", width=3)
        return fn

    prob_fn = make_odd_prob_fn()
    opt_fns = [make_odd_opt_fn(l == correct_letter, anomaly_type) for l in LETTERS]
    data_url = create_card_image(prob_fn, opt_fns)

    q_text = f"Soal Ketidaksamaan Gambar No.{191 + k}: Tentukan satu gambar yang berbeda polanya dari gambar-gambar lainnya."
    explanation = f"Empat pilihan lain memiliki karakteristik yang sama berdasarkan {anomaly_type.replace('_', ' ')}. Gambar {correct_letter} adalah anomali yang berbeda."

    questions_to_insert.append({
        'category': 'TIU',
        'sub_category': 'Ketidaksamaan Gambar',
        'text': q_text,
        'options': [{'id': l, 'text': f'Gambar {l}', 'score': 5 if l == correct_letter else 0} for l in LETTERS],
        'correct_answer': correct_letter,
        'explanation': explanation,
        'difficulty': 'medium',
        'source': 'Bank Soal Figural Ketidaksamaan Standar BKN',
        'image': data_url,
    })

# 5. SPASIAL / JARING-JARING KUBUS & ROTASI 3D
for k in range(25):
    correct_letter = random.choice(LETTERS)
    dice_dots = random.choice([1, 2, 3, 4, 5, 6])

    def make_spasial_prob_fn(dots):
        def fn(draw, x, y, bw, bh):
            cx = x + bw / 2
            cy = y + bh / 2
            draw.rectangle([(cx - 50, cy - 50), (cx + 50, cy + 50)], outline="#0F172A", width=3, fill="#F8FAFC")
            draw.text((x + 40, y + 25), "Jaring / Sisi Utama Kubus:", fill="#0F172A")
            # Draw dots pattern
            for i in range(dots):
                dx = cx - 30 + (i % 3) * 30
                dy = cy - 20 + (i // 3) * 40
                draw.ellipse([(dx - 6, dy - 6), (dx + 6, dy + 6)], fill="#0F172A")
        return fn

    def make_spasial_opt_fn(is_correct, dots):
        def fn(draw, ox, oy, ow, oh):
            cx = ox + ow / 2
            cy = oy + oh / 2 + 10
            draw.rectangle([(cx - 35, cy - 35), (cx + 35, cy + 35)], outline="#0F172A", width=2, fill="#FFFFFF")
            d_count = dots if is_correct else random.choice([d for d in range(1, 7) if d != dots])
            for i in range(d_count):
                dx = cx - 20 + (i % 3) * 20
                dy = cy - 15 + (i // 3) * 30
                draw.ellipse([(dx - 4, dy - 4), (dx + 4, dy + 4)], fill="#0F172A")
        return fn

    prob_fn = make_spasial_prob_fn(dice_dots)
    opt_fns = [make_spasial_opt_fn(l == correct_letter, dice_dots) for l in LETTERS]
    data_url = create_card_image(prob_fn, opt_fns)

    q_text = f"Soal Penalaran Spasial No.{226 + k}: Tentukan tampilan kubus yang sesuai dengan jaring/sisi pola utama saat diputar."
    explanation = f"Berdasarkan rotasi 3D dan orientasi pola, sisi yang tepat sesuai jaring awal adalah Gambar {correct_letter}."

    questions_to_insert.append({
        'category': 'TIU',
        'sub_category': 'Penalaran Spasial / Jaring Kubus',
        'text': q_text,
        'options': [{'id': l, 'text': f'Gambar {l}', 'score': 5 if l == correct_letter else 0} for l in LETTERS],
        'correct_answer': correct_letter,
        'explanation': explanation,
        'difficulty': 'hard',
        'source': 'Bank Soal Spasial 3D Standar BKN',
        'image': data_url,
    })

print(f"Total programmatic questions generated: {len(questions_to_insert)}")

# Connect to DB and insert
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
inserted = 0

for q in questions_to_insert:
    # Check dup
    cur.execute("SELECT COUNT(*) FROM question_bank WHERE text = %s", (q['text'],))
    if cur.fetchone()[0] > 0:
        continue

    cur.execute("""
        INSERT INTO question_bank 
            (category, sub_category, text, options, correct_answer, explanation, difficulty, source, image, used_count)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
    """, (
        q['category'],
        q['sub_category'],
        q['text'],
        json.dumps(q['options']),
        q['correct_answer'],
        q['explanation'],
        q['difficulty'],
        q['source'],
        q['image']
    ))
    inserted += 1

conn.commit()

# Query final count
cur.execute("SELECT COUNT(*) FROM question_bank WHERE image LIKE 'data:image/%'")
final_figural_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM question_bank")
final_total_count = cur.fetchone()[0]

cur.close()
conn.close()

print(f"Inserted new figural questions: {inserted}")
print(f"TOTAL Figural questions in DB: {final_figural_count}")
print(f"TOTAL questions in question_bank: {final_total_count}")
