import { describe, it, expect } from 'vitest';
import { shuffleWithinSections, getQuestionSections } from '@/lib/questionSections';
import { Question, ExamAnswer } from '@/lib/types';

describe('shuffleWithinSections', () => {
  it('preserves section order TWK→TIU→TKP even after shuffling', () => {
    const mockQuestions = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, category: 'TWK' as const })),
      ...Array.from({ length: 35 }, (_, i) => ({ id: i + 31, category: 'TIU' as const })),
      ...Array.from({ length: 45 }, (_, i) => ({ id: i + 66, category: 'TKP' as const })),
    ] as Question[];

    const shuffled = shuffleWithinSections(mockQuestions);

    expect(shuffled.length).toBe(110);
    // Boundary checks: questions 0..29 are all TWK
    expect(shuffled.slice(0, 30).every((q) => q.category === 'TWK')).toBe(true);
    // Boundary checks: questions 30..64 are all TIU
    expect(shuffled.slice(30, 65).every((q) => q.category === 'TIU')).toBe(true);
    // Boundary checks: questions 65..109 are all TKP
    expect(shuffled.slice(65, 110).every((q) => q.category === 'TKP')).toBe(true);

    // All original question IDs must exist without duplication
    const originalIds = mockQuestions.map((q) => q.id).sort((a, b) => a - b);
    const shuffledIds = shuffled.map((q) => q.id).sort((a, b) => a - b);
    expect(shuffledIds).toEqual(originalIds);
  });

  it('handles empty questions array gracefully', () => {
    expect(shuffleWithinSections([])).toEqual([]);
  });
});

describe('getQuestionSections', () => {
  it('calculates dynamic ranges and answered count for 110 questions', () => {
    const mockQuestions: Partial<Question>[] = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, category: 'TWK' as const })),
      ...Array.from({ length: 35 }, (_, i) => ({ id: i + 31, category: 'TIU' as const })),
      ...Array.from({ length: 45 }, (_, i) => ({ id: i + 66, category: 'TKP' as const })),
    ];

    const mockAnswers = new Map<number, ExamAnswer>([
      [1, { questionId: 1, selectedOptionId: 'A' }],
      [2, { questionId: 2, selectedOptionId: 'B' }],
      [31, { questionId: 31, selectedOptionId: 'C' }],
    ]);

    const sections = getQuestionSections(mockQuestions as Question[], mockAnswers);

    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({
      category: 'TWK',
      startIndex: 0,
      endIndex: 29,
      startNumber: 1,
      endNumber: 30,
      totalCount: 30,
      answeredCount: 2,
    });
    expect(sections[1]).toEqual({
      category: 'TIU',
      startIndex: 30,
      endIndex: 64,
      startNumber: 31,
      endNumber: 65,
      totalCount: 35,
      answeredCount: 1,
    });
    expect(sections[2]).toEqual({
      category: 'TKP',
      startIndex: 65,
      endIndex: 109,
      startNumber: 66,
      endNumber: 110,
      totalCount: 45,
      answeredCount: 0,
    });
  });

  it('handles Tryout Mini (30 questions: 10 TWK, 10 TIU, 10 TKP) dynamically', () => {
    const mockMini: Partial<Question>[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: i + 1, category: 'TWK' as const })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: i + 11, category: 'TIU' as const })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: i + 21, category: 'TKP' as const })),
    ];

    const sections = getQuestionSections(mockMini as Question[], new Map());

    expect(sections).toHaveLength(3);
    expect(sections[0].startNumber).toBe(1);
    expect(sections[0].endNumber).toBe(10);
    expect(sections[1].startNumber).toBe(11);
    expect(sections[1].endNumber).toBe(20);
    expect(sections[2].startNumber).toBe(21);
    expect(sections[2].endNumber).toBe(30);
  });

  it('handles empty questions list', () => {
    const sections = getQuestionSections([], new Map());
    expect(sections).toEqual([]);
  });
});
