// src/lib/wrongAnswerRecap.ts
export type Category = 'TWK' | 'TIU' | 'TKP';

export interface RecapOption { id: string; score: number }

export interface QuestionRow {
  packageId: string;
  number: number;
  category: string;
  correctAnswer: string | null;
  explanation: string | null;
  options: RecapOption[];
}

export interface ResultRow {
  packageId: string;
  answers: Record<string, string>;
}

export interface WrongAnswerItem {
  packageId: string;
  number: number;
  category: Category;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string | null;
}

/**
 * Mirror of src/lib/diagnostic.ts:38-50: the best answer is the option holding
 * the maximum score. TKP rows routinely ship with correct_answer = null but a
 * full 1..5 score ladder on options, so grading must read options, not the
 * column (Finding 8).
 */
function bestOptionId(options: RecapOption[]): string | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  let max = -Infinity;
  let id: string | null = null;
  let tied = false;
  for (const o of options) {
    const s = typeof o?.score === 'number' ? o.score : -Infinity;
    if (s > max) { max = s; id = o?.id ?? null; tied = false; }
    else if (s === max) { tied = true; }
  }
  // A tie means no single best answer exists — the question is ungradeable.
  return max === -Infinity || tied ? null : id;
}

/**
 * A question counts as wrong when the user answered it, a best answer can be
 * determined, and the chosen option is not it.
 */
export function aggregateWrongAnswers(
  results: ResultRow[],
  questions: QuestionRow[]
): WrongAnswerItem[] {
  const byKey = new Map<string, QuestionRow>();
  for (const q of questions) byKey.set(`${q.packageId}#${q.number}`, q);

  const seen = new Set<string>();
  const out: WrongAnswerItem[] = [];

  for (const r of results) {
    if (!r?.answers) continue;
    for (const [numStr, given] of Object.entries(r.answers)) {
      const number = Number(numStr);
      if (!Number.isInteger(number)) continue;
      if (typeof given !== 'string' || !given) continue;

      const q = byKey.get(`${r.packageId}#${number}`);
      if (!q) continue;

      // options first, correct_answer as the fallback (tryout-figural ships
      // correct_answer with an all-zero options score ladder).
      const correct = bestOptionId(q.options) ?? (q.correctAnswer || null);
      if (!correct) continue;
      if (correct === given) continue;

      const dedupeKey = `${r.packageId}#${number}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      out.push({
        packageId: r.packageId,
        number,
        category: (q.category as Category) ?? 'TWK',
        yourAnswer: given,
        correctAnswer: correct,
        explanation: q.explanation,
      });
    }
  }

  // Stable, predictable ordering for the UI
  out.sort((a, b) =>
    a.packageId === b.packageId
      ? a.number - b.number
      : a.packageId.localeCompare(b.packageId)
  );
  return out;
}

export function groupByCategory(
  items: WrongAnswerItem[]
): Record<Category, WrongAnswerItem[]> {
  const grouped: Record<Category, WrongAnswerItem[]> = { TWK: [], TIU: [], TKP: [] };
  for (const i of items) grouped[i.category]?.push(i);
  return grouped;
}
