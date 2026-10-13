import { describe, it, expect } from 'vitest';
import questions from '../src/data/psikotes_penalaran.json';

describe('psikotes_penalaran dataset', () => {
  it('contains at least 45 verified questions', () => {
    expect(questions.length).toBeGreaterThanOrEqual(45);
  });

  it('every question has valid structure, options, exactly one correct answer, and explanation', () => {
    questions.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.category).toMatch(/deret|silogisme|spasial/);
      expect(q.questionText).toBeTruthy();
      expect(q.options).toHaveLength(5);
      const correctOpts = q.options.filter((o: any) => o.score === 1);
      expect(correctOpts).toHaveLength(1);
      expect(q.explanation).toBeTruthy();
    });
  });
});
