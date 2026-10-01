export interface RankEntry {
  userId: string;
  totalScore: number;
  scoreTkp: number;
  scoreTiu: number;
  scoreTwk: number;
  durationUsed: number;
}

/**
 * BKN tie-breaker order (Kepmen PANRB 321/2024):
 *   1. Total score descending
 *   2. TKP score descending
 *   3. TIU score descending
 *   4. TWK score descending
 *   5. Duration used ascending (faster wins)
 */
export function sortLeaderboard(entries: RankEntry[]): RankEntry[] {
  return [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.scoreTkp !== a.scoreTkp) return b.scoreTkp - a.scoreTkp;
    if (b.scoreTiu !== a.scoreTiu) return b.scoreTiu - a.scoreTiu;
    if (b.scoreTwk !== a.scoreTwk) return b.scoreTwk - a.scoreTwk;
    return a.durationUsed - b.durationUsed;
  });
}
