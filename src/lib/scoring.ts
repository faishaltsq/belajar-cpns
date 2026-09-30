import { Question, ExamAnswer, ExamResult, QuestionCategory, CategoryScoreResult } from './types';

export const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 } as const;
export const QUESTION_LIMITS = { TWK: 30, TIU: 35, TKP: 45, TOTAL: 110 } as const;
export const MAX_SCORES = { TWK: 150, TIU: 175, TKP: 225, TOTAL: 550 } as const;

// Proportional PG ratio from standard test
const PG_RATIO = {
  TWK: PASSING_GRADES.TWK / MAX_SCORES.TWK,
  TIU: PASSING_GRADES.TIU / MAX_SCORES.TIU,
  TKP: PASSING_GRADES.TKP / MAX_SCORES.TKP,
} as const;

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
    if (selectedOptionId != null && selectedOptionId !== '') {
      scores[q.category].answeredCount += 1;
      const matchedOption = q.options.find((opt) => opt.id === selectedOptionId);
      if (matchedOption) scores[q.category].score += matchedOption.score;
    }
  });

  const buildCategoryResult = (category: QuestionCategory): CategoryScoreResult => {
    const data = scores[category];
    const totalQ = data.totalCount;
    const standardTotal = QUESTION_LIMITS[category];
    // ponytail: dynamic maxScore & passingGrade; upgrade to per-question weight if needed
    const dynamicMaxScore = totalQ === standardTotal ? MAX_SCORES[category] : totalQ * 5;
    const dynamicPG = totalQ === standardTotal
      ? PASSING_GRADES[category]
      : Math.round(PG_RATIO[category] * dynamicMaxScore);

    return {
      category,
      score: data.score,
      maxScore: dynamicMaxScore,
      passingGrade: dynamicPG,
      isPassed: data.score >= dynamicPG,
      totalQuestions: totalQ,
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
