#!/usr/bin/env python3
"""
Script perbaikan paket Tryout SKD CPNS.
Melakukan:
1. Validasi struktur (110 soal: 30 TWK, 35 TIU, 45 TKP)
2. Normalisasi subCategory
3. Rebalance posisi jawaban TWK (6 tiap huruf A-E)
4. Rebalance posisi jawaban TIU (7 tiap huruf A-E)
5. Acak permutasi skor TKP (9 skor-5 tiap huruf A-E, hilangkan monoton (5,4,3,2,1))
6. Sinkronisasi penjelasan
7. Nomor urut sequential
"""

import json
import random
import re
from collections import Counter

LETTERS = ['A', 'B', 'C', 'D', 'E']

def fix_package(file_path, seed=42):
    random.seed(seed)
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    assert len(data) == 110, f"Expected 110 questions, got {len(data)}"
    
    twk_qs = [q for q in data if q['category'] == 'TWK']
    tiu_qs = [q for q in data if q['category'] == 'TIU']
    tkp_qs = [q for q in data if q['category'] == 'TKP']

    assert len(twk_qs) == 30, f"TWK count {len(twk_qs)}"
    assert len(tiu_qs) == 35, f"TIU count {len(tiu_qs)}"
    assert len(tkp_qs) == 45, f"TKP count {len(tkp_qs)}"

    # 1. FIX TWK (target: exactly 6 of each A-E)
    target_twk = ['A']*6 + ['B']*6 + ['C']*6 + ['D']*6 + ['E']*6
    random.shuffle(target_twk)

    fixed_twk = []
    for i, q in enumerate(twk_qs):
        num = i + 1
        q['id'] = num
        
        # Extract subCategory if needed
        if not q.get('subCategory'):
            m = re.match(r'Soal nomor \d+ \((.+?)\):\s*', q.get('text', ''))
            q['subCategory'] = m.group(1).strip() if m else 'TWK'
        
        # Renumber text
        q['text'] = re.sub(r'^Soal nomor \d+', f'Soal nomor {num}', q.get('text', ''))
        
        # Find correct option
        orig_opts = q['options']
        correct_opt = next((o for o in orig_opts if o.get('score', 0) == 5), orig_opts[0])
        wrong_opts = [o for o in orig_opts if o != correct_opt]
        random.shuffle(wrong_opts)

        target_letter = target_twk[i]
        target_idx = LETTERS.index(target_letter)

        new_opts = [None] * 5
        new_opts[target_idx] = {'id': target_letter, 'text': correct_opt['text'], 'score': 5}
        
        w_idx = 0
        for j in range(5):
            if j != target_idx:
                new_opts[j] = {'id': LETTERS[j], 'text': wrong_opts[w_idx]['text'], 'score': 0}
                w_idx += 1
        
        q['options'] = new_opts
        
        # Update explanation if it mentions old letter
        exp = q.get('explanation', '')
        exp = re.sub(r'(Jawaban|Kunci)\s*:\s*[A-E]', f'\\1: {target_letter}', exp, flags=re.IGNORECASE)
        q['explanation'] = exp
        
        fixed_twk.append(q)

    # 2. FIX TIU (target: exactly 7 of each A-E)
    target_tiu = ['A']*7 + ['B']*7 + ['C']*7 + ['D']*7 + ['E']*7
    random.shuffle(target_tiu)

    fixed_tiu = []
    for i, q in enumerate(tiu_qs):
        num = i + 31
        q['id'] = num

        if not q.get('subCategory'):
            m = re.match(r'Soal nomor \d+ \((.+?)\):\s*', q.get('text', ''))
            q['subCategory'] = m.group(1).strip() if m else 'TIU'

        q['text'] = re.sub(r'^Soal nomor \d+', f'Soal nomor {num}', q.get('text', ''))

        orig_opts = q['options']
        correct_opt = next((o for o in orig_opts if o.get('score', 0) == 5), orig_opts[0])
        wrong_opts = [o for o in orig_opts if o != correct_opt]
        random.shuffle(wrong_opts)

        target_letter = target_tiu[i]
        target_idx = LETTERS.index(target_letter)

        new_opts = [None] * 5
        new_opts[target_idx] = {'id': target_letter, 'text': correct_opt['text'], 'score': 5}

        w_idx = 0
        for j in range(5):
            if j != target_idx:
                new_opts[j] = {'id': LETTERS[j], 'text': wrong_opts[w_idx]['text'], 'score': 0}
                w_idx += 1

        q['options'] = new_opts

        exp = q.get('explanation', '')
        exp = re.sub(r'(Jawaban|Kunci)\s*:\s*[A-E]', f'\\1: {target_letter}', exp, flags=re.IGNORECASE)
        q['explanation'] = exp

        fixed_tiu.append(q)

    # 3. FIX TKP (target: exactly 9 of each A-E has score=5, randomize other scores)
    target_tkp_5 = ['A']*9 + ['B']*9 + ['C']*9 + ['D']*9 + ['E']*9
    random.shuffle(target_tkp_5)

    fixed_tkp = []
    for i, q in enumerate(tkp_qs):
        num = i + 66
        q['id'] = num

        if not q.get('subCategory'):
            m = re.match(r'Soal nomor \d+ \((.+?)\):\s*', q.get('text', ''))
            q['subCategory'] = m.group(1).strip() if m else 'TKP'

        q['text'] = re.sub(r'^Soal nomor \d+', f'Soal nomor {num}', q.get('text', ''))

        # Map each original option text to its original score
        orig_opts = q['options']
        # If all scores are 0, synthesize 1-5
        has_scores = set(o.get('score') for o in orig_opts) == {1, 2, 3, 4, 5}
        if not has_scores:
            # Assign scores 5 down to 1
            for rank, o in enumerate(orig_opts):
                o['score'] = 5 - rank

        score_to_text = {o['score']: o['text'] for o in orig_opts}

        # Target letter for score 5
        target_letter = target_tkp_5[i]
        target_idx = LETTERS.index(target_letter)

        # Remaining letters and remaining scores (4, 3, 2, 1)
        rem_letters = [l for l in LETTERS if l != target_letter]
        rem_scores = [4, 3, 2, 1]
        random.shuffle(rem_scores)

        new_opts = [None] * 5
        new_opts[target_idx] = {
            'id': target_letter,
            'text': score_to_text[5],
            'score': 5
        }

        for l, s in zip(rem_letters, rem_scores):
            idx = LETTERS.index(l)
            new_opts[idx] = {
                'id': l,
                'text': score_to_text[s],
                'score': s
            }

        q['options'] = new_opts
        fixed_tkp.append(q)

    # Combine all
    all_fixed = fixed_twk + fixed_tiu + fixed_tkp

    # Validate output
    assert len(all_fixed) == 110
    for i, q in enumerate(all_fixed):
        assert q['id'] == i + 1, f"Q{q['id']} wrong id at index {i}"
        scores = [o['score'] for o in q['options']]
        if q['category'] in ('TWK', 'TIU'):
            assert sorted(scores) == [0, 0, 0, 0, 5], f"Q{q['id']} bad scores {scores}"
        elif q['category'] == 'TKP':
            assert sorted(scores) == [1, 2, 3, 4, 5], f"Q{q['id']} bad TKP scores {scores}"

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(all_fixed, f, indent=2, ensure_ascii=False)

    print(f"Successfully fixed {file_path}")
    print(f"  TWK score-5: {Counter(target_twk)}")
    print(f"  TIU score-5: {Counter(target_tiu)}")
    print(f"  TKP score-5: {Counter(target_tkp_5)}")

if __name__ == '__main__':
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else 'src/data/packages/tryout-2.json'
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42
    fix_package(path, seed)
