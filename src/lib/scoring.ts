import { Question, ExamAnswer, ExamResult, QuestionCategory, CategoryScoreResult } from './types';

export const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 } as const;
export const QUESTION_LIMITS = { TWK: 30, TIU: 35, TKP: 45, TOTAL: 110 } as const;
export const MAX_SCORES = { TWK: 150, TIU: 175, TKP: 225, TOTAL: 550 } as const;

export function calculateExamScore(questions: Question[], answers: ExamAnswer[], durationSeconds: number): ExamResult {
  const answerMap = new Map<number, string | null>();
  answers.forEach((ans) => answerMap.set(ans.questionId, ans.selectedOptionId));

  const scores: Record<QuestionCategory, { score: number; answeredCount: number; totalCount: number }> = {
    TWK: { score: 0, answeredCount: 0, totalCount: 0 },
    TIU: { score: 0, answeredCount: 0, totalCount: 0 },
    TKP: { score: 0, answeredCount: 0, totalCount: 0 },
  };

  questions.forEach((q) => {
    scores[q.category].totalCount += 1;
    const selectedOptionId = answerMap.get(q.id);
    if (selectedOptionId) {
      scores[q.category].answeredCount += 1;
      const matchedOption = q.options.find((opt) => opt.id === selectedOptionId);
      if (matchedOption) scores[q.category].score += matchedOption.score;
    }
  });

  const buildCategoryResult = (category: QuestionCategory): CategoryScoreResult => {
    const data = scores[category];
    return {
      category,
      score: data.score,
      maxScore: MAX_SCORES[category],
      passingGrade: PASSING_GRADES[category],
      isPassed: data.score >= PASSING_GRADES[category],
      totalQuestions: data.totalCount,
      answeredCount: data.answeredCount,
    };
  };

  const twkResult = buildCategoryResult('TWK');
  const tiuResult = buildCategoryResult('TIU');
  const tkpResult = buildCategoryResult('TKP');
  const totalScore = twkResult.score + tiuResult.score + tkpResult.score;

  return {
    twk: twkResult, tiu: tiuResult, tkp: tkpResult,
    totalScore,
    isPassedAll: twkResult.isPassed && tiuResult.isPassed && tkpResult.isPassed,
    completedAt: new Date().toISOString(),
    durationSeconds,
  };
}
