/**
 * Personal progress analytics (Phase 6, Feature 2).
 *
 * Pure and deterministic: it takes rows that already exist in `exam_results`
 * plus, when accuracy by category is wanted, the question metadata needed to
 * mark answers. Nothing here reads the database, so it can be unit-tested and
 * reused by an API route, a server component or a client card alike.
 *
 * Numbers never outrun their evidence: a trend needs at least two sessions on
 * both halves of the window, and a category accuracy is reported as
 * `insufficientData` below `MIN_ANSWERED_FOR_A_CONCLUSION` answered questions —
 * the same rule the diagnostic engine applies (`src/lib/diagnostic.ts`).
 */

export interface ExamSessionSummary {
  packageId: string;
  finishedAt: string; // ISO timestamp
  totalScore: number;
  isPassed: boolean;
  durationUsed: number | null;
}

export interface QuestionMeta {
  id: number | string;
  category: string; // 'TWK' | 'TIU' | 'TKP' | ...
  correctAnswer: string | null; // option id
}

export interface CategoryProgress {
  category: string;
  answered: number;
  correct: number;
  accuracy: number; // 0-100, rounded; 0 when nothing answered
  insufficientData: boolean;
}

export interface ProgressAnalytics {
  totalSessions: number;
  averageScore: number;
  highestScore: number;
  passCount: number;
  passRate: number; // 0-100
  latestSessionAt: string | null;
  categoryProgress: CategoryProgress[];
  weeklyActivity: { weekStart: string; sessions: number }[]; // oldest first, last 8 weeks
  trend: 'improving' | 'declining' | 'flat' | 'unknown';
  insufficientData: boolean; // fewer than two sessions
}

export const MIN_ANSWERED_FOR_A_CONCLUSION = 10;
export const WEEKS_IN_WINDOW = 8;

/**
 * `YYYY-MM-DD` for a local calendar date.
 *
 * Never `toISOString().slice(0, 10)`: in WIB (UTC+7) local midnight is 17:00 the
 * previous day in UTC, so the ISO slice labels a Monday session with Sunday's
 * date and every weekly bucket lands one week off. Streak arithmetic had the
 * same defect (`src/lib/journeyHelper.ts`).
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local-calendar Monday of the week containing this instant. */
export function weekStartOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 0 = Sunday → 6 days back
  return localDateKey(d);
}

/** Mark answers against question metadata: per-category answered/correct counts. */
export function summarizeCategoryAnswers(
  answers: Record<string, string | null | undefined>,
  questions: QuestionMeta[]
): CategoryProgress[] {
  const byCategory = new Map<string, { answered: number; correct: number }>();

  for (const q of questions) {
    const selected = answers[String(q.id)];
    if (selected === null || selected === undefined || selected === '') continue;
    const bucket = byCategory.get(q.category) ?? { answered: 0, correct: 0 };
    bucket.answered += 1;
    if (q.correctAnswer && selected === q.correctAnswer) bucket.correct += 1;
    byCategory.set(q.category, bucket);
  }

  return Array.from(byCategory.entries())
    .map(([category, { answered, correct }]) => ({
      category,
      answered,
      correct,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
      insufficientData: answered < MIN_ANSWERED_FOR_A_CONCLUSION,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function calculateProgressAnalytics(
  sessions: ExamSessionSummary[],
  opts: { now?: Date } = {}
): ProgressAnalytics {
  const now = opts.now ?? new Date();
  const ordered = [...sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const total = ordered.length;

  const scores = ordered.map((s) => Number(s.totalScore) || 0);
  const passCount = ordered.filter((s) => s.isPassed).length;
  const half = Math.floor(total / 2);

  let trend: ProgressAnalytics['trend'] = 'unknown';
  if (total >= 4 && half >= 2) {
    const firstHalf = scores.slice(0, half);
    const secondHalf = scores.slice(-half);
    const avg = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const delta = avg(secondHalf) - avg(firstHalf);
    // 2% of the maximum attainable score absorbs rounding noise.
    const deadBand = 22;
    trend = delta > deadBand ? 'improving' : delta < -deadBand ? 'declining' : 'flat';
  }

  const weekly = new Map<string, number>();
  for (let back = WEEKS_IN_WINDOW - 1; back >= 0; back -= 1) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - back * 7);
    weekly.set(localDateKey(start), 0);
  }
  for (const s of ordered) {
    const key = weekStartOf(s.finishedAt);
    if (weekly.has(key)) weekly.set(key, (weekly.get(key) ?? 0) + 1);
  }

  return {
    totalSessions: total,
    averageScore: total > 0 ? Math.round(scores.reduce((sum, x) => sum + x, 0) / total) : 0,
    highestScore: total > 0 ? Math.max(...scores) : 0,
    passCount,
    passRate: total > 0 ? Math.round((passCount / total) * 100) : 0,
    latestSessionAt: total > 0 ? ordered[total - 1].finishedAt : null,
    categoryProgress: [],
    weeklyActivity: Array.from(weekly.entries())
      .map(([weekStart, sessions]) => ({ weekStart, sessions }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    trend,
    insufficientData: total < 2,
  };
}
