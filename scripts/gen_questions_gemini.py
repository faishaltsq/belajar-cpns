"""
Generate variasi soal CPNS baru via Gemini 3.8 Flash (9router).
Baca referensi dari extracted/*.txt, tulis ulang jadi soal original.
Output: src/data/packages/tryout-{2..6}.json (masing-masing 110 soal)
"""

import os, json, re, time, sys
import urllib.request, urllib.error
from pathlib import Path
from dotenv import load_dotenv

# === CONFIG ===
load_dotenv(Path(os.environ.get('HERMES_HOME', 'C:/Users/cubeb/.hermes')) / '.env')
API_KEY = os.environ.get('HERMES_CUSTOM_LOCALHOST_20128_API_KEY', '')
API_BASE = 'http://localhost:20128/v1'
MODEL = 'ag/gemini-3.8-flash'

EXTRACTED_DIR = Path(__file__).parent.parent / 'extracted'
OUT_DIR = Path(__file__).parent.parent / 'src' / 'data' / 'packages'
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Distribusi soal per paket
TWK_COUNT = 30
TIU_COUNT = 35
TKP_COUNT = 45

# TWK subkategori
TWK_SUBS = ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Indonesia']
TIU_SUBS = ['Verbal Analogi', 'Verbal Sinonim', 'Verbal Antonim', 'Penalaran Induktif', 'Penalaran Deduktif', 'Penalaran Kuantitatif', 'Figural']
TKP_SUBS = ['Integritas Diri', 'Semangat Berprestasi', 'Orientasi Pelayanan', 'Kemampuan Adaptasi', 'Mengendalikan Diri', 'Bekerja Mandiri', 'Kemauan Belajar', 'Kerjasama Tim', 'Kepemimpinan']


def call_gemini(prompt: str, max_tokens: int = 4000) -> str:
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{API_BASE}/chat/completions',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        }
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode('utf-8')

    # Handle SSE streaming format (data: {...}\n\n)
    if raw.startswith('data:'):
        content_parts = []
        for line in raw.split('\n'):
            line = line.strip()
            if not line.startswith('data:'):
                continue
            chunk = line[5:].strip()
            if chunk == '[DONE]':
                break
            try:
                obj = json.loads(chunk)
                delta = obj.get('choices', [{}])[0].get('delta', {})
                if 'content' in delta:
                    content_parts.append(delta['content'])
            except (json.JSONDecodeError, IndexError):
                pass
        return ''.join(content_parts)
    else:
        # Standard JSON response
        data = json.loads(raw)
        return data['choices'][0]['message']['content']


def read_ref(filename: str, max_chars: int = 6000) -> str:
    p = EXTRACTED_DIR / filename
    if p.exists():
        text = p.read_text(encoding='utf-8')
        return text[:max_chars]
    return ''


def gen_twk_batch(sub: str, count: int, ref_text: str, start_id: int, pkg_num: int) -> list:
    prompt = f"""Kamu adalah pembuat soal CPNS profesional.

REFERENSI materi (jangan copy-paste, gunakan sebagai inspirasi topik saja):
---
{ref_text[:3000]}
---

Buat {count} soal BARU untuk subtes TWK (Tes Wawasan Kebangsaan), subkategori: **{sub}**
Soal untuk Paket Tryout #{pkg_num}.

ATURAN WAJIB:
1. Soal HARUS original, bukan salinan dari referensi
2. 5 pilihan jawaban (A-E), hanya 1 jawaban benar
3. Jawaban benar bernilai 5, salah bernilai 0
4. Soal berbasis pengetahuan faktual yang bisa diverifikasi
5. Sertakan penjelasan singkat mengapa jawaban benar

Format output WAJIB JSON array, tidak ada teks lain:
[
  {{
    "subCategory": "{sub}",
    "text": "teks soal...",
    "options": [
      {{"id": "A", "text": "...", "score": 5}},
      {{"id": "B", "text": "...", "score": 0}},
      {{"id": "C", "text": "...", "score": 0}},
      {{"id": "D", "text": "...", "score": 0}},
      {{"id": "E", "text": "...", "score": 0}}
    ],
    "explanation": "Pembahasan: ..."
  }}
]

Buat tepat {count} soal. Output JSON array saja, tidak ada teks lain."""

    raw = call_gemini(prompt, max_tokens=4000)
    questions = parse_json_array(raw)
    result = []
    for i, q in enumerate(questions[:count]):
        result.append({
            "id": start_id + i,
            "category": "TWK",
            "subCategory": q.get("subCategory", sub),
            "text": q.get("text", ""),
            "options": q.get("options", []),
            "explanation": q.get("explanation", "")
        })
    return result


