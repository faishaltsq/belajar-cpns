'use client';

/**
 * Personal Progress Snapshot — a compact read of the exam results the user
 * already has on this device. Feeds `exam_results`-shaped rows through
 * `progressAnalytics` so the numbers come from the same engine the tests pin.
 *
 * It intentionally takes sessions as props instead of fetching anything: the
 * caller (src/app/riwayat/page.tsx) already builds that list from localStorage,
 * and a second, differently-sourced truth would disagree with the history table
 * the user is reading at the same time.
 */

import {
  calculateProgressAnalytics,
  ExamSessionSummary,
} from '@/lib/progressAnalytics';

export interface ProgressSnapshotProps {
  sessions: ExamSessionSummary[];
}

export default function ProgressSnapshotCard({ sessions }: ProgressSnapshotProps) {
  const report = calculateProgressAnalytics(sessions);

  if (report.totalSessions === 0) return null;

  const trendCopy: Record<typeof report.trend, string | null> = {
    improving: 'Skormu naik dibanding tryout sebelumnya.',
    declining: 'Skormu turun dibanding tryout sebelumnya.',
    flat: 'Skormu stabil beberapa tryout terakhir.',
    unknown: null,
  };
  const trendNote = report.insufficientData
    ? 'Selesaikan lebih banyak tryout untuk melihat tren kemajuanmu.'
    : trendCopy[report.trend];

  const busiestWeek = report.weeklyActivity.reduce(
    (best, week) => (week.sessions > best.sessions ? week : best),
    report.weeklyActivity[0] ?? { weekStart: '', sessions: 0 }
  );
  const maxSessions = Math.max(1, busiestWeek.sessions);

  return (
    <section
      aria-labelledby="progress-snapshot-heading"
      className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,#fff)] p-5 shadow-sm"
    >
      <h2 id="progress-snapshot-heading" className="text-base font-semibold text-[var(--primary)]">
        Kemajuanmu
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Tryout selesai</dt>
          <dd className="text-xl font-semibold text-[var(--text)]">{report.totalSessions}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Rata-rata skor</dt>
          <dd className="text-xl font-semibold text-[var(--text)]">{report.averageScore}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Skor terbaik</dt>
          <dd className="text-xl font-semibold text-[var(--text)]">{report.highestScore}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-muted)]">Lulus</dt>
          <dd className="text-xl font-semibold text-[var(--text)]">
            {report.passRate}%
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
              ({report.passCount}/{report.totalSessions})
            </span>
          </dd>
        </div>
      </dl>

      <p className="sr-only" aria-live="polite">
        {trendNote ?? 'Tren kemajuan belum tersedia.'}
      </p>

      <figure className="mt-4">
        <figcaption className="text-xs text-[var(--text-muted)]">Tryout per minggu (8 minggu terakhir)</figcaption>
        <ul className="mt-2 flex items-end gap-1.5" aria-hidden="true">
          {report.weeklyActivity.map((week) => (
            <li
              key={week.weekStart}
              title={`${week.weekStart}: ${week.sessions} tryout`}
              className="w-4 rounded-sm bg-[var(--primary)]/70"
              style={{
                height: `${week.sessions === 0 ? 2 : 8 + Math.round((week.sessions / maxSessions) * 48)}px`,
                opacity: week.sessions === 0 ? 0.25 : 1,
              }}
            />
          ))}
        </ul>
      </figure>

      {trendNote && (
        <p className="mt-4 rounded-xl bg-[var(--muted-bg,#f6f7f9)] px-3 py-2 text-sm text-[var(--text-muted)]">
          {trendNote}
        </p>
      )}
    </section>
  );
}
