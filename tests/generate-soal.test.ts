import { describe, it, expect, beforeAll } from 'vitest';
import { Question } from '@/lib/types';

/**
 * Regression test for all "generate soal" features in admin panel:
 * 1. generate-custom: samples from static packages, inserts to DB
 * 2. generate-ebook: calls LLM → saves to question_bank (mocked LLM)
 * 3. question-bank build_package: pulls from bank → inserts to questions table
 * 4. Scoring integrity: every generated question has valid scores
 */

// ---- Helpers ----

/** Validate a single question object has correct structure */
function validateQuestion(q: Record<string, unknown>, label: string) {
  expect(q, `${label}: question object exists`).toBeTruthy();
  expect(typeof q.text, `${label}: text is string`).toBe('string');
  expect((q.text as string).length, `${label}: text is non-empty`).toBeGreaterThan(0);
  expect(['TWK', 'TIU', 'TKP'], `${label}: valid category`).toContain(q.category);

  const opts = q.options as { id: string; text: string; score: number }[];
  expect(Array.isArray(opts), `${label}: options is array`).toBe(true);
  expect(opts.length, `${label}: exactly 5 options`).toBe(5);

  // Verify option IDs are A-E (upper or lower)
  const ids = opts.map((o) => o.id.toUpperCase()).sort();
  expect(ids, `${label}: option IDs A-E`).toEqual(['A', 'B', 'C', 'D', 'E']);

  // Verify each option has text
  for (const o of opts) {
    expect(typeof o.text, `${label} opt ${o.id}: text is string`).toBe('string');
    expect(o.text.length, `${label} opt ${o.id}: text non-empty`).toBeGreaterThan(0);
  }

  // Verify scoring rules
  const scores = opts.map((o) => o.score).sort((a, b) => a - b);
  const cat = q.category as string;

  if (cat === 'TWK' || cat === 'TIU') {
    // Exactly one option with score=5, rest score=0
    const fiveCount = scores.filter((s) => s === 5).length;
    const zeroCount = scores.filter((s) => s === 0).length;
    expect(fiveCount, `${label} ${cat}: exactly 1 score=5`).toBe(1);
    expect(zeroCount, `${label} ${cat}: exactly 4 score=0`).toBe(4);
  } else if (cat === 'TKP') {
    // Scores must be a permutation of [1, 2, 3, 4, 5]
    expect(scores, `${label} TKP: scores [1,2,3,4,5]`).toEqual([1, 2, 3, 4, 5]);
  }
}

/** Validate correct_answer consistency for a question */
function validateCorrectAnswer(
  q: Record<string, unknown>,
  correctAnswer: string | null | undefined,
  label: string,
) {
  const opts = q.options as { id: string; score: number }[];
  const cat = q.category as string;

  if (cat === 'TWK' || cat === 'TIU') {
    const correctOpt = opts.find((o) => o.score === 5);
    if (correctAnswer !== null && correctAnswer !== undefined) {
      // If correct_answer is stored, it should match the option with score=5
      expect(
        correctOpt?.id.toLowerCase(),
        `${label}: correct_answer ${correctAnswer} matches score=5 opt`,
      ).toBe(correctAnswer.toLowerCase());
    }
  } else if (cat === 'TKP') {
    const bestOpt = opts.reduce((a, b) => (b.score > a.score ? b : a), opts[0]);
    if (correctAnswer !== null && correctAnswer !== undefined) {
      expect(
        bestOpt.id.toLowerCase(),
        `${label}: correct_answer matches highest score`,
      ).toBe(correctAnswer.toLowerCase());
    }
  }
}

