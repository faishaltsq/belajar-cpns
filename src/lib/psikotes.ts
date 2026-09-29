import type {
  KraepelinColumn,
  KraepelinInput,
  KraepelinColumnResult,
  KraepelinOverallResult,
} from './types';

export function getPairSumLastDigit(a: number, b: number): number {
  return (a + b) % 10;
}

export function generateKraepelinColumn(
  columnIndex: number,
  length = 25
): KraepelinColumn {
  const numbers: number[] = [];
  for (let i = 0; i < length; i++) {
    numbers.push(Math.floor(Math.random() * 10));
  }
  return { columnIndex, numbers };
}

export function evaluateKraepelinResults(
  inputs: KraepelinInput[],
  totalColumns: number,
  columnDurationSeconds: number
): KraepelinOverallResult {
  // Group by column
  const byColumn = new Map<number, KraepelinInput[]>();
  for (const inp of inputs) {
    const arr = byColumn.get(inp.columnIndex) ?? [];
    arr.push(inp);
    byColumn.set(inp.columnIndex, arr);
  }

  const columnResults: KraepelinColumnResult[] = [];
  const speedPerColumn: number[] = []; // questions per minute

  for (let ci = 0; ci < totalColumns; ci++) {
    const colInputs = byColumn.get(ci) ?? [];
    const correct = colInputs.filter((i) => i.isCorrect).length;
    const wrong = colInputs.length - correct;
    const accuracy = colInputs.length > 0 ? Math.round((correct / colInputs.length) * 100) : 0;

    columnResults.push({
      columnIndex: ci,
      totalAttempts: colInputs.length,
      correctCount: correct,
      wrongCount: wrong,
      accuracy,
    });

    // speed = questions answered / duration in minutes
    const durationMinutes = columnDurationSeconds / 60;
    speedPerColumn.push(colInputs.length / durationMinutes);
  }

  const totalCorrect = inputs.filter((i) => i.isCorrect).length;
  const totalWrong = inputs.length - totalCorrect;
  const overallAccuracy = inputs.length > 0 ? Math.round((totalCorrect / inputs.length) * 100) : 0;
  const averageSpeedPerColumn =
    speedPerColumn.length > 0
      ? Math.round(speedPerColumn.reduce((a, b) => a + b, 0) / speedPerColumn.length * 100) / 100
      : 0;

  // Stability = population std dev of speed
  const mean = speedPerColumn.reduce((a, b) => a + b, 0) / (speedPerColumn.length || 1);
  const variance =
    speedPerColumn.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (speedPerColumn.length || 1);
  const stabilityScore = Math.round(Math.sqrt(variance) * 100) / 100;

  // Work pace trend: compare avg of first half vs second half
  const mid = Math.floor(speedPerColumn.length / 2);
  const firstHalf = speedPerColumn.slice(0, mid);
  const secondHalf = speedPerColumn.slice(mid);
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);

  let workPaceTrend: 'Meningkat' | 'Stabil' | 'Menurun';
  const diff = avgSecond - avgFirst;
  // threshold: 5% of avg
  const threshold = mean * 0.05;
  if (diff > threshold) {
    workPaceTrend = 'Meningkat';
  } else if (diff < -threshold) {
    workPaceTrend = 'Menurun';
  } else {
    workPaceTrend = 'Stabil';
  }

  return {
    totalQuestionsAnswered: inputs.length,
    totalCorrect,
    totalWrong,
    averageSpeedPerColumn,
    overallAccuracy,
    stabilityScore,
    columnResults,
    workPaceTrend,
  };
}
