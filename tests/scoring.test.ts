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

  describe('Official 110-Question Passing Grade Boundary (Kepmen PANRB 321/2024)', () => {
    // Generate standard 110 questions
    const standardQuestions: Question[] = [
      ...Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        category: 'TWK' as const,
        subCategory: 'TWK',
        text: `TWK ${i + 1}`,
        options: [{ id: 'A', text: 'Benar', score: 5 }, { id: 'B', text: 'Salah', score: 0 }],
        explanation: 'Exp',
      })),
      ...Array.from({ length: 35 }, (_, i) => ({
        id: i + 31,
        category: 'TIU' as const,
        subCategory: 'TIU',
        text: `TIU ${i + 1}`,
        options: [{ id: 'A', text: 'Benar', score: 5 }, { id: 'B', text: 'Salah', score: 0 }],
        explanation: 'Exp',
      })),
      ...Array.from({ length: 45 }, (_, i) => ({
        id: i + 66,
        category: 'TKP' as const,
        subCategory: 'TKP',
        text: `TKP ${i + 1}`,
        options: [
          { id: 'A', text: 'Opt 5', score: 5 },
          { id: 'B', text: 'Opt 4', score: 4 },
          { id: 'C', text: 'Opt 3', score: 3 },
          { id: 'D', text: 'Opt 2', score: 2 },
          { id: 'E', text: 'Opt 1', score: 1 },
        ],
        explanation: 'Exp',
      })),
    ];

    it('passes when exact passing grade reached (TWK:65, TIU:80, TKP:166)', () => {
      // TWK: 13 benar * 5 = 65
      // TIU: 16 benar * 5 = 80
      // TKP: 31 * 5 + 2 * 4 + 1 * 3 = 155 + 8 + 3 = 166 (sisa 11 soal skor 0/tidak jawab)
      const answers: ExamAnswer[] = [
        ...Array.from({ length: 13 }, (_, i) => ({ questionId: i + 1, selectedOptionId: 'A' })),
        ...Array.from({ length: 16 }, (_, i) => ({ questionId: i + 31, selectedOptionId: 'A' })),
        ...Array.from({ length: 31 }, (_, i) => ({ questionId: i + 66, selectedOptionId: 'A' })), // 31 * 5 = 155
        { questionId: 66 + 31, selectedOptionId: 'B' }, // 4 -> 159
        { questionId: 66 + 32, selectedOptionId: 'B' }, // 4 -> 163
        { questionId: 66 + 33, selectedOptionId: 'C' }, // 3 -> 166
      ];

      const result = calculateExamScore(standardQuestions, answers, 6000);
      expect(result.twk.score).toBe(65);
      expect(result.tiu.score).toBe(80);
      expect(result.tkp.score).toBe(166);
      expect(result.twk.isPassed).toBe(true);
      expect(result.tiu.isPassed).toBe(true);
      expect(result.tkp.isPassed).toBe(true);
      expect(result.isPassedAll).toBe(true);
    });

    it('fails when TWK is 1 point below passing grade (60 vs 65)', () => {
      // TWK: 12 benar * 5 = 60 (< 65)
      // TIU: 16 benar * 5 = 80
      // TKP: 166
      const answers: ExamAnswer[] = [
        ...Array.from({ length: 12 }, (_, i) => ({ questionId: i + 1, selectedOptionId: 'A' })),
        ...Array.from({ length: 16 }, (_, i) => ({ questionId: i + 31, selectedOptionId: 'A' })),
        ...Array.from({ length: 31 }, (_, i) => ({ questionId: i + 66, selectedOptionId: 'A' })),
        { questionId: 66 + 31, selectedOptionId: 'B' },
        { questionId: 66 + 32, selectedOptionId: 'B' },
        { questionId: 66 + 33, selectedOptionId: 'C' },
      ];

      const result = calculateExamScore(standardQuestions, answers, 6000);
      expect(result.twk.score).toBe(60);
      expect(result.twk.isPassed).toBe(false);
      expect(result.tiu.isPassed).toBe(true);
      expect(result.tkp.isPassed).toBe(true);
      expect(result.isPassedAll).toBe(false);
    });
  });
});
