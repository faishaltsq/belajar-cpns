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

export interface KraepelinColumn {
  columnIndex: number;
  numbers: number[]; // 20-30 numbers per column (each 0-9)
}

export interface KraepelinInput {
  columnIndex: number;
  pairIndex: number; // pair 0: numbers[0] + numbers[1]
  userAnswer: number; // last digit of sum (e.g. 7 + 8 = 15 -> answer 5)
  correctAnswer: number;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface KraepelinColumnResult {
  columnIndex: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number; // 0 - 100%
}

export interface KraepelinOverallResult {
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  averageSpeedPerColumn: number; // questions/minute
  overallAccuracy: number; // percentage
  stabilityScore: number; // standard deviation of speed across columns (lower = more stable)
  columnResults: KraepelinColumnResult[];
  workPaceTrend: 'Meningkat' | 'Stabil' | 'Menurun'; // based on slope of first half vs second half
}

export interface ReasoningQuestion {
  id: number;
  type: 'deret_angka' | 'logika_spasial' | 'analogi_gambar';
  questionText: string;
  options: { id: string; text: string; score: number }[];
  explanation: string;
}
