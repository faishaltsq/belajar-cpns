'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Medal, Clock, Users } from '@phosphor-icons/react';

export interface LeaderboardEntry {
  rank: number;
  user_id: string | null;
  user_name?: string | null;
  total_score: number;
  score_tkp: number;
  score_tiu: number;
  score_twk: number;
  duration_used: number | null;
  is_passed: boolean;
  finished_at: string;
  attempt_count: number;
}

interface LeaderboardCardProps {
  packageId: string;
  /** Server result id of the run being viewed — lets the API return this row even outside the top 50. */
  resultId?: string | null;
  currentScore?: number;
}

function fmtDuration(secs: number | null) {
  if (!secs) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

const sameRow = (a: LeaderboardEntry, b: LeaderboardEntry) =>
  a.rank === b.rank && a.total_score === b.total_score && a.finished_at === b.finished_at;

export function LeaderboardCard({ packageId, resultId, currentScore }: LeaderboardCardProps) {
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    const qs = resultId ? `?resultId=${encodeURIComponent(resultId)}` : '';
    fetch(`/api/leaderboard/${encodeURIComponent(packageId)}${qs}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        setList(d.leaderboard ?? []);
        setMe(d.me ?? null);
        setTotal(d.totalParticipants ?? 0);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [packageId, resultId]);

  // Peringkat datang sudah jadi dari server (tie-breaker BKN, satu baris per
  // peserta). Kode lama menurunkan peringkat dari indeks array, sehingga
  // bergeser begitu ada nilai seri atau ada baris di luar halaman ini.
  const meInList = useMemo(
    () => (me ? list.some((e) => sameRow(e, me)) : false),
    [list, me]
  );

  const percentile = me && total > 0
    ? Math.max(1, Math.round(((total - me.rank + 1) / total) * 100))
    : null;

  if (loading) {
    return (
      <div className="card-modern p-6 text-center text-xs text-[var(--muted-foreground)] animate-pulse">
        Memuat leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern p-6 text-center text-xs text-[var(--muted-foreground)]">
        Gagal memuat papan peringkat. Coba muat ulang halaman.
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="card-modern p-6 text-center text-xs text-[var(--muted-foreground)]">
        <Users size={28} className="mx-auto mb-2 opacity-40" />
        Belum ada peserta di paket ini. Jadilah yang pertama!
      </div>
    );
  }

  return (
    <div className="card-modern overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Trophy size={18} weight="duotone" className="text-[var(--primary)]" />
          <span className="font-bold text-sm text-[var(--foreground)]">Leaderboard Nasional</span>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{total} peserta</span>
      </div>

      {/* User rank badge */}
      {me && percentile != null && (
        <div
          className="px-5 py-3 flex items-center gap-3 text-xs border-b"
          style={{
            background: 'rgba(201, 100, 66, 0.05)',
            borderColor: 'rgba(201, 100, 66, 0.2)',
          }}
        >
          <Medal size={16} className="text-[var(--primary)] shrink-0" weight="duotone" />
          <span className="text-[var(--foreground)]">
            Posisi Anda:{' '}
            <span className="font-bold text-[var(--primary)]">#{me.rank}</span>{' '}
            dari {total} — Top {percentile}%
            {me.attempt_count > 1 && (
              <span className="text-[var(--muted-foreground)]">
                {' '}· nilai terbaik dari {me.attempt_count} percobaan
              </span>
            )}
            {!meInList && (
              <span className="text-[var(--muted-foreground)]"> · di luar 50 besar</span>
            )}
          </span>
        </div>
      )}

      {/* Papan ini hanya memuat satu paket — sebutkan yang mana, supaya skor
          yang tampil tidak pernah tertukar dengan paket lain. */}
      <div
        className="px-5 py-2 text-[11px] text-[var(--muted-foreground)] border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        Peringkat paket{' '}
        <span className="font-semibold text-[var(--foreground)]">{packageId}</span>
        {' '}· satu baris per peserta (nilai terbaik)
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
            >
              <th className="px-4 py-2.5 text-left font-semibold text-[var(--muted-foreground)] w-10">#</th>
              <th className="px-4 py-2.5 text-left font-semibold text-[var(--muted-foreground)]">Peserta</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--muted-foreground)]">Total</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--muted-foreground)] hidden sm:table-cell">TWK</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--muted-foreground)] hidden sm:table-cell">TIU</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--muted-foreground)] hidden sm:table-cell">TKP</th>
              <th className="px-4 py-2.5 text-right font-semibold text-[var(--muted-foreground)]">
                <Clock size={11} className="inline" /> Waktu
              </th>
              <th className="px-4 py-2.5 text-center font-semibold text-[var(--muted-foreground)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((entry) => {
              const isMe = me != null && sameRow(entry, me);
              return (
                <tr
                  key={`${entry.rank}-${entry.user_id ?? entry.finished_at}`}
                  className="border-b transition-colors hover:bg-[var(--muted)]"
                  style={{
                    borderColor: 'var(--border)',
                    ...(isMe ? { background: 'rgba(201, 100, 66, 0.07)' } : {}),
                  }}
                >
                  <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                    {entry.rank <= 3 ? MEDAL[entry.rank - 1] : entry.rank}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)] max-w-[140px]">
                    <span className="truncate block text-xs font-medium">
                      {entry.user_name || 'Peserta Anonim'}
                      {isMe && (
                        <span className="ml-1 text-[10px] font-bold text-[var(--primary)]">(Anda)</span>
                      )}
                    </span>
                    {entry.attempt_count > 1 && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {entry.attempt_count}× percobaan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--foreground)]">
                    {entry.total_score}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)] hidden sm:table-cell">
                    {entry.score_twk}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)] hidden sm:table-cell">
                    {entry.score_tiu}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)] hidden sm:table-cell">
                    {entry.score_tkp}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                    {fmtDuration(entry.duration_used)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        entry.is_passed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {entry.is_passed ? 'LULUS' : 'BELUM'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Baris milik sendiri di luar 50 besar tetap ditampilkan di kaki papan,
          bukan hilang tanpa jejak. */}
      {me && !meInList && (
        <div
          className="px-4 py-3 border-t flex items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'var(--border)', background: 'rgba(201, 100, 66, 0.07)' }}
        >
          <span className="font-bold text-[var(--foreground)]">#{me.rank}</span>
          <span className="flex-1 truncate font-medium text-[var(--foreground)]">
            {me.user_name || 'Peserta Anonim'}
            <span className="ml-1 text-[10px] font-bold text-[var(--primary)]">(Anda)</span>
          </span>
          <span className="font-bold text-[var(--foreground)]">{me.total_score}</span>
          <span className="text-[var(--muted-foreground)]">{fmtDuration(me.duration_used)}</span>
        </div>
      )}

      {currentScore != null && me == null && (
        <div
          className="px-5 py-2.5 text-[11px] text-[var(--muted-foreground)] border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          Hasil ini tidak tercatat di papan peringkat. Hanya hasil Tryout Resmi
          yang masuk perankingan — Mode Latihan Mandiri tidak dikirim ke server.
        </div>
      )}
    </div>
  );
}
