/**
 * Clock arithmetic for a paused practice paper.
 *
 * The exam deadline is stored as an absolute wall-clock timestamp so that a
 * reload, a crash, or a closed tab cannot extend it. Pausing is the one thing
 * that legitimately moves that timestamp forward: <Timer/> stops counting, but
 * the deadline is what the next reload and the final `durationUsed` are read
 * from, so a pause that only stops the display still charges the learner for
 * the minutes they were away.
 *
 * Both helpers are pure and take `now` as an argument so the behaviour can be
 * tested without a clock.
 */

/**
 * New deadline after a pause that lasted `pausedForMs`.
 *
 * Returns the original deadline unchanged when the pause is nonsense (negative,
 * or longer than the whole paper — a stale marker left by an abandoned attempt,
 * which would otherwise push the deadline past `now` and auto-submit a fresh
 * paper the instant it opens).
 */
export function shiftDeadlineForPause(
  deadlineMs: number,
  pausedForMs: number,
  examDurationSec: number
): number {
  if (!Number.isFinite(deadlineMs)) return deadlineMs;
  if (!Number.isFinite(pausedForMs) || pausedForMs <= 0) return deadlineMs;
  if (pausedForMs > examDurationSec * 1000) return deadlineMs;
  return deadlineMs + pausedForMs;
}

/**
 * Seconds already spent on a paper, given its start timestamp.
 *
 * Clamped to [0, examDurationSec]: a clock that moved backwards must not yield
 * a negative elapsed time (which would hand out free minutes), and a paper left
 * open overnight must not report more than the paper's own length.
 */
export function elapsedSeconds(
  startMs: number,
  nowMs: number,
  examDurationSec: number
): number {
  if (!Number.isFinite(startMs)) return 0;
  const raw = Math.floor((nowMs - startMs) / 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, examDurationSec);
}
