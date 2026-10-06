import { Question, ExamAnswer } from './types';
import { getScopedJSON, setScopedJSON } from './userStorage';

export interface WrongQuestionItem {
  question: Question;
  userAnswerId: string | null;
  packageId: string;
}

const KEY_MASTERED = 'mastered_questions';

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
        if (qRaw && aRaw) {
          const questions: Question[] = JSON.parse(qRaw);
          const answers: ExamAnswer[] = JSON.parse(aRaw);
          const ansMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

          for (const q of questions) {
            if (mastered.has(q.id) || map.has(q.id)) continue;
            const chosenId = ansMap.get(q.id) ?? null;
            const chosenOpt = q.options.find((o) => o.id === chosenId);
            const maxScore = Math.max(...q.options.map((o) => o.score));
            const userScore = chosenOpt ? chosenOpt.score : 0;
            const isWrong = q.category === 'TKP' ? userScore < 4 : userScore < maxScore;
            if (isWrong) {
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
        if (qRaw && aRaw) {
          const questions: Question[] = JSON.parse(qRaw);
          const answers: { questionId: number; selectedOptionId: string }[] = JSON.parse(aRaw);
          const ansMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

          for (const q of questions) {
            if (mastered.has(q.id) || map.has(q.id)) continue;
            const chosenId = ansMap.get(q.id) ?? null;
            const chosenOpt = q.options.find((o) => o.id === chosenId);
            const maxScore = Math.max(...q.options.map((o) => o.score));
            const userScore = chosenOpt ? chosenOpt.score : 0;
            const isWrong = q.category === 'TKP' ? userScore < 4 : userScore < maxScore;
            if (isWrong) {
              map.set(q.id, { question: q, userAnswerId: chosenId, packageId: `drill-${sessionId}` });
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  return Array.from(map.values());
}
