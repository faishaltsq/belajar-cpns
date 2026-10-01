'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Clock, Users } from '@phosphor-icons/react';

interface LeaderboardEntry {
  id: string;
  user_name?: string | null;
  total_score: number;
  score_tkp: number;
  score_tiu: number;
  score_twk: number;
  duration_used: number | null;
  is_passed: boolean;
  finished_at: string;
}

interface LeaderboardCardProps {
  packageId: string;
  currentScore?: number;
}

function fmtDuration(secs: number | null) {
  if (!secs) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function LeaderboardCard({ packageId, currentScore }: LeaderboardCardProps) {
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/leaderboard/${packageId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setList(d.leaderboard ?? []);
        setTotal(d.totalParticipants ?? 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [packageId]);

  // Find user's rank by matching currentScore (approximate — no user ID in local session)
  const userRank = currentScore != null
    ? (list.findIndex((e) => e.total_score <= currentScore) + 1) || total + 1
    : null;

  const percentile = userRank && total > 0
    ? Math.round(((total - userRank + 1) / total) * 100)
    : null;

  if (loading) {
    return (
      <div className="card-modern p-6 text-center text-xs text-[var(--muted-foreground)] animate-pulse">
        Memuat leaderboard...
      </div>
    );
  }

  if (error || list.length === 0) {
    return (
      <div className="card-modern p-6 text-center text-xs text-[var(--muted-foreground)]">
        <Users size={28} className="mx-auto mb-2 opacity-40" />
        Belum ada peserta lain. Jadilah yang pertama!
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
      {userRank && percentile != null && (
        <div
          className="px-5 py-3 flex items-center gap-3 text-xs border-b"
          style={{
            background: 'rgba(201, 100, 66, 0.05)',
            borderColor: 'rgba(201, 100, 66, 0.2)',
          }}
        >
          <Medal size={16} className="text-[var(--primary)] shrink-0" weight="duotone" />
          <span className="text-[var(--foreground)]">
            Perkiraan posisi Anda:{' '}
            <span className="font-bold text-[var(--primary)]">#{userRank}</span>{' '}
            dari {total} — Top {percentile}%
          </span>
        </div>
      )}

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
            {list.slice(0, 20).map((entry, i) => (
              <tr
                key={entry.id}
                className="border-b transition-colors hover:bg-[var(--muted)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                  {i < 3 ? MEDAL[i] : `${i + 1}`}
                </td>
                <td className="px-4 py-3 text-[var(--foreground)] max-w-[120px]">
                  <span className="truncate block text-xs font-medium">
                    {entry.user_name || 'Peserta Anonim'}
                  </span>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
