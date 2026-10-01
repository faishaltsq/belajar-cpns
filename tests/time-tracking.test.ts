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

  it('classifies time correctly for typical values', () => {
    expect(classifyTime(30)).toBe('efficient');
    expect(classifyTime(75)).toBe('normal');
    expect(classifyTime(120)).toBe('trap');
  });

  it('classifies time correctly at threshold boundaries', () => {
    // Lower threshold: efficient if < 50
    expect(classifyTime(49)).toBe('efficient');
    expect(classifyTime(50)).toBe('normal'); // exact boundary
    expect(classifyTime(51)).toBe('normal');
    // Upper threshold: normal if <= 90
    expect(classifyTime(89)).toBe('normal');
    expect(classifyTime(90)).toBe('normal'); // exact boundary (<=90)
    expect(classifyTime(91)).toBe('trap');
  });
});
