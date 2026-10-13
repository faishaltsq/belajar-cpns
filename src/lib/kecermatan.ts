import type {
  KecermatanKeyItem,
  KecermatanReferenceTable,
  KecermatanQuestion,
  KecermatanInput,
  KecermatanColumnResult,
  KecermatanOverallResult,
} from './types';

const LETTERS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
const ALPHABET_POOL = 'BCDFGHJKLMNPQRSTVWXYZ'.split(''); // Distinct consonants without easily confused I/O

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateKecermatanTable(type: 'angka' | 'huruf'): KecermatanReferenceTable {
  if (type === 'angka') {
    const digits = shuffle(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']).slice(0, 5);
    const keys: KecermatanKeyItem[] = LETTERS.map((letter, i) => ({
      letter,
      value: digits[i],
    }));
    return { type, keys };
  } else {
    const chars = shuffle(ALPHABET_POOL).slice(0, 5);
    const keys: KecermatanKeyItem[] = LETTERS.map((letter, i) => ({
      letter,
      value: chars[i],
    }));
    return { type, keys };
  }
}

export function generateKecermatanQuestion(table: KecermatanReferenceTable): KecermatanQuestion {
  const missingIndex = Math.floor(Math.random() * table.keys.length);
  const missingKey = table.keys[missingIndex];
  const remainingKeys = table.keys.filter((_, i) => i !== missingIndex);
  const displayedValues = shuffle(remainingKeys.map((k) => k.value));

  return {
    displayedValues,
    missingValue: missingKey.value,
    correctLetter: missingKey.letter,
  };
}

export function evaluateKecermatanResults(
  inputs: KecermatanInput[],
  totalColumns: number,
  columnDurationSeconds: number,
  type: 'angka' | 'huruf' = 'angka'
): KecermatanOverallResult {
  if (columnDurationSeconds <= 0) throw new Error('columnDurationSeconds must be > 0');

  const byColumn = new Map<number, KecermatanInput[]>();
  for (const inp of inputs) {
    const arr = byColumn.get(inp.columnIndex) ?? [];
    arr.push(inp);
    byColumn.set(inp.columnIndex, arr);
  }

  const columnResults: KecermatanColumnResult[] = [];
  const speeds: number[] = [];

  for (let ci = 0; ci < totalColumns; ci++) {
    const colInputs = byColumn.get(ci) ?? [];
    const correct = colInputs.filter((i) => i.isCorrect).length;
    const wrong = colInputs.length - correct;
    const accuracy = colInputs.length > 0 ? Math.round((correct / colInputs.length) * 100) : 0;
    const speedPerMinute = Math.round((colInputs.length / (columnDurationSeconds / 60)) * 10) / 10;

    speeds.push(speedPerMinute);
    columnResults.push({
      columnIndex: ci,
      totalAttempts: colInputs.length,
      correctCount: correct,
      wrongCount: wrong,
      accuracy,
      speedPerMinute,
    });
  }

  const totalCorrect = inputs.filter((i) => i.isCorrect).length;
  const totalWrong = inputs.length - totalCorrect;
  const overallAccuracy = inputs.length > 0 ? Math.round((totalCorrect / inputs.length) * 100) : 0;
  const avgSpeed =
    speeds.length > 0 ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10 : 0;

  const mean = avgSpeed;
  const variance = speeds.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (speeds.length || 1);
  const stabilityScore = Math.round(Math.sqrt(variance) * 100) / 100;

  let grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Latihan' = 'Perlu Latihan';
  if (overallAccuracy >= 90 && avgSpeed >= 35) {
    grade = 'Sangat Baik';
  } else if (overallAccuracy >= 80 && avgSpeed >= 25) {
    grade = 'Baik';
  } else if (overallAccuracy >= 65) {
    grade = 'Cukup';
  }

  return {
    type,
    totalQuestionsAnswered: inputs.length,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    averageSpeedPerColumn: avgSpeed,
    stabilityScore,
    columnResults,
    grade,
  };
}
