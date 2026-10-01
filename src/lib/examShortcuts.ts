// src/lib/examShortcuts.ts
// Helper pure function: memetakan keyboard event ke aksi ujian

export type ExamAction =
  | { type: 'SELECT_OPTION'; index: number }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREV_QUESTION' }
  | { type: 'TOGGLE_FLAG' }
  | null;

/**
 * Memetakan keyboard event key ke aksi ujian.
 * Return null jika key tidak relevan.
 */
export function mapKeyToAction(key: string, code: string): ExamAction {
  // A-E atau 1-5 untuk pilih opsi
  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
  const lower = key.toLowerCase();
  if (letterMap[lower] !== undefined) return { type: 'SELECT_OPTION', index: letterMap[lower] };

  // Digit 1-5
  if (key >= '1' && key <= '5') return { type: 'SELECT_OPTION', index: parseInt(key) - 1 };

  // Arrow keys for navigation
  if (key === 'ArrowRight') return { type: 'NEXT_QUESTION' };
  if (key === 'ArrowLeft') return { type: 'PREV_QUESTION' };

  // R for flag/ragu
  if (lower === 'r') return { type: 'TOGGLE_FLAG' };

  return null;
}
