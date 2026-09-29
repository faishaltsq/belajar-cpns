import { describe, it, expect } from 'vitest';
import { ExamAnswer } from '../src/lib/types';

describe('Exam Local State Management', () => {
  it('updates answer and toggles flag correctly', () => {
    const answers = new Map<number, ExamAnswer>();
    answers.set(1, { questionId: 1, selectedOptionId: 'A', isFlagged: false });
    expect(answers.get(1)?.selectedOptionId).toBe('A');

    const current = answers.get(1)!;
    answers.set(1, { ...current, isFlagged: !current.isFlagged });
    expect(answers.get(1)?.isFlagged).toBe(true);
  });

  it('calculates counts correctly', () => {
    const answers = new Map<number, ExamAnswer>();
    answers.set(1, { questionId: 1, selectedOptionId: 'A', isFlagged: false });
    answers.set(2, { questionId: 2, selectedOptionId: null, isFlagged: true });
    answers.set(3, { questionId: 3, selectedOptionId: 'B', isFlagged: true });

    let answered = 0;
    let flagged = 0;
    answers.forEach((ans) => {
      if (ans.selectedOptionId != null && ans.selectedOptionId !== '') answered++;
      if (ans.isFlagged) flagged++;
    });

    expect(answered).toBe(2);
    expect(flagged).toBe(2);
  });
});
