import { Question, ExamAnswer } from './types';

export interface WrongQuestionItem {
  question: Question;
  userAnswerId: string | null;
  packageId: string;
}

const STORAGE_KEY_MASTERED = 'lolos_mastered_questions';

export function getMasteredIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASTERED);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function markMastered(questionId: number) {
  const set = getMasteredIds();
  set.add(questionId);
  localStorage.setItem(STORAGE_KEY_MASTERED, JSON.stringify(Array.from(set)));
}

export function collectWrongQuestions(): WrongQuestionItem[] {
  if (typeof window === 'undefined') return [];
  const mastered = getMasteredIds();
  const map = new Map<number, WrongQuestionItem>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Scan dari hasil Simulasi CAT (exam_result_*)
    if (key.startsWith('exam_result_')) {
      const resultId = key.replace('exam_result_', '');
      try {
        const qRaw = localStorage.getItem(`exam_questions_${resultId}`);
        const aRaw = localStorage.getItem(`exam_user_answers_${resultId}`);
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

    // Scan dari riwayat Drill per subkategori (drill_questions_*)
    if (key.startsWith('drill_questions_')) {
      const sessionId = key.replace('drill_questions_', '');
      try {
        const qRaw = localStorage.getItem(key);
        const aRaw = localStorage.getItem(`drill_answers_${sessionId}`);
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
