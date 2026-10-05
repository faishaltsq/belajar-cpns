import { ExamAnswer, Question, QuestionCategory } from '@/lib/types';

// ── Section metadata ──────────────────────────────────────

export interface QuestionSection {
  category: QuestionCategory;
  startIndex: number;   // 0-based
  endIndex: number;     // 0-based
  startNumber: number;  // 1-based (display)
  endNumber: number;    // 1-based (display)
  totalCount: number;
  answeredCount: number;
}

/**
 * Build dynamic section ranges from questions array.
 * Works for any package size — no hardcoded ranges.
 */
export function getQuestionSections(
  questions: Question[],
  answers: Map<number, ExamAnswer>
): QuestionSection[] {
  if (!questions || questions.length === 0) return [];

  const sectionsMap = new Map<
    QuestionCategory,
    { category: QuestionCategory; startIndex: number; endIndex: number; totalCount: number; answeredCount: number }
  >();
  const categoryOrder: QuestionCategory[] = [];

  questions.forEach((q, idx) => {
    const cat = q.category || 'TWK';
    const ans = answers.get(q.id);
    const isAnswered = ans && ans.selectedOptionId != null && ans.selectedOptionId !== '';

    if (!sectionsMap.has(cat)) {
      categoryOrder.push(cat);
      sectionsMap.set(cat, { category: cat, startIndex: idx, endIndex: idx, totalCount: 1, answeredCount: isAnswered ? 1 : 0 });
    } else {
      const item = sectionsMap.get(cat)!;
      item.endIndex = idx;
      item.totalCount += 1;
      if (isAnswered) item.answeredCount += 1;
    }
  });

  return categoryOrder.map((cat) => {
    const s = sectionsMap.get(cat)!;
    return {
      category: s.category,
      startIndex: s.startIndex,
      endIndex: s.endIndex,
      startNumber: s.startIndex + 1,
      endNumber: s.endIndex + 1,
      totalCount: s.totalCount,
      answeredCount: s.answeredCount,
    };
  });
}

// ── Section-preserving shuffle ────────────────────────────

/** Fisher-Yates in-place shuffle */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffle questions ONLY within each section (TWK, TIU, TKP).
 * Section order is always preserved: TWK → TIU → TKP (first-appearance order).
 */
export function shuffleWithinSections(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return [];

  const groups = new Map<string, Question[]>();
  const categoryOrder: string[] = [];

  for (const q of questions) {
    const cat = q.category || 'TWK';
    if (!groups.has(cat)) {
      categoryOrder.push(cat);
      groups.set(cat, []);
    }
    groups.get(cat)!.push(q);
  }

  const result: Question[] = [];
  for (const cat of categoryOrder) {
    result.push(...fisherYatesShuffle([...groups.get(cat)!]));
  }
  return result;
}

// ── Section display helpers ───────────────────────────────

const SECTION_FULL_NAMES: Record<string, string> = {
  TWK: 'Tes Wawasan Kebangsaan',
  TIU: 'Tes Inteligensia Umum',
  TKP: 'Tes Karakteristik Pribadi',
};

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  TWK: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', activeBg: 'bg-sky-100' },
  TIU: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-100' },
  TKP: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-100' },
};

export function getSectionFullName(cat: string): string {
  return SECTION_FULL_NAMES[cat] || cat;
}

export function getSectionColors(cat: string) {
  return SECTION_COLORS[cat] || SECTION_COLORS['TWK'];
}
