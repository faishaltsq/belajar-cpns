// tests/wrong-answer-recap.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateWrongAnswers, groupByCategory } from '@/lib/wrongAnswerRecap';

type Opt = { id: string; score: number };

// Grade from options[].score, exactly as diagnostic.ts:38-50 and
// ExamQuestionReview.tsx:52-53 do. tryout-1..6 ship with correct_answer = null,
// so correct_answer alone would return zero items for them (Finding 8).
const mk = (packageId: string, number: number, category: string,
            correctAnswer: string | null, explanation: string | null,
            scores?: Record<string, number>) => {
  const options: Opt[] = Object.entries(scores ?? {}).map(([id, score]) => ({ id, score }));
  return { packageId, number, category, correctAnswer, explanation, options };
};

const Q = [
  // has correct_answer
  mk('tryout-10', 1, 'TWK', 'A', 'e1', { A: 5, B: 0, C: 0, D: 0, E: 0 }),
  mk('tryout-10', 2, 'TIU', 'B', 'e2', { A: 0, B: 5, C: 0, D: 0, E: 0 }),
  // TKP: correct_answer null, best option carries the max score
  mk('tryout-10', 3, 'TKP', null, 'e3', { A: 5, B: 4, C: 3, D: 2, E: 1 }),
  mk('tryout-10', 4, 'TWK', 'C', 'e4', { A: 0, B: 0, C: 5, D: 0, E: 0 }),
  // correct_answer null AND tied max score — ungradeable, must be skipped
  mk('tryout-4', 1, 'TWK', null, 'e5', { A: 0, B: 0, C: 0, D: 0, E: 0 }),
  // correct_answer present but options carry no score (tryout-figural) — still gradeable
  mk('tryout-figural', 1, 'TWK', 'D', 'e6', { A: 0, B: 0, C: 0, D: 0, E: 0 }),
];

describe('aggregateWrongAnswers', () => {
  it('keeps only answered questions where the chosen option is not the best', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'A', '2': 'B', '4': 'C' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('records wrong answers with the best-scoring option as correct', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'D', '2': 'C', '4': 'C' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ number: 1, yourAnswer: 'D', correctAnswer: 'A', category: 'TWK' });
    expect(items[1]).toMatchObject({ number: 2, yourAnswer: 'C', correctAnswer: 'B' });
  });

  it('grades TKP rows from options when correct_answer is null', () => {
    const results = [{ packageId: 'tryout-10', answers: { '3': 'E' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ category: 'TKP', correctAnswer: 'A', yourAnswer: 'E' });
  });

  it('accepts a full-score TKP answer when correct_answer is null', () => {
    const results = [{ packageId: 'tryout-10', answers: { '3': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('skips questions that are genuinely ungradeable (null correct_answer, no score)', () => {
    const results = [{ packageId: 'tryout-4', answers: { '1': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('falls back to correct_answer when options carry no score (tryout-figural)', () => {
    const results = [{ packageId: 'tryout-figural', answers: { '1': 'A' } }];
    const items = aggregateWrongAnswers(results, Q);
    expect(items).toHaveLength(1);
    expect(items[0].correctAnswer).toBe('D');
  });

  it('ignores questions with no recorded answer', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'A' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('ignores answers for questions that do not exist', () => {
    const results = [{ packageId: 'tryout-10', answers: { '99': 'Z' } }];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(0);
  });

  it('deduplicates repeat attempts of the same question, keeping it wrong once', () => {
    const results = [
      { packageId: 'tryout-10', answers: { '1': 'D' } },
      { packageId: 'tryout-10', answers: { '1': 'D' } },
    ];
    expect(aggregateWrongAnswers(results, Q)).toHaveLength(1);
  });
});

describe('groupByCategory', () => {
  it('partitions into TWK/TIU/TKP buckets', () => {
    const results = [{ packageId: 'tryout-10', answers: { '1': 'D', '2': 'C' } }];
    const grouped = groupByCategory(aggregateWrongAnswers(results, Q));
    expect(grouped.TWK).toHaveLength(1);
    expect(grouped.TIU).toHaveLength(1);
    expect(grouped.TKP).toHaveLength(0);
  });

  it('returns all three keys even when empty', () => {
    const grouped = groupByCategory([]);
    expect(Object.keys(grouped).sort()).toEqual(['TIU', 'TKP', 'TWK']);
  });
});
