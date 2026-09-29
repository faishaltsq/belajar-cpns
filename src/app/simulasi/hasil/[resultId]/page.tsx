'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExamResult } from '@/lib/types';
import { CheckCircle, XCircle, Trophy, ArrowCounterClockwise } from '@phosphor-icons/react';

export default function HasilPage({ params }: { params: { resultId: string } }) {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Extract tryout ID from resultId (format: tryoutId + '-' + timestamp)
  const tryoutId = params.resultId.split('-').slice(0, -1).join('-');
  const retryPath = tryoutId ? `/simulasi/${tryoutId}` : '/simulasi/tryout-1';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`exam_result_${params.resultId}`);
      if (raw) {
        setResult(JSON.parse(raw));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
  }, [params.resultId]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-lg mb-4">Hasil ujian tidak ditemukan.</p>
          <Link
            href={retryPath}
            className="text-purple-500 hover:underline"
          >
            Kembali ke simulasi
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Memuat hasil...
      </div>
    );
  }

  const categories = [
    { key: 'twk', label: 'TWK', data: result.twk, color: 'blue' },
    { key: 'tiu', label: 'TIU', data: result.tiu, color: 'purple' },
    { key: 'tkp', label: 'TKP', data: result.tkp, color: 'emerald' },
  ] as const;

  const colorMap = {
    blue: {
      badge: 'bg-blue-100 text-blue-600 border-blue-200',
      bar: 'bg-blue-500',
    },
    purple: {
      badge: 'bg-purple-100 text-purple-600 border-purple-200',
      bar: 'bg-purple-500',
    },
    emerald: {
      badge: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      bar: 'bg-emerald-500',
    },
  };

  const minutes = Math.floor(result.durationSeconds / 60);
  const seconds = result.durationSeconds % 60;

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-10">
      <div className="max-w-2xl w-full space-y-6">
        {/* Passing banner */}
        <div
          className={`clay-card p-6 text-center ${
            result.isPassedAll
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-red-50/80 border-red-200'
          }`}
        >
          <div className="flex justify-center mb-3">
            {result.isPassedAll ? (
              <Trophy size={48} className="text-emerald-500" weight="duotone" />
            ) : (
              <XCircle size={48} className="text-red-400" weight="duotone" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1 text-slate-800">
            {result.isPassedAll ? '🎉 SELAMAT! ANDA LULUS PASSING GRADE' : 'BELUM MEMENUHI PASSING GRADE'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Diselesaikan dalam {minutes}m {seconds}s
          </p>
        </div>

        {/* Total Score */}
        <div className="clay-card p-6 text-center">
          <p className="text-slate-400 text-sm mb-1">Total Skor</p>
          <div className="text-5xl font-bold text-slate-800">{result.totalScore}</div>
          <p className="text-slate-400 text-sm mt-1">dari 550</p>
          {/* progress bar */}
          <div className="mt-4 bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-purple-500 h-2.5 rounded-full transition-all"
              style={{ width: `${(result.totalScore / 550) * 100}%` }}
            />
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map(({ label, data, color }) => {
            const colors = colorMap[color];
            const pct = Math.min((data.score / data.maxScore) * 100, 100);
            return (
              <div
                key={label}
                className="clay-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors.badge}`}>
                    {label}
                  </span>
                  {data.isPassed ? (
                    <CheckCircle size={20} className="text-emerald-500" weight="duotone" />
                  ) : (
                    <XCircle size={20} className="text-red-400" weight="duotone" />
                  )}
                </div>
                <div>
                  <span className="text-3xl font-bold text-slate-800">{data.score}</span>
                  <span className="text-slate-400 text-sm"> / {data.maxScore}</span>
                </div>
                <div className="bg-slate-200 rounded-full h-1.5">
                  <div className={`${colors.bar} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>PG {data.passingGrade}</span>
                  <span
                    className={`font-semibold ${data.isPassed ? 'text-emerald-500' : 'text-red-400'}`}
                  >
                    {data.isPassed ? 'Lulus' : 'Tidak Lulus'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href={retryPath}
          className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-purple-500 hover:bg-purple-400 text-white font-semibold rounded-2xl transition clay-button"
        >
          <ArrowCounterClockwise size={16} weight="bold" />
          Coba Simulasi Lagi
        </Link>
      </div>
    </div>
  );
}
