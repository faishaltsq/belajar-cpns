import { calculateDailyMission } from '@/lib/dailyMission';

/**
 * Daily mission card for /journey. Takes the journey's own activity dates so
 * the mission and the streak shown beside it are computed from one list — a
 * second source would drift the moment one of them changed.
 */

export default function DailyMissionCard({ streakDates }: { streakDates: string[] }) {
  const mission = calculateDailyMission(streakDates);
  const pct = Math.min(100, Math.round((mission.doneToday / mission.target) * 100));

  return (
    <section
      aria-labelledby="daily-mission-heading"
      className="rounded-2xl border border-[var(--card-border,#e5e7eb)] bg-[var(--card-bg,#fff)] p-4"
    >
      <h2 id="daily-mission-heading" className="text-sm font-semibold text-[var(--text)]">
        Misi Harian
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted,#6b7280)]">
        {mission.completed
          ? 'Target hari ini selesai. Kerja bagus!'
          : `Selesaikan ${mission.remaining} aktivitas lagi hari ini.`}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={mission.target}
        aria-valuenow={mission.doneToday}
        aria-label="Progres misi hari ini"
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--muted,#f3f4f6)]"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {mission.completed
          ? 'Misi harian hari ini selesai.'
          : `Misi harian hari ini belum selesai, ${mission.doneToday} dari ${mission.target}.`}
      </p>
    </section>
  );
}