def gen_tiu_batch(sub: str, count: int, ref_text: str, start_id: int, pkg_num: int) -> list:
    prompt = f"""Kamu adalah pembuat soal CPNS profesional.

REFERENSI materi (jangan copy-paste, gunakan sebagai inspirasi topik/pola saja):
---
{ref_text[:3000]}
---

Buat {count} soal BARU untuk subtes TIU (Tes Inteligensia Umum), subkategori: **{sub}**
Soal untuk Paket Tryout #{pkg_num}.

ATURAN WAJIB:
1. Soal HARUS original — bukan salinan dari referensi
2. 5 pilihan jawaban (A-E), hanya 1 jawaban benar
3. Jawaban benar bernilai 5, salah bernilai 0
4. Soal logis, bisa diselesaikan, ada jawaban definitif
5. Sertakan penjelasan cara penyelesaian

Jika subkategori Verbal Analogi: format "X : Y = A : ?"
Jika Sinonim/Antonim: pilih kata bahasa Indonesia baku
Jika Penalaran Kuantitatif: soal matematika/aritmatika praktis

Format output WAJIB JSON array:
[
  {{
    "subCategory": "{sub}",
    "text": "teks soal...",
    "options": [
      {{"id": "A", "text": "...", "score": 5}},
      {{"id": "B", "text": "...", "score": 0}},
      {{"id": "C", "text": "...", "score": 0}},
      {{"id": "D", "text": "...", "score": 0}},
      {{"id": "E", "text": "...", "score": 0}}
    ],
    "explanation": "Pembahasan: ..."
  }}
]

Buat tepat {count} soal. Output JSON array saja."""

    raw = call_gemini(prompt, max_tokens=4000)
    questions = parse_json_array(raw)
    result = []
    for i, q in enumerate(questions[:count]):
        result.append({
            "id": start_id + i,
            "category": "TIU",
            "subCategory": q.get("subCategory", sub),
            "text": q.get("text", ""),
            "options": q.get("options", []),
            "explanation": q.get("explanation", "")
        })
    return result


def gen_tkp_batch(sub: str, count: int, ref_text: str, start_id: int, pkg_num: int) -> list:
    prompt = f"""Kamu adalah pembuat soal CPNS profesional.

REFERENSI materi (jangan copy-paste, gunakan sebagai inspirasi situasi/konteks saja):
---
{ref_text[:2000]}
---

Buat {count} soal BARU untuk subtes TKP (Tes Karakteristik Pribadi), subkategori: **{sub}**
Soal untuk Paket Tryout #{pkg_num}.

ATURAN WAJIB:
1. Soal berupa skenario situasional yang dihadapi ASN
2. 5 pilihan jawaban (A-E) dengan skor berbeda: pilihan terbaik=5, baik=4, cukup=3, kurang=2, buruk=1
3. SEMUA pilihan harus masuk akal dan tidak ada yang jelas-jelas salah
4. Skor harus ditetapkan berdasarkan kualitas jawaban ASN ideal
5. Sertakan penjelasan mengapa pilihan terbaik bernilai 5

Format output WAJIB JSON array:
[
  {{
    "subCategory": "{sub}",
    "text": "Skenario situasional...",
    "options": [
      {{"id": "A", "text": "...", "score": 5}},
      {{"id": "B", "text": "...", "score": 4}},
      {{"id": "C", "text": "...", "score": 3}},
      {{"id": "D", "text": "...", "score": 2}},
      {{"id": "E", "text": "...", "score": 1}}
    ],
    "explanation": "Pembahasan: ..."
  }}
]

Buat tepat {count} soal. Output JSON array saja."""

    raw = call_gemini(prompt, max_tokens=4000)
    questions = parse_json_array(raw)
    result = []
    for i, q in enumerate(questions[:count]):
        result.append({
            "id": start_id + i,
            "category": "TKP",
            "subCategory": q.get("subCategory", sub),
            "text": q.get("text", ""),
            "options": q.get("options", []),
            "explanation": q.get("explanation", "")
        })
    return result


