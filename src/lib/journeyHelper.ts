export function calcStreak(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Jika hari ini belum belajar tapi kemarin belajar, streak masih lanjut
  let current = uniqueDates[0] === today ? today : uniqueDates[0] === yesterday ? yesterday : null;
  if (!current) return 0;

  let streak = 0;
  let checkDate = new Date(current);

  for (const d of uniqueDates) {
    const expected = checkDate.toISOString().slice(0, 10);
    if (d === expected) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else if (d < expected) {
      break;
    }
  }

  return streak;
}
