import { describe, it, expect } from 'vitest';
import { calculateExamScore, PASSING_GRADES } from '../src/lib/scoring';
import { Question, ExamAnswer } from '../src/lib/types';

describe('CAT Scoring Engine (Kepmen PANRB 321/2024)', () => {
  const dummyQuestions: Question[] = [
    { id: 1, category: 'TWK', subCategory: 'Pancasila', text: 'Apa sila pertama?',
      options: [{ id: 'A', text: 'Ketuhanan Yang Maha Esa', score: 5 }, { id: 'B', text: 'Kemanusiaan', score: 0 }],
      explanation: 'Sila ke-1 adalah Ketuhanan YME' },
    { id: 2, category: 'TIU', subCategory: 'Numerik', text: '2 + 2 = ?',
      options: [{ id: 'A', text: '4', score: 5 }, { id: 'B', text: '5', score: 0 }],
      explanation: '2+2 = 4' },
    { id: 3, category: 'TKP', subCategory: 'Pelayanan Publik', text: 'Ada tamu mengantre lama...',
      options: [{ id: 'A', text: 'Menyapa dan melayani segera', score: 5 }, { id: 'B', text: 'Menyuruh menunggu', score: 3 }, { id: 'C', text: 'Mengabaikan', score: 1 }],
      explanation: 'Opsi A nilai 5 paling melayani' },
  ];

  it('calculates perfect score correctly', () => {
    const answers: ExamAnswer[] = [
      { questionId: 1, selectedOptionId: 'A' },
      { questionId: 2, selectedOptionId: 'A' },
      { questionId: 3, selectedOptionId: 'A' },
    ];
    const result = calculateExamScore(dummyQuestions, answers, 1800);
    expect(result.twk.score).toBe(5);
    expect(result.tiu.score).toBe(5);
    expect(result.tkp.score).toBe(5);
    expect(result.totalScore).toBe(15);
  });

  it('calculates zero/wrong scores correctly for TWK and TIU', () => {
    const answers: ExamAnswer[] = [
      { questionId: 1, selectedOptionId: 'B' },
      { questionId: 2, selectedOptionId: null },
      { questionId: 3, selectedOptionId: 'C' },
    ];
    const result = calculateExamScore(dummyQuestions, answers, 1800);
    expect(result.twk.score).toBe(0);
    expect(result.tiu.score).toBe(0);
    expect(result.tkp.score).toBe(1);
    expect(result.totalScore).toBe(1);
  });

  it('evaluates passing grade accurately', () => {
    expect(PASSING_GRADES.TWK).toBe(65);
    expect(PASSING_GRADES.TIU).toBe(80);
    expect(PASSING_GRADES.TKP).toBe(166);
  });
});