def parse_json_array(raw: str) -> list:
    """Extract JSON array from LLM response."""
    # strip markdown code blocks
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw)
    raw = raw.strip()
    # find first [ ... ] 
    start = raw.find('[')
    end = raw.rfind(']')
    if start == -1 or end == -1:
        print(f"[WARN] No JSON array found. Raw (first 200): {raw[:200]}")
        return []
    try:
        return json.loads(raw[start:end+1])
    except json.JSONDecodeError as e:
        print(f"[WARN] JSON parse error: {e}. Raw (first 500): {raw[start:start+500]}")
        return []


def generate_package(pkg_num: int) -> list:
    """Generate 1 package of 110 questions (30 TWK + 35 TIU + 45 TKP)."""
    print(f"\n=== Generating Tryout-{pkg_num} ===")
    all_questions = []
    current_id = 1

    # === TWK (30 soal) ===
    # Ref sources per pkg
    twk_refs = {
        2: 'TO6.txt', 3: 'TO7.txt', 4: 'TO8.txt', 5: 'TO9.txt', 6: 'TO10.txt'
    }
    ref_twk = read_ref(twk_refs.get(pkg_num, 'SIM8.txt'))

    # Distribusi: 6 sub x 5 soal = 30
    twk_dist = [6, 6, 6, 6, 6]  # 5 subkategori
    for i, sub in enumerate(TWK_SUBS):
        count = twk_dist[i] if i < len(twk_dist) else 6
        print(f"  TWK [{sub}] {count} soal...", end=' ', flush=True)
        try:
            batch = gen_twk_batch(sub, count, ref_twk, current_id, pkg_num)
            all_questions.extend(batch)
            current_id += len(batch)
            print(f"OK ({len(batch)})")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(1)

    # === TIU (35 soal) ===
    tiu_refs = {
        2: 'PAK1.txt', 3: 'PAK2.txt', 4: 'PAK6.txt', 5: 'PAK7.txt', 6: 'TIU_BOOK.txt'
    }
    ref_tiu = read_ref(tiu_refs.get(pkg_num, 'SIM8.txt'))

    # Distribusi: Analogi 7, Sinonim 5, Antonim 5, Induktif 5, Deduktif 5, Kuantitatif 8 = 35
    tiu_dist = [7, 5, 5, 5, 5, 8]
    tiu_subs_used = TIU_SUBS[:6]
    for i, sub in enumerate(tiu_subs_used):
        count = tiu_dist[i]
        print(f"  TIU [{sub}] {count} soal...", end=' ', flush=True)
        try:
            batch = gen_tiu_batch(sub, count, ref_tiu, current_id, pkg_num)
            all_questions.extend(batch)
            current_id += len(batch)
            print(f"OK ({len(batch)})")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(1)

    # === TKP (45 soal) ===
    tkp_refs = {
        2: 'SIM8.txt', 3: 'SIM8.txt', 4: 'EBOOK2024.txt', 5: 'EBOOK2024.txt', 6: 'SIM8.txt'
    }
    ref_tkp = read_ref(tkp_refs.get(pkg_num, 'SIM8.txt'), max_chars=4000)

    # Distribusi: 9 sub x 5 soal = 45
    for i, sub in enumerate(TKP_SUBS):
        count = 5
        print(f"  TKP [{sub}] {count} soal...", end=' ', flush=True)
        try:
            batch = gen_tkp_batch(sub, count, ref_tkp, current_id, pkg_num)
            all_questions.extend(batch)
            current_id += len(batch)
            print(f"OK ({len(batch)})")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(1)

    # Renumber IDs sequentially 1..N
    for i, q in enumerate(all_questions):
        q['id'] = i + 1

    print(f"  Total: {len(all_questions)} soal")
    return all_questions


def save_package(pkg_num: int, questions: list):
    out_path = OUT_DIR / f'tryout-{pkg_num}.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {out_path} ({len(questions)} soal)")
    return out_path


if __name__ == '__main__':
    # Which packages to generate
    packages = [2, 3, 4, 5, 6]
    if len(sys.argv) > 1:
        packages = [int(x) for x in sys.argv[1:]]

    for pkg_num in packages:
        out_path = OUT_DIR / f'tryout-{pkg_num}.json'
        if out_path.exists():
            print(f"tryout-{pkg_num}.json already exists, skipping (delete to regenerate)")
            continue
        questions = generate_package(pkg_num)
        if questions:
            save_package(pkg_num, questions)
        else:
            print(f"[ERROR] No questions generated for tryout-{pkg_num}")

    print("\nDone!")
