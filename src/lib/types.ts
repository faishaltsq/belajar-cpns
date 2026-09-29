export type QuestionCategory = 'TWK' | 'TIU' | 'TKP';

export interface Option {
  id: string;
  text: string;
  score: number;
}

export interface Question {
  id: number;
  category: QuestionCategory;
  subCategory: string;
  text: string;
  options: Option[];
  explanation: string;
}

export interface ExamAnswer {
  questionId: number;
  selectedOptionId: string | null;
  isFlagged?: boolean;
}

export interface CategoryScoreResult {
  category: QuestionCategory;
  score: number;
  maxScore: number;
  passingGrade: number;
  isPassed: boolean;
  totalQuestions: number;
  answeredCount: number;
}

export interface ExamResult {
  twk: CategoryScoreResult;
  tiu: CategoryScoreResult;
  tkp: CategoryScoreResult;
  totalScore: number;
  isPassedAll: boolean;
  completedAt: string;
  durationSeconds: number;
}
