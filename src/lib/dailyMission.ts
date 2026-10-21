/**
 * Daily mission (Phase 6, Feature 3).
 *
 * Pure and deterministic. Streak arithmetic is not re-implemented here: it is
 * `calcStreak` from journeyHelper, so the mission and the /journey streak can
 * never drift apart — they read the same dates and the same local calendar
 * (`localDateKey`), which is why an ISO-UTC date must never be used for it.
 */

import { calcStreak, localDateKey } from '@/lib/journeyHelper';

export const DEFAULT_DAILY_TARGET = 1;

export interface DailyMissionState {
  todayKey: string;
  target: number;
  doneToday: number;
  remaining: number;
  completed: boolean;
  streak: number;
  streakContinuesToday: boolean; // the streak survives today only if it was fed today
}

export function calculateDailyMission(
  activityDates: string[],
  opts: { now?: Date; target?: number } = {}
): DailyMissionState {
  const now = opts.now ?? new Date();
  const target = Math.max(1, opts.target ?? DEFAULT_DAILY_TARGET);
  const todayKey = localDateKey(now);

  const doneToday = activityDates.filter((key) => key === todayKey).length;

  return {
    todayKey,
    target,
    doneToday,
    remaining: Math.max(0, target - doneToday),
    completed: doneToday >= target,
    streak: calcStreak(activityDates, now),
    streakContinuesToday: doneToday > 0,
  };
}
