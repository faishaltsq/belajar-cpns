import { describe, it, expect } from 'vitest';

interface RankEntry {
  userId: string;
  totalScore: number;
  scoreTkp: number;
  scoreTiu: number;
  scoreTwk: number;
  durationUsed: number;
}

function sortLeaderboard(entries: RankEntry[]): RankEntry[] {
  return [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.scoreTkp !== a.scoreTkp) return b.scoreTkp - a.scoreTkp;
    if (b.scoreTiu !== a.scoreTiu) return b.scoreTiu - a.scoreTiu;
    if (b.scoreTwk !== a.scoreTwk) return b.scoreTwk - a.scoreTwk;
    return a.durationUsed - b.durationUsed;
  });
}

describe('BKN Tie-breaker rule', () => {
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

  it('mengurutkan berdasarkan durasi tercepat jika semua skor sama', () => {
    const list: RankEntry[] = [
      { userId: 'P', totalScore: 350, scoreTkp: 166, scoreTiu: 90, scoreTwk: 94, durationUsed: 5500 },
      { userId: 'Q', totalScore: 350, scoreTkp: 166, scoreTiu: 90, scoreTwk: 94, durationUsed: 4200 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('Q'); // Q lebih cepat
  });
});
