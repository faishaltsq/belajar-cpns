import { describe, it, expect } from 'vitest';
import {
  generateKecermatanTable,
  generateKecermatanQuestion,
  evaluateKecermatanResults,
} from '../src/lib/kecermatan';
import type { KecermatanInput } from '../src/lib/types';

describe('generateKecermatanTable', () => {
  it('generates 5 distinct digits for angka mode', () => {
    const table = generateKecermatanTable('angka');
    expect(table.keys).toHaveLength(5);
    const options = ['A', 'B', 'C', 'D', 'E'];
    expect(table.keys.map((k) => k.letter)).toEqual(options);
    const values = table.keys.map((k) => k.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(5);
    values.forEach((v) => expect(/^\d$/.test(v)).toBe(true));
  });

  it('generates 5 distinct uppercase letters for huruf mode', () => {
    const table = generateKecermatanTable('huruf');
    expect(table.keys).toHaveLength(5);
    const values = table.keys.map((k) => k.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(5);
    values.forEach((v) => expect(/^[A-Z]$/.test(v)).toBe(true));
  });
});

describe('generateKecermatanQuestion', () => {
  it('generates 4 items with exactly one missing from table', () => {
    const table = generateKecermatanTable('angka');
    const q = generateKecermatanQuestion(table);
    expect(q.displayedValues).toHaveLength(4);
    const tableValues = table.keys.map((k) => k.value);

    // Exactly one value from table is missing
    const missing = tableValues.find((v) => !q.displayedValues.includes(v));
    expect(missing).toBeDefined();
    expect(q.correctLetter).toBe(table.keys.find((k) => k.value === missing)?.letter);
  });
});

describe('evaluateKecermatanResults', () => {
  it('calculates accuracy, speed, and stability across columns', () => {
    const inputs: KecermatanInput[] = [
      { columnIndex: 0, questionIndex: 0, selectedLetter: 'A', correctLetter: 'A', isCorrect: true, timeSpentMs: 1200 },
      { columnIndex: 0, questionIndex: 1, selectedLetter: 'B', correctLetter: 'C', isCorrect: false, timeSpentMs: 1100 },
      { columnIndex: 1, questionIndex: 0, selectedLetter: 'D', correctLetter: 'D', isCorrect: true, timeSpentMs: 1000 },
    ];
    const result = evaluateKecermatanResults(inputs, 2, 60);
    expect(result.totalQuestionsAnswered).toBe(3);
    expect(result.totalCorrect).toBe(2);
    expect(result.totalWrong).toBe(1);
    expect(result.overallAccuracy).toBe(67);
    expect(result.columnResults).toHaveLength(2);
  });
});
