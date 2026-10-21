import { describe, it, expect } from 'vitest';
import { calculateDailyMission } from '@/lib/dailyMission';

const now = new Date(2026, 9, 21, 9); // Wednesday, local
const key = (offsetDays: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('calculateDailyMission', () => {
  it('starts the day unmet, with nothing claimed', () => {
    const state = calculateDailyMission([key(1), key(2)], { now });
    expect(state.todayKey).toBe('2026-10-21');
    expect(state.doneToday).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.remaining).toBe(1);
    expect(state.streakContinuesToday).toBe(false);
    expect(state.streak).toBe(2);
  });

  it('is met by the first activity of the day', () => {
    const state = calculateDailyMission([key(0), key(1)], { now });
    expect(state.doneToday).toBe(1);
    expect(state.completed).toBe(true);
    expect(state.remaining).toBe(0);
    expect(state.streakContinuesToday).toBe(true);
  });

  it('counts every activity of the day, not just the first', () => {
    const state = calculateDailyMission([key(0), key(0), key(1)], { now });
    expect(state.doneToday).toBe(2);
    expect(state.completed).toBe(true);
  });

  it('raises a target instead of pretending a lower one was met', () => {
    const state = calculateDailyMission([key(0)], { now, target: 3 });
    expect(state.target).toBe(3);
    expect(state.completed).toBe(false);
    expect(state.remaining).toBe(2);
  });

  it('keeps a zero target impossible — a mission of nothing is no mission', () => {
    const state = calculateDailyMission([], { now, target: 0 });
    expect(state.target).toBe(1);
  });
});
