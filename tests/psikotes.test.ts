import { describe, it, expect } from 'vitest';
import {
  getPairSumLastDigit,
  generateKraepelinColumn,
  evaluateKraepelinResults,
} from '../src/lib/psikotes';
import type { KraepelinInput } from '../src/lib/types';

describe('getPairSumLastDigit', () => {
  it('returns last digit of sum', () => {
    expect(getPairSumLastDigit(7, 8)).toBe(5); // 15 % 10
    expect(getPairSumLastDigit(9, 9)).toBe(8); // 18 % 10
    expect(getPairSumLastDigit(2, 3)).toBe(5); // 5 % 10
    expect(getPairSumLastDigit(0, 0)).toBe(0);
    expect(getPairSumLastDigit(5, 5)).toBe(0); // 10 % 10
  });
});

describe('generateKraepelinColumn', () => {
  it('produces correct length with default', () => {
    const col = generateKraepelinColumn(0);
    expect(col.columnIndex).toBe(0);
    expect(col.numbers).toHaveLength(25);
  });

  it('produces specified length', () => {
    const col = generateKraepelinColumn(3, 30);
    expect(col.numbers).toHaveLength(30);
    expect(col.columnIndex).toBe(3);
  });

  it('all digits 0-9', () => {
    const col = generateKraepelinColumn(0, 100);
    col.numbers.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(9);
    });
  });
});

describe('evaluateKraepelinResults', () => {
  function makeInputs(
    columns: { correct: number; wrong: number; avgTimeMs: number }[]
  ): KraepelinInput[] {
    const inputs: KraepelinInput[] = [];
    columns.forEach((col, ci) => {
      let pairIdx = 0;
      for (let i = 0; i < col.correct; i++, pairIdx++) {
        inputs.push({
          columnIndex: ci,
          pairIndex: pairIdx,
          userAnswer: 5,
          correctAnswer: 5,
          isCorrect: true,
          timeSpentMs: col.avgTimeMs,
        });
      }
      for (let i = 0; i < col.wrong; i++, pairIdx++) {
        inputs.push({
          columnIndex: ci,
          pairIndex: pairIdx,
          userAnswer: 3,
          correctAnswer: 5,
          isCorrect: false,
          timeSpentMs: col.avgTimeMs,
        });
      }
    });
    return inputs;
  }

  it('calculates accuracy and totals', () => {
    const inputs = makeInputs([
      { correct: 8, wrong: 2, avgTimeMs: 1000 },
      { correct: 9, wrong: 1, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 2, 60);

    expect(result.totalQuestionsAnswered).toBe(20);
    expect(result.totalCorrect).toBe(17);
    expect(result.totalWrong).toBe(3);
    expect(result.overallAccuracy).toBe(85);
    expect(result.columnResults).toHaveLength(2);
    expect(result.columnResults[0].accuracy).toBe(80);
    expect(result.columnResults[1].accuracy).toBe(90);
  });

  it('calculates average speed per column (questions/minute)', () => {
    // 10 questions in 60s column = 10 q/min per column, avg = 10
    const inputs = makeInputs([
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 2, 60);
    expect(result.averageSpeedPerColumn).toBe(10);
  });

  it('detects Meningkat trend', () => {
    // first half slower (fewer answers), second half faster (more answers)
    const inputs = makeInputs([
      { correct: 5, wrong: 0, avgTimeMs: 1000 },
      { correct: 6, wrong: 0, avgTimeMs: 1000 },
      { correct: 9, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 4, 60);
    expect(result.workPaceTrend).toBe('Meningkat');
  });

  it('detects Menurun trend', () => {
    const inputs = makeInputs([
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 9, wrong: 0, avgTimeMs: 1000 },
      { correct: 5, wrong: 0, avgTimeMs: 1000 },
      { correct: 4, wrong: 0, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 4, 60);
    expect(result.workPaceTrend).toBe('Menurun');
  });

  it('detects Stabil trend', () => {
    const inputs = makeInputs([
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 4, 60);
    expect(result.workPaceTrend).toBe('Stabil');
  });

  it('stability score is 0 for uniform columns', () => {
    const inputs = makeInputs([
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
      { correct: 10, wrong: 0, avgTimeMs: 1000 },
    ]);
    const result = evaluateKraepelinResults(inputs, 2, 60);
    expect(result.stabilityScore).toBe(0);
  });

  it('throws for zero duration seconds', () => {
    expect(() => evaluateKraepelinResults([], 3, 0)).toThrow('columnDurationSeconds must be > 0');
  });

  it('handles empty input array', () => {
    const result = evaluateKraepelinResults([], 3, 60);
    expect(result.totalQuestionsAnswered).toBe(0);
    expect(result.totalCorrect).toBe(0);
    expect(result.overallAccuracy).toBe(0);
    expect(result.columnResults).toHaveLength(3);
  });

  it('throws for negative duration seconds', () => {
    expect(() => evaluateKraepelinResults([], 3, -10)).toThrow('columnDurationSeconds must be > 0');
  });
});
