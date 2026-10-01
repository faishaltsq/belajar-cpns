import { describe, it, expect } from 'vitest';
import { sortLeaderboard, RankEntry } from '@/lib/leaderboard';

describe('BKN Tie-breaker rule (Kepmen PANRB 321/2024)', () => {
  it('mengurutkan berdasarkan TKP jika total skor sama', () => {
    const list: RankEntry[] = [
      { userId: 'A', totalScore: 400, scoreTkp: 170, scoreTiu: 130, scoreTwk: 100, durationUsed: 5000 },
      { userId: 'B', totalScore: 400, scoreTkp: 185, scoreTiu: 120, scoreTwk: 95, durationUsed: 5200 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('B'); // B menang karena TKP 185 > 170
  });

  it('mengurutkan berdasarkan TIU jika total dan TKP sama', () => {
    const list: RankEntry[] = [
      { userId: 'X', totalScore: 380, scoreTkp: 166, scoreTiu: 95, scoreTwk: 119, durationUsed: 4000 },
      { userId: 'Y', totalScore: 380, scoreTkp: 166, scoreTiu: 110, scoreTwk: 104, durationUsed: 4500 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('Y'); // Y menang karena TIU 110 > 95
  });

  it('mengurutkan berdasarkan TWK jika total, TKP, dan TIU sama', () => {
    const list: RankEntry[] = [
      { userId: 'M', totalScore: 360, scoreTkp: 166, scoreTiu: 100, scoreTwk: 95, durationUsed: 5000 },
      { userId: 'N', totalScore: 360, scoreTkp: 166, scoreTiu: 100, scoreTwk: 90, durationUsed: 4800 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('M'); // M menang karena TWK 95 > 90
  });

  it('mengurutkan berdasarkan durasi tercepat jika semua skor sama', () => {
    const list: RankEntry[] = [
      { userId: 'P', totalScore: 350, scoreTkp: 166, scoreTiu: 90, scoreTwk: 94, durationUsed: 5500 },
      { userId: 'Q', totalScore: 350, scoreTkp: 166, scoreTiu: 90, scoreTwk: 94, durationUsed: 4200 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('Q'); // Q lebih cepat
  });
});
