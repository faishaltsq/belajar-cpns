import { Question, ExamAnswer } from './types';
import { getScopedJSON, setScopedJSON } from './userStorage';

export interface WrongQuestionItem {
  question: Question;
  userAnswerId: string | null;
  packageId: string;
}

/** Per-question points recorded at submit time, keyed by question id. */
interface QuestionScore {
  score: number;
  maxScore: number;
}
type QuestionScoreMap = Record<string, QuestionScore>;

const KEY_MASTERED = 'mastered_questions';

/**
 * A question counts as wrong when the server-scored points fall short of what
 * the question was worth. The pre-exam payload no longer carries `options[].score`
 * (audit F3), so the points come from the snapshot the submit handler saved
 * alongside the answers, not from re-deriving them on the client.
 */
function isWrongAnswer(category: Question['category'], earned: number, maxScore: number): boolean {
  if (category === 'TKP') return earned < 4;
  return earned < maxScore;
}

export function getMasteredIds(userId?: string | null): Set<number> {
  if (typeof window === 'undefined') return new Set();
  const arr = getScopedJSON<number[]>(KEY_MASTERED, userId, []);
  return new Set(arr);
}

export function markMastered(questionId: number, userId?: string | null) {
  const set = getMasteredIds(userId);
  set.add(questionId);
  setScopedJSON(KEY_MASTERED, userId, Array.from(set));
}

export function collectWrongQuestions(userId?: string | null): WrongQuestionItem[] {
  if (typeof window === 'undefined') return [];
  const mastered = getMasteredIds(userId);
  const map = new Map<number, WrongQuestionItem>();

  const scope = userId ? `u_${userId}` : 'guest';
  const examPrefix = `lolos_${scope}_exam_result_`;
  const drillPrefix = `lolos_${scope}_drill_questions_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Scan dari hasil Simulasi CAT
    if (key.startsWith(examPrefix)) {
      const resultId = key.replace(examPrefix, '');
      try {
        const qRaw = localStorage.getItem(`lolos_${scope}_exam_questions_${resultId}`);
        const aRaw = localStorage.getItem(`lolos_${scope}_exam_user_answers_${resultId}`);
        const sRaw = localStorage.getItem(`lolos_${scope}_exam_scores_${resultId}`);
        if (qRaw && aRaw) {
          const questions: Question[] = JSON.parse(qRaw);
          const answers: ExamAnswer[] = JSON.parse(aRaw);
          const scores: QuestionScoreMap = sRaw ? JSON.parse(sRaw) : {};
          const ansMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

          for (const q of questions) {
            if (mastered.has(q.id) || map.has(q.id)) continue;
            const chosenId = ansMap.get(q.id) ?? null;
            const recorded = scores[String(q.id)];
            const earned = recorded?.score ?? 0;
            const maxScore = recorded?.maxScore ?? 0;
            if (isWrongAnswer(q.category, earned, maxScore)) {
              map.set(q.id, { question: q, userAnswerId: chosenId, packageId: `simulasi-${resultId}` });
            }
          }
        }
      } catch { /* skip */ }
    }

    // Scan dari riwayat Drill per subkategori
    if (key.startsWith(drillPrefix)) {
      const sessionId = key.replace(drillPrefix, '');
      try {
        const qRaw = localStorage.getItem(key);
        const aRaw = localStorage.getItem(`lolos_${scope}_drill_answers_${sessionId}`);
        const sRaw = localStorage.getItem(`lolos_${scope}_drill_scores_${sessionId}`);
        // Explained after the fact: the question snapshot itself never carried
        // an explanation, so review of a drill mistake had nothing to show.
        const eRaw = localStorage.getItem(`lolos_${scope}_drill_explanations_${sessionId}`);
        if (qRaw && aRaw) {
          const questions: Question[] = JSON.parse(qRaw);
          const explanations: Record<string, string> = eRaw ? JSON.parse(eRaw) : {};
          for (const q of questions) {
            if (!q.explanation) q.explanation = explanations[String(q.id)] ?? '';
          }
          const answers: { questionId: number; selectedOptionId: string }[] = JSON.parse(aRaw);
          const scores: QuestionScoreMap = sRaw ? JSON.parse(sRaw) : {};
          const ansMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

          for (const q of questions) {
            if (mastered.has(q.id) || map.has(q.id)) continue;
            const chosenId = ansMap.get(q.id) ?? null;
            const recorded = scores[String(q.id)];
            const earned = recorded?.score ?? 0;
            const maxScore = recorded?.maxScore ?? 0;
            if (isWrongAnswer(q.category, earned, maxScore)) {
              map.set(q.id, { question: q, userAnswerId: chosenId, packageId: `drill-${sessionId}` });
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  return Array.from(map.values());
}
