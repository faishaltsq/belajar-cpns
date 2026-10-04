import json, re, random
from pathlib import Path
import psycopg2

PROJECT_DIR = Path('C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas')
EXTRACTED_DIR = Path('C:/Users/cubeb/AppData/Local/hermes/cache/scratch/extracted_soal')

# 1. Connect to DB to load existing texts and figural questions
env_text = (PROJECT_DIR / '.env.local').read_text(encoding='utf-8')
db_url = re.search(r'POSTGRES_URL=([^\r\n]+)', env_text).group(1).strip()
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Existing texts from questions table (tryout-1..7, mini, figural)
cur.execute("SELECT package_id, text FROM questions")
existing_q_rows = cur.fetchall()

def norm_text(t):
    if not t: return ''
    # remove leading question prefix like '1. ', 'Soal 1: '
    clean = re.sub(r'^(?:soal\s*\d+\s*:\s*|\d+\.\s*)', '', t, flags=re.I).strip()
    return re.sub(r'[^a-zA-Z0-9]', '', clean.lower())[:60]

seen_texts = set(norm_text(r[1]) for r in existing_q_rows if r[1])
print(f"Loaded {len(seen_texts)} existing normalized texts from DB questions table.")

# Also load existing question_bank texts
cur.execute("SELECT text FROM question_bank")
for r in cur.fetchall():
    if r[0]:
        seen_texts.add(norm_text(r[0]))

# Load figural questions from DB
cur.execute("""
    SELECT id, category, sub_category, text, options, correct_answer, explanation, difficulty, image
    FROM question_bank
    WHERE image LIKE 'data:image/%'
    ORDER BY id ASC
""")
figural_rows = cur.fetchall()
print(f"Loaded {len(figural_rows)} figural questions from DB.")

cur.close()
conn.close()

# 2. Load extracted files
files = [
    EXTRACTED_DIR / 'to_premium_6_10.json',
    EXTRACTED_DIR / 'simulasi_2024.json',
    EXTRACTED_DIR / 'bank_soal_inline.json',
    EXTRACTED_DIR / 'soal_paket.json'
]

raw_extracted = []
for fp in files:
    if fp.exists():
        data = json.load(open(fp, encoding='utf-8'))
        raw_extracted.extend(data)
        print(f"Loaded {len(data)} items from {fp.name}")

# Deduplicate raw extracted items
twk_pool = {'A': [], 'B': [], 'C': [], 'D': [], 'E': []}
tiu_nonfig_pool = {'A': [], 'B': [], 'C': [], 'D': [], 'E': []}
tkp_pool = []

for item in raw_extracted:
    q_text = item.get('question_text', '').strip()
    ans = item.get('correct_answer', '').strip().upper()
    cat = item.get('category', '').strip().upper()
    opts = item.get('options', {})

    if not q_text or len(q_text) < 10 or ans not in 'ABCDE':
        continue

    # Clean question text from leading "Soal 1:" etc
    clean_q_text = re.sub(r'^(?:soal\s*\d+\s*:\s*|\d+\.\s*)', '', q_text, flags=re.I).strip()
    clean_q_text = re.sub(r'\s+', ' ', clean_q_text)

    # Ensure all 5 options exist and have text
    if isinstance(opts, dict):
        has_all_opts = all(k in opts and str(opts[k]).strip() for k in ['A', 'B', 'C', 'D', 'E'])
        if not has_all_opts:
            continue
        opts_dict = {k: re.sub(r'\s+', ' ', str(opts[k])).strip() for k in ['A', 'B', 'C', 'D', 'E']}
    else:
        continue

    # Check deduplication
    nkey = norm_text(clean_q_text)
    if not nkey or nkey in seen_texts:
        continue
    seen_texts.add(nkey)

    expl = item.get('explanation', '').strip()
    if not expl:
        expl = f"Pembahasan: Kunci jawaban yang tepat adalah {ans}."

    if cat == 'TWK':
        twk_pool[ans].append({
            'text': clean_q_text,
            'options': opts_dict,
            'correct_answer': ans,
            'explanation': expl,
            'category': 'TWK',
            'subCategory': item.get('sub_category') or 'Nasionalisme'
        })
    elif cat == 'TIU':
        tiu_nonfig_pool[ans].append({
            'text': clean_q_text,
            'options': opts_dict,
            'correct_answer': ans,
            'explanation': expl,
            'category': 'TIU',
            'subCategory': item.get('sub_category') or 'Kemampuan Verbal'
        })
    elif cat == 'TKP':
        # Keep options and tkp_scores if available
        tkp_scores = item.get('tkp_scores')
        tkp_pool.append({
            'text': clean_q_text,
            'options': opts_dict,
            'correct_answer': ans,
            'tkp_scores': tkp_scores,
            'explanation': expl,
            'category': 'TKP',
            'subCategory': item.get('sub_category') or 'Pelayanan Publik'
        })