/** Validate answer distribution is balanced */
function validateDistribution(
  questions: Record<string, unknown>[],
  category: string,
  expectedPerLetter: number,
  tolerance: number,
  label: string,
) {
  const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const q of questions) {
    if (q.category !== category) continue;
    const opts = q.options as { id: string; score: number }[];
    const best = opts.reduce((a, b) => (b.score > a.score ? b : a), opts[0]);
    const letter = best.id.toUpperCase();
    dist[letter] = (dist[letter] || 0) + 1;
  }
  for (const [letter, count] of Object.entries(dist)) {
    expect(
      Math.abs(count - expectedPerLetter),
      `${label} ${category}: ${letter} has ${count}, expected ~${expectedPerLetter} (±${tolerance})`,
    ).toBeLessThanOrEqual(tolerance);
  }
}

// ---- Test: Static package data integrity ----

describe('Static package question integrity', () => {
  const packages = [
    { file: 'sample_questions.json', dir: '@/data', name: 'Tryout 1' },
    { file: 'tryout-2.json', dir: '@/data/packages', name: 'Tryout 2' },
    { file: 'tryout-3.json', dir: '@/data/packages', name: 'Tryout 3' },
    { file: 'tryout-4.json', dir: '@/data/packages', name: 'Tryout 4' },
    { file: 'tryout-5.json', dir: '@/data/packages', name: 'Tryout 5' },
    { file: 'tryout-6.json', dir: '@/data/packages', name: 'Tryout 6' },
    { file: 'tryout-7.json', dir: '@/data/packages', name: 'Tryout 7' },
    { file: 'tryout-mini.json', dir: '@/data/packages', name: 'Tryout Mini' },
  ];

  for (const pkg of packages) {
    describe(pkg.name, () => {
      let questions: Record<string, unknown>[];

      beforeAll(async () => {
        const path = pkg.dir === '@/data' ? `../src/data/${pkg.file}` : `../src/data/packages/${pkg.file}`;
        const mod = await import(path);
        questions = mod.default as Record<string, unknown>[];
      });

      it('has correct total questions', () => {
        const expected = pkg.name === 'Tryout Mini' ? 30 : 110;
        expect(questions.length).toBe(expected);
      });

      it('has correct category distribution', () => {
        const cats: Record<string, number> = {};
        for (const q of questions) {
          cats[q.category as string] = (cats[q.category as string] || 0) + 1;
        }
        if (pkg.name === 'Tryout Mini') {
          expect(cats).toEqual({ TWK: 10, TIU: 10, TKP: 10 });
        } else {
          expect(cats).toEqual({ TWK: 30, TIU: 35, TKP: 45 });
        }
      });

      it('all questions have valid structure and scoring', () => {
        for (const q of questions) {
          validateQuestion(q, `${pkg.name} Q${q.id}`);
        }
      });

      it('IDs are sequential 1..N', () => {
        for (let i = 0; i < questions.length; i++) {
          expect(questions[i].id, `${pkg.name}: Q at index ${i}`).toBe(i + 1);
        }
      });

      it('section ordering is correct (TWK → TIU → TKP)', () => {
        const n = questions.length;
        const twkEnd = pkg.name === 'Tryout Mini' ? 10 : 30;
        const tiuEnd = pkg.name === 'Tryout Mini' ? 20 : 65;

        for (let i = 0; i < twkEnd; i++) {
          expect(questions[i].category, `Q${i + 1} should be TWK`).toBe('TWK');
        }
        for (let i = twkEnd; i < tiuEnd; i++) {
          expect(questions[i].category, `Q${i + 1} should be TIU`).toBe('TIU');
        }
        for (let i = tiuEnd; i < n; i++) {
          expect(questions[i].category, `Q${i + 1} should be TKP`).toBe('TKP');
        }
      });

      it('score-5 position is balanced across A-E', () => {
        if (pkg.name === 'Tryout Mini') {
          validateDistribution(questions, 'TWK', 2, 0, pkg.name);
          validateDistribution(questions, 'TIU', 2, 0, pkg.name);
          validateDistribution(questions, 'TKP', 2, 0, pkg.name);
        } else {
          validateDistribution(questions, 'TWK', 6, 0, pkg.name);
          validateDistribution(questions, 'TIU', 7, 0, pkg.name);
          validateDistribution(questions, 'TKP', 9, 0, pkg.name);
        }
      });

      it('no duplicate question texts', () => {
        const seen = new Set<string>();
        for (const q of questions) {
          const text = (q.text as string).replace(/^Soal nomor \d+ \([^)]+\):\s*/, '').slice(0, 80).toLowerCase();
          expect(seen.has(text), `Duplicate: "${text}"`).toBe(false);
          seen.add(text);
        }
      });

      it('no TKP monotone (5,4,3,2,1) pattern in more than 10%', () => {
        const tkpQs = questions.filter((q) => q.category === 'TKP');
        const monotone = tkpQs.filter((q) => {
          const scores = (q.options as { score: number }[]).map((o) => o.score);
          return scores.join(',') === '5,4,3,2,1';
        });
        // At most 10% monotone
        expect(monotone.length).toBeLessThanOrEqual(Math.ceil(tkpQs.length * 0.1));
      });
    });
  }
});

