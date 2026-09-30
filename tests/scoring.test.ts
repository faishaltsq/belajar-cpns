import { describe, it, expect } from 'vitest';
import { calculateExamScore, PASSING_GRADES, MAX_SCORES, QUESTION_LIMITS } from '../src/lib/scoring';
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
    expect(result.twk.answeredCount).toBe(1);
    expect(result.tiu.answeredCount).toBe(1);
    expect(result.tkp.answeredCount).toBe(1);
    expect(result.isPassedAll).toBe(true); // proportional PG with 1 soal each is very low; all pass
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
    expect(result.twk.answeredCount).toBe(1);
    expect(result.tiu.answeredCount).toBe(0);
    expect(result.tkp.answeredCount).toBe(1);
    expect(result.isPassedAll).toBe(false);
  });

  it('evaluates passing grade and constants accurately', () => {
    expect(PASSING_GRADES.TWK).toBe(65);
    expect(PASSING_GRADES.TIU).toBe(80);
    expect(PASSING_GRADES.TKP).toBe(166);
    expect(MAX_SCORES.TWK).toBe(150);
    expect(MAX_SCORES.TIU).toBe(175);
    expect(MAX_SCORES.TKP).toBe(225);
    expect(MAX_SCORES.TOTAL).toBe(550);
    expect(QUESTION_LIMITS.TWK).toBe(30);
    expect(QUESTION_LIMITS.TIU).toBe(35);
    expect(QUESTION_LIMITS.TKP).toBe(45);
    expect(QUESTION_LIMITS.TOTAL).toBe(110);
  });

  it('handles empty answers array', () => {
    const result = calculateExamScore(dummyQuestions, [], 0);
    expect(result.twk.score).toBe(0);
    expect(result.tiu.score).toBe(0);
    expect(result.tkp.score).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.twk.answeredCount).toBe(0);
    expect(result.tiu.answeredCount).toBe(0);
    expect(result.tkp.answeredCount).toBe(0);
    expect(result.isPassedAll).toBe(false);
  });

  it('handles all answers null', () => {
    const answers: ExamAnswer[] = [
      { questionId: 1, selectedOptionId: null },
      { questionId: 2, selectedOptionId: null },
      { questionId: 3, selectedOptionId: null },
    ];
    const result = calculateExamScore(dummyQuestions, answers, 0);
    expect(result.twk.score).toBe(0);
    expect(result.tiu.score).toBe(0);
    expect(result.tkp.score).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.twk.answeredCount).toBe(0);
    expect(result.tiu.answeredCount).toBe(0);
    expect(result.tkp.answeredCount).toBe(0);
    expect(result.isPassedAll).toBe(false);
  });
});