print("\n--- Extracted Pools ---")
print("TWK pool:", {k: len(v) for k, v in twk_pool.items()})
print("TIU non-fig pool:", {k: len(v) for k, v in tiu_nonfig_pool.items()})
print("TKP pool total:", len(tkp_pool))

# Prepare Figural pool
tiu_fig_pool = {'A': [], 'B': [], 'C': [], 'D': [], 'E': []}
for r in figural_rows:
    q_id, cat, subcat, text, opts_raw, correct, expl, diff, img = r
    ans = correct.strip().upper()
    if ans not in 'ABCDE':
        continue
    opts = json.loads(opts_raw) if isinstance(opts_raw, str) else opts_raw
    # opts is array of {id, text, score}
    opts_dict = {o['id']: o['text'] for o in opts}
    tiu_fig_pool[ans].append({
        'text': text,
        'options': opts_dict,
        'correct_answer': ans,
        'explanation': expl or f"Pembahasan: Kunci jawaban pola figural adalah Gambar {ans}.",
        'category': 'TIU',
        'subCategory': subcat or 'Penalaran Figural',
        'image': img
    })

print("TIU figural pool:", {k: len(v) for k, v in tiu_fig_pool.items()})

# 3. Assemble 10 tryout packages: tryout-8 through tryout-17
# Subcategory lists for cycling
TWK_SUBCATS = ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Indonesia']
TIU_SUBCATS_VERBAL = ['Verbal Analogi', 'Verbal Silogisme', 'Verbal Analitis']
TIU_SUBCATS_NUMERIK = ['Numerik Berhitung', 'Numerik Deret Angka', 'Numerik Perbandingan Kuantitatif', 'Numerik Soal Cerita']
TKP_SUBCATS = ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'Teknologi Informasi dan Komunikasi', 'Profesionalisme', 'Anti Radikalisme']

# Set random seed for reproducibility
random.seed(42)

# Shuffle each pool list
for k in twk_pool: random.shuffle(twk_pool[k])
for k in tiu_nonfig_pool: random.shuffle(tiu_nonfig_pool[k])
for k in tiu_fig_pool: random.shuffle(tiu_fig_pool[k])
random.shuffle(tkp_pool)

packages_output = {}

