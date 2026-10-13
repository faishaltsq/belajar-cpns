import { describe, it, expect } from 'vitest';
import { getQuestionSections } from '../src/lib/questionSections';
import { Question, ExamAnswer } from '../src/lib/types';

describe('Question Navigation Modal Helper Logic', () => {
  const dummyQuestions: Question[] = [
    { id: 1, text: 'Soal 1', category: 'TWK', subCategory: 'Nasionalisme', options: [] },
    { id: 2, text: 'Soal 2', category: 'TWK', subCategory: 'Integritas', options: [] },
    { id: 3, text: 'Soal 3', category: 'TIU', subCategory: 'Deret', options: [] },
    { id: 4, text: 'Soal 4', category: 'TKP', subCategory: 'Pelayanan Publik', options: [] },
  ];

  it('correctly maps sections and answered statuses', () => {
    const answers = new Map<number, ExamAnswer>();
    answers.set(1, { questionId: 1, selectedOptionId: 'A', isFlagged: false });
    answers.set(2, { questionId: 2, selectedOptionId: null, isFlagged: true });

    const sections = getQuestionSections(dummyQuestions, answers);
    expect(sections.length).toBe(3);
    expect(sections[0].category).toBe('TWK');
    expect(sections[0].totalCount).toBe(2);
    expect(sections[0].answeredCount).toBe(1);

    expect(sections[1].category).toBe('TIU');
    expect(sections[1].totalCount).toBe(1);
    expect(sections[1].answeredCount).toBe(0);

    expect(sections[2].category).toBe('TKP');
    expect(sections[2].totalCount).toBe(1);
    expect(sections[2].answeredCount).toBe(0);
  });
});
