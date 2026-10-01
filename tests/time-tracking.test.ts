import { describe, it, expect } from 'vitest';
import { calculateTimePerQuestion, classifyTime } from '@/lib/timeTracker';

describe('timeTracker', () => {
  it('accumulates time spent across visits to same question', () => {
    const base = 1000000;
    const events = [
      { questionIndex: 0, timestamp: base },
      { questionIndex: 1, timestamp: base + 30000 }, // Q0 got 30s
      { questionIndex: 0, timestamp: base + 60000 }, // Q1 got 30s
    ];
    // Ended at base + 90000 -> Q0 got another 30s -> total 60s
    const map = calculateTimePerQuestion(events, base + 90000);
    expect(map.get(0)).toBe(60);
    expect(map.get(1)).toBe(30);
  });

  it('classifies time correctly', () => {
    expect(classifyTime(30)).toBe('efficient');
    expect(classifyTime(75)).toBe('normal');
    expect(classifyTime(120)).toBe('trap');
  });
});