for pkg_idx in range(8, 18):
    pkg_id = f"tryout-{pkg_idx}"
    questions = []
    
    # --- TWK (30 questions: exactly 6 of A, B, C, D, E) ---
    twk_questions = []
    for letter in ['A', 'B', 'C', 'D', 'E']:
        for _ in range(6):
            if not twk_pool[letter]:
                raise RuntimeError(f"TWK pool exhausted for letter {letter} at {pkg_id}")
            q = twk_pool[letter].pop(0)
            twk_questions.append(q)
    
    # Shuffle the 30 TWK order so answer keys are mixed (not all 6 A's together)
    random.shuffle(twk_questions)
    for i, q in enumerate(twk_questions):
        correct = q['correct_answer']
        opts = [
            {'id': l, 'text': q['options'][l], 'score': 5 if l == correct else 0}
            for l in ['A', 'B', 'C', 'D', 'E']
        ]
        questions.append({
            'id': i + 1,
            'category': 'TWK',
            'subCategory': TWK_SUBCATS[i % len(TWK_SUBCATS)],
            'text': q['text'],
            'options': opts,
            'explanation': q['explanation'],
            'difficulty': 'medium'
        })
    
    # --- TIU (35 questions: 23 non-figural + 12 figural, exactly 7 of each letter A..E) ---
    # Allocation per letter to match pool inventory:
    # A: 5 non-fig + 2 fig = 7
    # B: 5 non-fig + 2 fig = 7
    # C: 5 non-fig + 2 fig = 7
    # D: 4 non-fig + 3 fig = 7
    # E: 4 non-fig + 3 fig = 7
    NONFIG_QUOTA = {'A': 5, 'B': 5, 'C': 5, 'D': 4, 'E': 4}
    FIG_QUOTA = {'A': 2, 'B': 2, 'C': 2, 'D': 3, 'E': 3}

    tiu_nonfig_qs = []
    for letter, count in NONFIG_QUOTA.items():
        for _ in range(count):
            if not tiu_nonfig_pool[letter]:
                raise RuntimeError(f"TIU nonfig pool exhausted for letter {letter} at {pkg_id}")
            q = tiu_nonfig_pool[letter].pop(0)
            tiu_nonfig_qs.append(q)
    
    random.shuffle(tiu_nonfig_qs)
    for i, q in enumerate(tiu_nonfig_qs):
        correct = q['correct_answer']
        opts = [
            {'id': l, 'text': q['options'][l], 'score': 5 if l == correct else 0}
            for l in ['A', 'B', 'C', 'D', 'E']
        ]
        subcat = (TIU_SUBCATS_VERBAL + TIU_SUBCATS_NUMERIK)[i % (len(TIU_SUBCATS_VERBAL) + len(TIU_SUBCATS_NUMERIK))]
        questions.append({
            'id': 31 + i,
            'category': 'TIU',
            'subCategory': subcat,
            'text': q['text'],
            'options': opts,
            'explanation': q['explanation'],
            'difficulty': 'medium'
        })
    
    # 12 Figural questions (Q54..Q65)
    tiu_fig_qs = []
    for letter, count in FIG_QUOTA.items():
        for _ in range(count):
            if not tiu_fig_pool[letter]:
                raise RuntimeError(f"TIU figural pool exhausted for letter {letter} at {pkg_id}")
            q = tiu_fig_pool[letter].pop(0)
            tiu_fig_qs.append(q)
    
    random.shuffle(tiu_fig_qs)
    for i, q in enumerate(tiu_fig_qs):
        correct = q['correct_answer']
        opts = [
            {'id': l, 'text': q['options'][l], 'score': 5 if l == correct else 0}
            for l in ['A', 'B', 'C', 'D', 'E']
        ]
        questions.append({
            'id': 31 + len(tiu_nonfig_qs) + i,
            'category': 'TIU',
            'subCategory': q['subCategory'],
            'text': q['text'],
            'options': opts,
            'image': q.get('image'),
            'explanation': q['explanation'],
            'difficulty': 'medium'
        })
    
    # --- TKP (45 questions: exactly 9 of each letter A..E with score 5) ---
    # Target distribution of score-5 letters: 9 of A, 9 of B, 9 of C, 9 of D, 9 of E
    target_letters = ['A'] * 9 + ['B'] * 9 + ['C'] * 9 + ['D'] * 9 + ['E'] * 9
    random.shuffle(target_letters)
    
    if len(tkp_pool) < 45:
        raise RuntimeError(f"TKP pool exhausted at {pkg_id}")
    
    for i, target_letter in enumerate(target_letters):
        q = tkp_pool.pop(0)
        orig_opts = q['options']
        orig_ans = q['correct_answer']
        
        # Best option text (the one with score 5 in original)
        best_text = orig_opts.get(orig_ans, orig_opts['A'])
        
        # Other 4 option texts
        other_texts = [orig_opts[k] for k in ['A', 'B', 'C', 'D', 'E'] if k != orig_ans]
        if len(other_texts) != 4:
            # Fallback if orig_ans wasn't in orig_opts
            other_texts = [orig_opts[k] for k in ['A', 'B', 'C', 'D', 'E']][:4]
        
        # Shuffled scores for other 4 options: permutation of [1, 2, 3, 4]
        other_scores = [1, 2, 3, 4]
        random.shuffle(other_scores)
        
        # Build options dict: target_letter gets best_text and score 5
        opts_built = []
        other_idx = 0
        for l in ['A', 'B', 'C', 'D', 'E']:
            if l == target_letter:
                opts_built.append({'id': l, 'text': best_text, 'score': 5})
            else:
                opts_built.append({'id': l, 'text': other_texts[other_idx], 'score': other_scores[other_idx]})
                other_idx += 1
        
        questions.append({
            'id': 66 + i,
            'category': 'TKP',
            'subCategory': TKP_SUBCATS[i % len(TKP_SUBCATS)],
            'text': q['text'],
            'options': opts_built,
            'explanation': q['explanation'],
            'difficulty': 'easy'
        })
    
    packages_output[pkg_id] = questions
    print(f"Generated {pkg_id}: {len(questions)} questions")

# 4. Save to files
packages_dir = PROJECT_DIR / 'src/data/packages'
for pkg_id, qs in packages_output.items():
    file_path = packages_dir / f"{pkg_id}.json"
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(qs, f, ensure_ascii=False, indent=2)
    print(f"Saved {file_path.name} ({len(qs)} questions)")

print("\nAll 10 tryouts generated successfully!")