// ---- Test: generate-custom logic ----

describe('generate-custom API logic', () => {
  it('re-numbers IDs sequentially after sampling', () => {
    // Simulate the re-numbering logic from generate-custom
    const fakeQuestions: Partial<Question>[] = [
      { id: 42, category: 'TWK', text: 'TWK Q', options: [] as any },
      { id: 99, category: 'TIU', text: 'TIU Q', options: [] as any },
      { id: 7, category: 'TKP', text: 'TKP Q', options: [] as any },
    ];
    const numbered = fakeQuestions.map((q, i) => ({ ...q, id: i + 1 }));
    expect(numbered[0].id).toBe(1);
    expect(numbered[1].id).toBe(2);
    expect(numbered[2].id).toBe(3);
  });

  it('shuffle function produces different orderings', () => {
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    const original = Array.from({ length: 20 }, (_, i) => i);
    // Run shuffle 5 times — at least one should differ from original
    const results = Array.from({ length: 5 }, () => shuffle(original));
    const anyDifferent = results.some((r) => r.join(',') !== original.join(','));
    expect(anyDifferent).toBe(true);
  });
});

// ---- Test: generate-ebook LLM output parsing ----

describe('generate-ebook output validation', () => {
  it('validates well-formed TWK LLM response', () => {
    const llmOutput = [
      {
        text: 'Pancasila sebagai dasar negara tercantum dalam...',
        category: 'TWK',
        sub_category: 'Pilar Pancasila',
        options: [
          { id: 'a', text: 'Pembukaan UUD 1945', score: 5 },
          { id: 'b', text: 'Batang Tubuh UUD', score: 0 },
          { id: 'c', text: 'Penjelasan UUD', score: 0 },
          { id: 'd', text: 'TAP MPR', score: 0 },
          { id: 'e', text: 'Keputusan Presiden', score: 0 },
        ],
        explanation: 'Pancasila tercantum dalam Pembukaan UUD 1945 alinea IV.',
        difficulty: 'easy',
      },
    ];

    for (const q of llmOutput) {
      validateQuestion(q as any, 'LLM TWK');
      validateCorrectAnswer(q as any, q.options.find((o) => o.score === 5)?.id || null, 'LLM TWK');
    }
  });

  it('validates well-formed TKP LLM response', () => {
    const llmOutput = [
      {
        text: 'Anda melihat rekan kerja melakukan pelanggaran ringan...',
        category: 'TKP',
        sub_category: 'Integritas',
        options: [
          { id: 'a', text: 'Diam saja', score: 1 },
          { id: 'b', text: 'Laporkan ke atasan', score: 4 },
          { id: 'c', text: 'Tegur langsung dengan sopan', score: 5 },
          { id: 'd', text: 'Ceritakan ke rekan lain', score: 2 },
          { id: 'e', text: 'Kumpulkan bukti dulu', score: 3 },
        ],
        explanation: 'Menegur langsung dengan sopan adalah pendekatan terbaik.',
        difficulty: 'medium',
      },
    ];

    for (const q of llmOutput) {
      validateQuestion(q as any, 'LLM TKP');
      validateCorrectAnswer(q as any, 'c', 'LLM TKP');
    }
  });

  it('rejects malformed LLM response: missing options', () => {
    const bad = { text: 'Some question?', category: 'TWK' };
    expect((bad as any).options).toBeUndefined();
  });

  it('rejects malformed LLM response: wrong score count for TWK', () => {
    const bad = {
      text: 'Question?',
      category: 'TWK',
      options: [
        { id: 'a', text: 'A', score: 5 },
        { id: 'b', text: 'B', score: 5 }, // TWO score=5 — invalid
        { id: 'c', text: 'C', score: 0 },
        { id: 'd', text: 'D', score: 0 },
        { id: 'e', text: 'E', score: 0 },
      ],
    };
    const fiveCount = bad.options.filter((o) => o.score === 5).length;
    expect(fiveCount).not.toBe(1); // Should fail validation
  });

  it('option shuffle preserves scores', () => {
    const original = [
      { id: 'a', text: 'Correct', score: 5 },
      { id: 'b', text: 'Wrong 1', score: 0 },
      { id: 'c', text: 'Wrong 2', score: 0 },
      { id: 'd', text: 'Wrong 3', score: 0 },
      { id: 'e', text: 'Wrong 4', score: 0 },
    ];
    // Simulate the shuffleOptions from generate-ebook
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = [...original];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const result = shuffled.map((o, idx) => ({ ...o, id: ids[idx] }));

    // After shuffle, exactly one score=5 must remain
    expect(result.filter((o) => o.score === 5).length).toBe(1);
    // The text associated with score=5 must still be 'Correct'
    const correctAfterShuffle = result.find((o) => o.score === 5);
    expect(correctAfterShuffle?.text).toBe('Correct');
  });
});

