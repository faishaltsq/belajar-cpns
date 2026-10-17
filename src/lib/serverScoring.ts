// Server-authoritative exam scoring.
//
// The client used to POST its own `totalScore` / `scoreTwk` / ... and the
// server stored them verbatim, which let anyone top the leaderboard with one
// curl. Scoring now happens here, from the answer map, against the questions
// loaded from the database — the browser never sends a number.
//
// `calculateExamScore` in ./scoring is the single source of truth for the
// arithmetic; this module only adapts the wire format to it.

import { loadPackage } from '@/lib/loadPackage';
import { calculateExamScore } from '@/lib/scoring';
import { ExamAnswer, ExamResult, Question } from '@/lib/types';

/** Client answer map: questionId -> selected option id. */
export type AnswerMap = Record<string, string | null>;

export type ScoreSubmission =
  | { ok: true; result: ExamResult; questions: Question[] }
  | { ok: false; reason: string };

const MAX_ANSWER_ENTRIES = 200;

/**
 * Recompute the result for a submission. The client supplies only which option
 * it picked; everything else is derived from the stored package.
 *
 * Rejects an answer map naming questions that do not exist in the package so a
 * forged payload cannot inflate the denominator, and caps the map size so a
 * huge body cannot be used as a memory lever.
 */
export async function scoreSubmission(
  packageId: string,
  answers: unknown,
  durationSeconds: number
): Promise<ScoreSubmission> {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    return { ok: false, reason: 'answers must be an object' };
  }

  const entries = Object.entries(answers as AnswerMap);
  if (entries.length > MAX_ANSWER_ENTRIES) {
    return { ok: false, reason: 'too many answers' };
  }

  const questions = await loadPackage(packageId);
  if (questions.length === 0) {
    return { ok: false, reason: 'Package not found' };
  }

  const validIds = new Set(questions.map((q) => q.id));
  const optionIds = new Map<number, Set<string>>(
    questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))])
  );

  const cleaned: ExamAnswer[] = [];
  for (const [rawId, rawOption] of entries) {
    const questionId = Number(rawId);
    if (!Number.isInteger(questionId) || !validIds.has(questionId)) {
      return { ok: false, reason: `Unknown question id: ${rawId}` };
    }
    if (rawOption === null || rawOption === '') {
      cleaned.push({ questionId, selectedOptionId: null });
      continue;
    }
    if (typeof rawOption !== 'string' || !optionIds.get(questionId)?.has(rawOption)) {
      return { ok: false, reason: `Unknown option for question ${rawId}` };
    }
    cleaned.push({ questionId, selectedOptionId: rawOption });
  }

  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds >= 0
    ? Math.floor(durationSeconds)
    : 0;

  return { ok: true, result: calculateExamScore(questions, cleaned, safeDuration), questions };
}
