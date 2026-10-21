import { describe, it, expect } from 'vitest';
import {
  calculateProgressAnalytics,
  summarizeCategoryAnswers,
  weekStartOf,
  localDateKey,
  ExamSessionSummary,
  QuestionMeta,
} from '@/lib/progressAnalytics';

/** Local-constructed so the assertions hold in any runner timezone. */
const at = (y: number, m: number, d: number, h = 10) =>
  new Date(y, m - 1, d, h).toISOString();

const session = (finishedAt: string, totalScore: number, isPassed = false): ExamSessionSummary => ({
  packageId: 'tryout-1',
  finishedAt,
  totalScore,
  isPassed,
  durationUsed: 3600,
});

describe('weekStartOf', () => {
  it('buckets a local Monday into its own week', () => {
    // 2026-10-19 is a Monday. In UTC the same instant is Sunday 18:00, which is
    // exactly the off-by-one-week the streak bug used to produce.
    expect(weekStartOf(at(2026, 10, 19, 1))).toBe('2026-10-19');
  });

  it('buckets a local Sunday into the Monday before it', () => {
    expect(weekStartOf(at(2026, 10, 25, 23))).toBe('2026-10-19');
  });

  it('returns empty for an invalid timestamp', () => {
    expect(weekStartOf('not-a-date')).toBe('');
  });
});

describe('calculateProgressAnalytics', () => {
  it('reports an honest empty state', () => {
    const report = calculateProgressAnalytics([]);
    expect(report.totalSessions).toBe(0);
    expect(report.averageScore).toBe(0);
    expect(report.trend).toBe('unknown');
    expect(report.insufficientData).toBe(true);
    expect(report.weeklyActivity).toHaveLength(8);
    expect(report.weeklyActivity.reduce((n, w) => n + w.sessions, 0)).toBe(0);
  });

  it('counts sessions, scores and pass rate', () => {
    const report = calculateProgressAnalytics([
      session(at(2026, 9, 1), 400, false),
      session(at(2026, 9, 8), 500, true),
      session(at(2026, 9, 15), 600, true),
    ]);
    expect(report.totalSessions).toBe(3);
    expect(report.averageScore).toBe(500);
    expect(report.highestScore).toBe(600);
    expect(report.passCount).toBe(2);
    expect(report.passRate).toBe(67);
    expect(report.latestSessionAt).toBe(at(2026, 9, 15));
    expect(report.insufficientData).toBe(false);
  });

  it('reads improvement only when both halves of the window carry enough sessions', () => {
    const rising = calculateProgressAnalytics([
      session(at(2026, 9, 1), 300),
      session(at(2026, 9, 2), 310),
      session(at(2026, 9, 3), 640),
      session(at(2026, 9, 4), 650),
    ]);
    expect(rising.trend).toBe('improving');

    const falling = calculateProgressAnalytics([
      session(at(2026, 9, 1), 650),
      session(at(2026, 9, 2), 640),
      session(at(2026, 9, 3), 310),
      session(at(2026, 9, 4), 300),
    ]);
    expect(falling.trend).toBe('declining');

    const noisy = calculateProgressAnalytics([
      session(at(2026, 9, 1), 500),
      session(at(2026, 9, 2), 510),
      session(at(2026, 9, 3), 495),
      session(at(2026, 9, 4), 505),
    ]);
    expect(noisy.trend).toBe('flat');
  });

  it('refuses a trend from three sessions', () => {
    const report = calculateProgressAnalytics([
      session(at(2026, 9, 1), 300),
      session(at(2026, 9, 2), 400),
      session(at(2026, 9, 3), 600),
    ]);
    expect(report.trend).toBe('unknown');
  });

  it('places every session in the local week it happened', () => {
    const report = calculateProgressAnalytics([session(at(2026, 10, 19, 1), 500)], {
      now: new Date(2026, 9, 21, 12),
    });
    expect(report.weeklyActivity).toHaveLength(8);
    // The window ends on the current week (2026-10-19, a Monday); the week that
    // contains the session is the last one, and nothing is counted in the future.
    expect(report.weeklyActivity.map((w) => w.weekStart)).toEqual([
      '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21',
      '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19',
    ]);
    expect(report.weeklyActivity[7]).toEqual({ weekStart: '2026-10-19', sessions: 1 });
  });

  it('drops sessions older than the window instead of miscounting them', () => {
    const report = calculateProgressAnalytics([session(at(2026, 1, 5), 500)], {
      now: new Date(2026, 9, 21, 12),
    });
    expect(report.totalSessions).toBe(1);
    expect(report.weeklyActivity.reduce((n, w) => n + w.sessions, 0)).toBe(0);
  });
});

describe('summarizeCategoryAnswers', () => {
  const questions: QuestionMeta[] = [
    { id: 1, category: 'TWK', correctAnswer: 'A' },
    { id: 2, category: 'TWK', correctAnswer: 'B' },
    { id: 3, category: 'TIU', correctAnswer: 'A' },
    { id: 4, category: 'TKP', correctAnswer: 'A' },
  ];

  it('marks only questions that were actually answered', () => {
    const summary = summarizeCategoryAnswers({ '1': 'A', '3': 'B', '4': null }, questions);
    const byCat = Object.fromEntries(summary.map((c) => [c.category, c]));
    expect(byCat.TWK).toMatchObject({ answered: 1, correct: 1 });
    expect(byCat.TIU).toMatchObject({ answered: 1, correct: 0 });
    expect(byCat.TKP).toBeUndefined();
  });

  it('flags a conclusion the evidence cannot support', () => {
    const summary = summarizeCategoryAnswers({ '1': 'A', '2': 'B' }, questions);
    expect(summary.find((c) => c.category === 'TWK')?.insufficientData).toBe(true);

    const many = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      category: 'TIU',
      correctAnswer: 'A',
    }));
    const answered = Object.fromEntries(many.map((q, i) => [String(q.id), i < 6 ? 'A' : 'B']));
    const tiu = summarizeCategoryAnswers(answered, many).find((c) => c.category === 'TIU');
    expect(tiu).toMatchObject({ answered: 12, correct: 6, accuracy: 50, insufficientData: false });
  });

  it('sorts categories for a stable layout', () => {
    const summary = summarizeCategoryAnswers({ '1': 'A', '3': 'A', '4': 'A' }, questions);
    expect(summary.map((c) => c.category)).toEqual(['TIU', 'TKP', 'TWK']);
  });
});

describe('localDateKey', () => {
  it('formats the local calendar day, not the UTC one', () => {
    const nearMidnight = new Date(2026, 9, 19, 0, 30);
    expect(localDateKey(nearMidnight)).toBe('2026-10-19');
    expect(nearMidnight.toISOString().slice(0, 10)).not.toBe(localDateKey(nearMidnight));
  });
});