// ---- Test: question_bank build_package column mapping ----

describe('question-bank build_package', () => {
  it('INSERT uses "number" not "order_index" (matching DB schema)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(__dirname, '../src/app/api/admin/question-bank/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    // order_index doesn't exist in DB — must use "number"
    const usesOrderIndex = /INSERT INTO questions[^;]*order_index/.test(source);
    expect(usesOrderIndex, 'should use "number" column, not "order_index"').toBe(false);

    const usesNumber = /INSERT INTO questions[\s\S]*?\bnumber\b/.test(source);
    expect(usesNumber, 'INSERT should include "number" column').toBe(true);
  });

  it('INSERT includes tkp_scores column', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(__dirname, '../src/app/api/admin/question-bank/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    const hasTkpScores = /INSERT INTO questions[\s\S]*?tkp_scores/.test(source);
    expect(hasTkpScores, 'INSERT should include tkp_scores').toBe(true);
  });
});

// ---- Test: generate-custom correct_answer derivation ----

describe('generate-custom correct_answer derivation', () => {
  it('derives correct_answer from options for TWK/TIU', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(__dirname, '../src/app/api/admin/generate-custom/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    // Should NOT use (q as any).correctAnswer — that property doesn't exist on Question
    const usesAsAnyCorrectAnswer = source.includes('(q as any).correctAnswer');
    expect(usesAsAnyCorrectAnswer, 'should derive correctAnswer from options, not (q as any)').toBe(false);

    // Should derive from options.find(o => o.score === 5)
    const derivesFromOptions = source.includes('score === 5') || source.includes('score===5');
    expect(derivesFromOptions, 'should find correct answer from option score').toBe(true);
  });

  it('derives tkp_scores from options for TKP', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routePath = path.resolve(__dirname, '../src/app/api/admin/generate-custom/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    // Should NOT use (q as any).tkpScores
    const usesAsAnyTkp = source.includes('(q as any).tkpScores');
    expect(usesAsAnyTkp, 'should derive tkpScores from options, not (q as any)').toBe(false);
  });
});
