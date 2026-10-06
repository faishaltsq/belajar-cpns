'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ExamResult, Question, ExamAnswer } from '@/lib/types';
import { calculateSubcategoryDiagnostic } from '@/lib/diagnostic';
import { ExamQuestionReview } from '@/components/ExamQuestionReview';
import { DiagnosticReportCard } from '@/components/DiagnosticReportCard';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import {
  CheckCircle,
  XCircle,
  Trophy,
  ArrowCounterClockwise,
  UserPlus,
  ShieldCheck,
  ChartBar,
  ListDashes,
  Ranking,
  House,
  CaretLeft,
} from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';

export default function HasilPage({ params }: { params: { resultId: string } }) {
  const { user, loading: userLoading } = useUser();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<ExamAnswer[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'review' | 'leaderboard'>('summary');
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});

  const tryoutId = params.resultId.split('-').slice(0, -1).join('-');
  const retryPath = tryoutId ? `/simulasi/${tryoutId}` : '/simulasi/tryout-1';

  const userId = user?.id ?? null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(scopedKey(`exam_result_${params.resultId}`, userId));
      if (raw) {
        setResult(JSON.parse(raw));
      } else {
        setNotFound(true);
      }
      const rawQ = localStorage.getItem(scopedKey(`exam_questions_${params.resultId}`, userId));
      const rawA = localStorage.getItem(scopedKey(`exam_user_answers_${params.resultId}`, userId));
      if (rawQ) setQuestions(JSON.parse(rawQ));
      if (rawA) setUserAnswers(JSON.parse(rawA));
      const rawTime = localStorage.getItem(scopedKey(`exam_time_per_q_${params.resultId}`, userId));
      if (rawTime) setTimeSpent(JSON.parse(rawTime));
    } catch {
      setNotFound(true);
    }
  }, [params.resultId, userId]);

  const diagnostic = useMemo(() => {
    if (!questions.length) return null;
    return calculateSubcategoryDiagnostic(questions, userAnswers);
  }, [questions, userAnswers]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        <div className="text-center">
          <p className="text-lg mb-4">Hasil ujian tidak ditemukan.</p>
          <Link href={retryPath} className="text-[var(--primary)] hover:underline">
            Kembali ke simulasi
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Memuat hasil...
      </div>
    );
  }

  const categories = [
    { label: 'TWK', data: result.twk },
    { label: 'TIU', data: result.tiu },
    { label: 'TKP', data: result.tkp },
  ] as const;

  const minutes = Math.floor(result.durationSeconds / 60);
  const seconds = result.durationSeconds % 60;

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8">
      <div className="max-w-3xl w-full space-y-5">
        {/* Top Breadcrumb / Back Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/simulasi"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-[var(--muted)] transition"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <CaretLeft size={14} weight="bold" />
            <span>Kembali ke Menu Utama</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
          >
            <House size={14} />
            <span>Beranda</span>
          </Link>
        </div>

        {/* Auth banner */}
        {!userLoading && (
          user ? (
            <div
              className="px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 rounded-xl border"
              style={{ background: '#f0fdf4', borderColor: '#86efac' }}
            >
              <ShieldCheck size={18} weight="duotone" />
              <span className="font-medium">Hasil tersimpan di Akun Anda</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="card-modern flex items-center gap-3 px-5 py-4 hover:bg-[var(--muted)] transition group"
            >
              <UserPlus size={24} weight="duotone" className="text-[var(--foreground)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Ingin simpan hasil ujian ini secara permanen?
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Daftar gratis untuk menyimpan riwayat &amp; grafik progres
                </p>
              </div>
              <span className="text-[var(--foreground)] text-sm font-semibold shrink-0 group-hover:underline">
                Daftar Akun Gratis →
              </span>
            </Link>
          )
        )}

        {/* Passing Banner */}
        <div
          className="p-6 text-center rounded-2xl border"
          style={{
            background: result.isPassedAll ? '#f0fdf4' : '#fff5f5',
            borderColor: result.isPassedAll ? '#86efac' : '#fca5a5',
          }}
        >
          <div className="flex justify-center mb-3">
            {result.isPassedAll ? (
              <Trophy size={48} className="text-emerald-500" weight="duotone" />
            ) : (
              <XCircle size={48} className="text-red-400" weight="duotone" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1 text-[var(--foreground)]">
            {result.isPassedAll ? '🎉 SELAMAT! ANDA LULUS PASSING GRADE' : 'BELUM MEMENUHI PASSING GRADE'}
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Diselesaikan dalam {minutes}m {seconds}s
          </p>
        </div>

        {/* Total Score */}
        <div className="card-modern p-6 text-center">
          <p className="text-[var(--muted-foreground)] text-sm mb-1">Total Skor</p>
          <div className="text-5xl font-bold text-[var(--foreground)]">{result.totalScore}</div>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">dari 550</p>
          <div className="mt-4 rounded-full h-2.5" style={{ background: 'var(--muted)' }}>
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ width: `${(result.totalScore / 550) * 100}%`, backgroundColor: 'var(--primary)' }}
            />
          </div>
        </div>

        {/* Category Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map(({ label, data }) => {
            const pct = Math.min((data.score / data.maxScore) * 100, 100);
            return (
              <div key={label} className="card-modern p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full border font-bold text-[var(--foreground)]"
                    style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}
                  >
                    {label}
                  </span>
                  {data.isPassed ? (
                    <CheckCircle size={20} className="text-emerald-500" weight="duotone" />
                  ) : (
                    <XCircle size={20} className="text-red-400" weight="duotone" />
                  )}
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--foreground)]">{data.score}</span>
                  <span className="text-[var(--muted-foreground)] text-sm"> / {data.maxScore}</span>
                </div>
                <div className="rounded-full h-1.5" style={{ background: 'var(--muted)' }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: data.isPassed ? '#10b981' : '#ef4444',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>PG {data.passingGrade}</span>
                  <span className={`font-semibold ${data.isPassed ? 'text-emerald-500' : 'text-red-400'}`}>
                    {data.isPassed ? 'Lulus' : 'Tidak Lulus'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === 'summary'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <ChartBar size={14} weight="duotone" />
            Analisis Kelemahan
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === 'review'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <ListDashes size={14} weight="duotone" />
            Bedah Soal &amp; Pembahasan
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === 'leaderboard'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Ranking size={14} weight="duotone" />
            Peringkat Nasional
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'summary' && (
            diagnostic ? (
              <DiagnosticReportCard report={diagnostic} />
            ) : (
              <div className="card-modern p-8 text-center text-xs text-[var(--muted-foreground)]">
                Data analisis tidak tersedia untuk sesi ujian lama ini. Coba lagi setelah mengerjakan tryout baru.
              </div>
            )
          )}
          {activeTab === 'review' && (
            <ExamQuestionReview
              questions={questions}
              userAnswers={userAnswers}
              timeSpentPerQuestion={timeSpent}
            />
          )}
          {activeTab === 'leaderboard' && (
            <LeaderboardCard packageId={tryoutId || 'tryout-1'} currentScore={result.totalScore} />
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3">
          <Link
            href="/simulasi"
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm"
          >
            <House size={16} weight="bold" />
            Kembali ke Menu Utama
          </Link>
          <Link
            href={retryPath}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm"
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            Coba Simulasi Lagi
          </Link>
        </div>
      </div>
    </div>
  );
}
