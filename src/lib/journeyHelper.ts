/**
 * Streak arithmetic for the Roadmap Belajar.
 *
 * Dates are calendar dates in the learner's own timezone. `src/app/journey`
 * writes them with its local `todayStr()`, so comparing them against a UTC
 * "today" — which is what this module did — made the counter read 0 for up to
 * seven hours every day: between 00:00 and 07:00 WIB the stored "today" is the
 * next UTC date, so no entry could match, even though the page itself still
 * showed the day as logged.
 */

/** "2026-10-21" for the machine's local calendar day. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar day before a "YYYY-MM-DD" key, stepped as a local date. */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

/**
 * Consecutive days ending at `now` — or at yesterday, when today has not been
 * logged yet. `now` is injectable so a test can pin the clock.
 */
export function calcStreak(dates: string[], now: Date = new Date()): number {
  if (!dates || dates.length === 0) return 0;
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  const today = localDateKey(now);
  const yesterday = previousDayKey(today);

  // Jika hari ini belum belajar tapi kemarin belajar, streak masih lanjut
  const current = uniqueDates[0] === today ? today : uniqueDates[0] === yesterday ? yesterday : null;
  if (!current) return 0;

  let streak = 0;
  let expected = current;
  for (const d of uniqueDates) {
    if (d === expected) {
      streak++;
      expected = previousDayKey(expected);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}
