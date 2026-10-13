export type QuestionCategory = 'TWK' | 'TIU' | 'TKP';

export interface Option {
  id: string;
  text: string;
  score: number;
  image?: string;
}

export interface Question {
  id: number;
  category: QuestionCategory;
  subCategory: string;
  text: string;
  options: Option[];
  explanation: string;
  image?: string;
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

// --- Diagnostik Sub-Kategori ---
export interface SubcategoryStat {
  name: string;
  category: QuestionCategory;
  total: number;
  correct: number;
  earnedScore: number;
  maxScore: number;
  accuracyPercent: number;
  status: 'KUAT' | 'SEDANG' | 'LEMAH'; // >=80% KUAT, 60-79% SEDANG, <60% LEMAH
}

export interface SubcategoryDiagnosticReport {
  weakestSubcategories: SubcategoryStat[];
  strongestSubcategories: SubcategoryStat[];
  allSubcategories: SubcategoryStat[];
  recommendationNote: string;
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
  category?: 'deret' | 'silogisme' | 'spasial';
  questionText: string;
  options: { id: string; text: string; score: number }[];
  explanation: string;
}

// ========================
// TES KECERMATAN
// ========================

export interface KecermatanKeyItem {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  value: string;
}

export interface KecermatanReferenceTable {
  type: 'angka' | 'huruf';
  keys: KecermatanKeyItem[];
}

export interface KecermatanQuestion {
  displayedValues: string[];
  missingValue: string;
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface KecermatanInput {
  columnIndex: number;
  questionIndex: number;
  selectedLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface KecermatanColumnResult {
  columnIndex: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  speedPerMinute: number;
}

export interface KecermatanOverallResult {
  type: 'angka' | 'huruf';
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  averageSpeedPerColumn: number;
  stabilityScore: number;
  columnResults: KecermatanColumnResult[];
  grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Latihan';
}

// ========================
// TES KEPRIBADIAN (PAPI KOSTICK)
// ========================

export type KepribadianDimensionKey = 'L' | 'A' | 'D' | 'S' | 'R';

export interface KepribadianDimensionScore {
  key: KepribadianDimensionKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  description: string;
}

export interface KepribadianOverallResult {
  totalAnswered: number;
  dimensions: Record<KepribadianDimensionKey, KepribadianDimensionScore>;
  dominantTraits: string[];
  asnFitSummary: string;
  recommendations: string[];
}

