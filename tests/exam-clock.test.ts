import { describe, it, expect } from 'vitest';
import { elapsedSeconds, shiftDeadlineForPause } from '@/lib/examClock';

const MIN = 60_000;

describe('shiftDeadlineForPause', () => {
  it('credits a normal pause onto the deadline', () => {
    const start = 1_700_000_000_000;
    expect(shiftDeadlineForPause(start, 5 * MIN, 6000)).toBe(start + 5 * MIN);
  });

  it('leaves the deadline untouched for a non-positive pause', () => {
    const start = 1_700_000_000_000;
    expect(shiftDeadlineForPause(start, 0, 6000)).toBe(start);
    expect(shiftDeadlineForPause(start, -90_000, 6000)).toBe(start);
  });

  it('rejects a stale pause marker older than the whole paper', () => {
    // Left behind by an abandoned attempt: crediting a two-day-old marker would
    // push the deadline into the future and auto-submit a fresh paper on open.
    const start = 1_700_000_000_000;
    const twoDays = 48 * 60 * MIN;
    expect(shiftDeadlineForPause(start, twoDays, 6000)).toBe(start);
  });

  it('accepts a pause exactly as long as the paper', () => {
    const start = 1_700_000_000_000;
    expect(shiftDeadlineForPause(start, 6000 * 1000, 6000)).toBe(start + 6000 * 1000);
  });

  it('does not turn a NaN deadline into a bogus one', () => {
    expect(shiftDeadlineForPause(NaN, 5 * MIN, 6000)).toBe(NaN);
    expect(shiftDeadlineForPause(1_700_000_000_000, NaN, 6000)).toBe(1_700_000_000_000);
  });
});

describe('elapsedSeconds', () => {
  it('counts whole seconds between start and now', () => {
    const start = 1_700_000_000_000;
    expect(elapsedSeconds(start, start + 90_000, 6000)).toBe(90);
  });

  it('clamps to the paper length instead of growing without bound', () => {
    const start = 1_700_000_000_000;
    expect(elapsedSeconds(start, start + 3 * 60 * MIN, 6000)).toBe(6000);
  });

  it('returns 0 when the clock moved backwards', () => {
    // Negative elapsed previously produced initialSeconds > examDuration —
    // a paper that handed out free minutes after a clock skew.
    const start = 1_700_000_000_000;
    expect(elapsedSeconds(start, start - 5 * MIN, 6000)).toBe(0);
  });

  it('returns 0 for a garbage start timestamp', () => {
    expect(elapsedSeconds(NaN, Date.now(), 6000)).toBe(0);
    expect(elapsedSeconds(Infinity, Date.now(), 6000)).toBe(0);
  });

  it('a paper that has never started reports no elapsed time', () => {
    const start = 1_700_000_000_000;
    expect(elapsedSeconds(start, start, 6000)).toBe(0);
  });
});
