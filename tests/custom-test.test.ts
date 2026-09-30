import { describe, it, expect } from 'vitest';
import { calculateExamScore } from '@/lib/scoring';
import { Question, ExamAnswer } from '@/lib/types';

function makeQ(id: number, category: 'TWK' | 'TIU' | 'TKP', score = 5): Question {
  return {
    id,
    category,
    subCategory: 'Test',
    text: `Soal ${id}`,
    image: id % 3 === 0 ? `/images/questions/q${id}.png` : undefined,
    options: [
      { id: 'A', text: 'Opt A', score },
      { id: 'B', text: 'Opt B', score: 0 },
    ],
    explanation: 'Exp',
  };
}

describe('Custom Test & Image Schema', () => {
  it('Question and Option support optional image field', () => {
    const q: Question = makeQ(1, 'TIU', 5);
    expect(q.image).toBeUndefined();
    const qImg: Question = { ...q, image: '/images/questions/figural-1.png', options: [{ ...q.options[0], image: '/images/questions/opt-a.png' }] };
    expect(qImg.image).toBe('/images/questions/figural-1.png');
    expect(qImg.options[0].image).toBe('/images/questions/opt-a.png');
  });

  it('calculates proportional maxScore for 30-question custom test', () => {
    const qs: Question[] = [
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 1, 'TWK')),
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 11, 'TIU')),
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 21, 'TKP')),
    ];
    const answers: ExamAnswer[] = qs.map((q) => ({ questionId: q.id, selectedOptionId: 'A' }));
    const result = calculateExamScore(qs, answers, 1800);

    expect(result.twk.totalQuestions).toBe(10);
    expect(result.tiu.totalQuestions).toBe(10);
    expect(result.tkp.totalQuestions).toBe(10);
    expect(result.twk.maxScore).toBe(50);
    expect(result.tiu.maxScore).toBe(50);
    expect(result.tkp.maxScore).toBe(50);
    expect(result.totalScore).toBe(150);
  });

  it('isPassedAll true when all categories above proportional PG', () => {
    const qs: Question[] = [
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 1, 'TWK')),
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 11, 'TIU')),
      ...Array.from({ length: 10 }, (_, i) => makeQ(i + 21, 'TKP')),
    ];
    const answers: ExamAnswer[] = qs.map((q) => ({ questionId: q.id, selectedOptionId: 'A' }));
    const result = calculateExamScore(qs, answers, 1800);
    // 10 * 5 = 50 per category. PG TWK = round(0.433*50)=22. PG TIU = round(0.457*50)=23. PG TKP = round(0.738*50)=37. All score 50 > PG.
    expect(result.isPassedAll).toBe(true);
  });

  it('standard 110-question test uses exact official PG', () => {
    const qs: Question[] = [
      ...Array.from({ length: 30 }, (_, i) => makeQ(i + 1, 'TWK')),
      ...Array.from({ length: 35 }, (_, i) => makeQ(i + 31, 'TIU')),
      ...Array.from({ length: 45 }, (_, i) => makeQ(i + 66, 'TKP')),
    ];
    const answers: ExamAnswer[] = qs.map((q) => ({ questionId: q.id, selectedOptionId: 'B' })); // all wrong
    const result = calculateExamScore(qs, answers, 6000);
    expect(result.twk.passingGrade).toBe(65);
    expect(result.tiu.passingGrade).toBe(80);
    expect(result.tkp.passingGrade).toBe(166);
    expect(result.twk.maxScore).toBe(150);
    expect(result.tiu.maxScore).toBe(175);
    expect(result.tkp.maxScore).toBe(225);
  });
});
