// src/lib/timeTracker.ts
// Pure function untuk tracking durasi per soal

/**
 * Hitung akumulasi detik yang dihabiskan user di setiap soal.
 * Input: array timestamped events [{questionIndex, timestamp}] dan waktu akhir.
 * Output: Map<questionIndex, totalSeconds>
 */
export function calculateTimePerQuestion(
  events: Array<{ questionIndex: number; timestamp: number }>,
  endTimestamp: number
): Map<number, number> {
  const result = new Map<number, number>();

  if (events.length === 0) return result;

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const nextTime = i + 1 < events.length ? events[i + 1].timestamp : endTimestamp;
    const delta = Math.max(0, Math.floor((nextTime - current.timestamp) / 1000));
    // Cap per-visit ke 180 detik untuk menghindari AFK inflation
    const capped = Math.min(delta, 180);
    result.set(
      current.questionIndex,
      (result.get(current.questionIndex) ?? 0) + capped
    );
  }

  return result;
}

export type TimeCategory = 'efficient' | 'normal' | 'trap';

/** Klasifikasi durasi per soal */
export function classifyTime(seconds: number): TimeCategory {
  if (seconds < 50) return 'efficient';
  if (seconds <= 90) return 'normal';
  return 'trap';
}

export const TIME_LABELS: Record<TimeCategory, { label: string; color: string }> = {
  efficient: { label: 'Efisien', color: 'text-emerald-600' },
  normal: { label: 'Wajar', color: 'text-amber-600' },
  trap: { label: 'Time Trap', color: 'text-red-600' },
};
