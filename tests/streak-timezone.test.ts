import { describe, it, expect } from 'vitest';
import { calcStreak, localDateKey, previousDayKey } from '@/lib/journeyHelper';

/**
 * Regression: the journey page records streak days with its *local* date
 * (`todayStr()` in `src/app/journey/page.tsx`), while `calcStreak` compared them
 * against a UTC "today". For a learner in UTC+7 the two differ for seven hours
 * every day, and the counter returned 0 even though the page showed today as
 * logged. Every expectation below is built with `localDateKey`, so it holds in
 * any timezone and fails against the old UTC comparison whenever local ≠ UTC.
 */
const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0);

describe('calcStreak against the dates the journey page writes', () => {
  it('counts the entry written for today, at every hour of the day', () => {
    for (const [h, min] of [
      [0, 5],
      [1, 30],
      [7, 5],
      [12, 0],
      [23, 59],
    ] as const) {
      const now = local(2026, 10, 21, h, min);
      expect(calcStreak([localDateKey(now)], now), `at ${h}:${min}`).toBe(1);
    }
  });

  it('keeps yesterday-only activity as an unbroken streak', () => {
    const now = local(2026, 10, 21, 1, 30);
    const dates = [localDateKey(local(2026, 10, 20)), localDateKey(local(2026, 10, 19))];
    expect(calcStreak(dates, now)).toBe(2);
  });

  it('returns 0 when the newest entry is in the future or long past', () => {
    const now = local(2026, 10, 21, 12);
    expect(calcStreak([localDateKey(local(2026, 10, 23))], now)).toBe(0);
    expect(calcStreak([localDateKey(local(2026, 10, 17))], now)).toBe(0);
  });

  it('returns 0 for an empty history', () => {
    expect(calcStreak([], local(2026, 10, 21))).toBe(0);
    expect(calcStreak([], local(2026, 10, 21, 1, 30))).toBe(0);
    expect(calcStreak(undefined as unknown as string[], local(2026, 10, 21))).toBe(0);
  });

  it('breaks the run at a gap instead of counting across it', () => {
    const now = local(2026, 10, 21);
    const dates = [localDateKey(local(2026, 10, 21)), localDateKey(local(2026, 10, 18))];
    expect(calcStreak(dates, now)).toBe(1);
  });

  it('ignores duplicate entries for the same day', () => {
    const now = local(2026, 10, 21);
    const dates = [
      localDateKey(local(2026, 10, 21)),
      localDateKey(local(2026, 10, 21)),
      localDateKey(local(2026, 10, 20)),
    ];
    expect(calcStreak(dates, now)).toBe(2);
  });
});

describe('local date keys', () => {
  it('formats the local calendar day, not the UTC one', () => {
    const now = local(2026, 10, 21, 1, 30);
    expect(localDateKey(now)).toBe('2026-10-21');
    expect(localDateKey(now).length).toBe(10);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(localDateKey(now))).toBe(true);
  });

  it('steps backward across month, year and leap-day boundaries', () => {
    expect(previousDayKey('2026-11-01')).toBe('2026-10-31');
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
    expect(previousDayKey('2028-03-01')).toBe('2028-02-29');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDayKey('2026-10-21')).toBe('2026-10-20');
  });

  it('round-trips through the streak for a full month', () => {
    const now = local(2026, 11, 1, 2);
    const dates: string[] = [];
    for (let d = 1; d <= 31; d++) dates.push(localDateKey(local(2026, 10, d, 2)));
    expect(calcStreak(dates, now)).toBe(31);
  });
});
