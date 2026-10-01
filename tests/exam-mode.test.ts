import { describe, it, expect } from 'vitest';
import { EXAM_MODES, ExamType } from '@/lib/examMode';

describe('Exam Modes Configuration', () => {
  it('official mode has strict constraints', () => {
    const official = EXAM_MODES.official;
    expect(official.canPause).toBe(false);
    expect(official.strictTimer).toBe(true);
    expect(official.detectTabSwitch).toBe(true);
    expect(official.publishToLeaderboard).toBe(true);
  });

  it('practice mode allows pause and draft saving', () => {
    const practice = EXAM_MODES.practice;
    expect(practice.canPause).toBe(true);
    expect(practice.strictTimer).toBe(false);
    expect(practice.detectTabSwitch).toBe(false);
    expect(practice.publishToLeaderboard).toBe(false);
  });
});
