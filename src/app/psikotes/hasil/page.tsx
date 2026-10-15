'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KraepelinChart } from '@/components/psikotes/KraepelinChart';
import type {
  KraepelinOverallResult,
  KecermatanOverallResult,
  KepribadianOverallResult,
} from '@/lib/types';
import {
  ArrowLeft,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  CaretDown,
  CaretUp,
  Sparkle,
  Brain,
  Lightbulb,
  Hash,
  UserCheck,
} from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { getScopedJSON } from '@/lib/userStorage';
import { GuestLimitModal } from '@/components/GuestLimitModal';

interface PenalaranDetailItem {
  id: number;
  category: string;
  questionText: string;
  chosenOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
}

interface PenalaranResult {
  category?: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  breakdown?: {
    deret: { correct: number; total: number };
    silogisme: { correct: number; total: number };
    spasial: { correct: number; total: number };
  };
  details?: PenalaranDetailItem[];
}

function HasilContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') ?? 'kraepelin';
  const { user, loading: userLoading } = useUser();

  const [kraepelinResult, setKraepelinResult] = useState<KraepelinOverallResult | null>(null);
  const [kecermatanResult, setKecermatanResult] = useState<KecermatanOverallResult | null>(null);
  const [kepribadianResult, setKepribadianResult] = useState<KepribadianOverallResult | null>(null);
  const [penalaranResult, setPenalaranResult] = useState<PenalaranResult | null>(null);

  const [showReview, setShowReview] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    if (type === 'kraepelin') {
      const res = getScopedJSON<KraepelinOverallResult | null>('psikotes_kraepelin_result', user?.id, null) ||
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('psikotes_kraepelin_result') || 'null') : null);
      if (res) setKraepelinResult(res);
    } else if (type === 'kecermatan') {
      const res = getScopedJSON<KecermatanOverallResult | null>('psikotes_kecermatan_result', user?.id, null) ||
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('psikotes_kecermatan_result') || 'null') : null);
      if (res) setKecermatanResult(res);
    } else if (type === 'kepribadian') {
      const res = getScopedJSON<KepribadianOverallResult | null>('psikotes_kepribadian_result', user?.id, null) ||
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('psikotes_kepribadian_result') || 'null') : null);
      if (res) setKepribadianResult(res);
    } else if (type === 'penalaran') {
      const res = getScopedJSON<PenalaranResult | null>('psikotes_penalaran_result', user?.id, null) ||
        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('psikotes_penalaran_result') || 'null') : null);
      if (res) setPenalaranResult(res);
    }
  }, [type, user?.id]);

  // Guest trigger modal
  useEffect(() => {
    if (userLoading) return;
    if (user) {
      setShowGuestModal(false);
      try {
        localStorage.removeItem('lolos_guest_tried_psikotes');
      } catch {}
      return;
    }
    try {
      localStorage.setItem('lolos_guest_tried_psikotes', 'true');
    } catch {}
    setShowGuestModal(true);
  }, [user, userLoading]);

  const getRepeatHref = () => {
    if (type === 'kraepelin') return '/psikotes/kraepelin';
    if (type === 'kecermatan') return kecermatanResult?.type === 'huruf' ? '/psikotes/kecermatan-huruf' : '/psikotes/kecermatan-angka';
    if (type === 'kepribadian') return '/psikotes/kepribadian';
    return '/psikotes/penalaran';
  };

  const getTitle = () => {
    if (type === 'kraepelin') return 'Hasil Tes Koran Kraepelin / Pauli';
    if (type === 'kecermatan') return `Hasil Tes Kecermatan ${kecermatanResult?.type === 'huruf' ? 'Huruf' : 'Angka'} Hilang`;
    if (type === 'kepribadian') return 'Profil Karakteristik Pribadi Kerja (PAPI Kostick)';
    return 'Hasil Tes Penalaran Logika & Spasial';
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-6">
        {/* Back navigation */}
        <Link
          href="/psikotes"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm transition"
        >
          <ArrowLeft size={16} weight="fill" /> Kembali ke Hub Psikotes
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            {getTitle()}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            Evaluasi parameter performa psikotes Anda berdasarkan kriteria baku seleksi dinas.
          </p>
        </div>

        {/* 1. KRAEPELIN VIEW */}
        {type === 'kraepelin' && kraepelinResult && (
          <div className="flex flex-col gap-5">
            <KraepelinChart columnResults={kraepelinResult.columnResults} />

            <div className="grid grid-cols-2 gap-3.5">
              <div className="card-modern p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Ketelitian (Akurasi)
                </span>
                <span className="text-3xl font-black text-[var(--foreground)]">
                  {kraepelinResult.overallAccuracy}%
                </span>
              </div>

              <div className="card-modern p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Kecepatan Rata-rata
                </span>
                <span className="text-3xl font-black text-[var(--foreground)]">
                  {kraepelinResult.averageSpeedPerColumn}
                </span>
                <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">soal/menit</span>
              </div>

              <div className="card-modern p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Stabilitas Emosi (SD)
                </span>
                <span className="text-3xl font-black text-[var(--foreground)]">
                  {kraepelinResult.stabilityScore}
                </span>
                <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
                  (makin kecil makin stabil)
                </span>
              </div>

              <div className="card-modern p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Tren Daya Tahan
                </span>
                <span
                  className={`text-2xl font-black ${
                    kraepelinResult.workPaceTrend === 'Meningkat'
                      ? 'text-emerald-600'
                      : kraepelinResult.workPaceTrend === 'Menurun'
                      ? 'text-red-500'
                      : 'text-amber-500'
                  }`}
                >
                  {kraepelinResult.workPaceTrend}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. KECERMATAN VIEW */}
        {type === 'kecermatan' && kecermatanResult && (
          <div className="flex flex-col gap-5">
            <div className="card-modern p-6 text-center border-2 border-[var(--primary)]/20">
              <span className="text-xs text-[var(--muted-foreground)] font-bold uppercase tracking-wider block mb-1">
                Predikat Performa
              </span>
              <span className="text-3xl sm:text-4xl font-black text-[var(--primary)]">
                {kecermatanResult.grade}
              </span>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Total Dijawab: <strong>{kecermatanResult.totalQuestionsAnswered}</strong> soal (
                <span className="text-emerald-600 font-semibold">{kecermatanResult.totalCorrect} Benar</span> ·{' '}
                <span className="text-red-500 font-semibold">{kecermatanResult.totalWrong} Salah</span>)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="card-modern p-3.5 text-center">
                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Akurasi</span>
                <span className="text-2xl font-bold text-[var(--foreground)]">
                  {kecermatanResult.overallAccuracy}%
                </span>
              </div>
              <div className="card-modern p-3.5 text-center">
                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Kecepatan Rata-rata</span>
                <span className="text-2xl font-bold text-[var(--foreground)]">
                  {kecermatanResult.averageSpeedPerColumn}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] block">soal/menit</span>
              </div>
              <div className="card-modern p-3.5 text-center">
                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Deviasi Stabilitas</span>
                <span className="text-2xl font-bold text-[var(--foreground)]">
                  {kecermatanResult.stabilityScore}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] block">(standar deviasi)</span>
              </div>
            </div>

            {/* Per-column detail */}
            <div className="card-modern p-5">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-3">
                Rincian Performa Tiap Kolom:
              </h3>
              <div className="flex flex-col divide-y divide-[var(--border)] text-xs">
                {kecermatanResult.columnResults.map((col) => (
                  <div key={col.columnIndex} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-[var(--foreground)]">
                      Kolom {col.columnIndex + 1}
                    </span>
                    <div className="flex items-center gap-4 text-[var(--muted-foreground)]">
                      <span>{col.totalAttempts} dijawab</span>
                      <span className="text-emerald-600 font-medium">{col.correctCount} benar</span>
                      <span className="font-bold text-[var(--foreground)]">{col.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. KEPRIBADIAN (PAPI KOSTICK) VIEW */}
        {type === 'kepribadian' && kepribadianResult && (
          <div className="flex flex-col gap-5">
            {/* Summary Banner */}
            <div className="card-modern p-6 bg-purple-50/40 border border-purple-200/60 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                <Sparkle size={16} weight="fill" className="text-purple-700" />
                <span>Karakteristik Dominan:</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {kepribadianResult.dominantTraits.map((trait) => (
                  <span
                    key={trait}
                    className="badge-pill bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <p className="text-xs text-purple-950/80 leading-relaxed">
                {kepribadianResult.asnFitSummary}
              </p>
            </div>

            {/* 5 Dimensions breakdown */}
            <div className="card-modern p-6 flex flex-col gap-5">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                Pemetaan 5 Dimensi Kepribadian Kerja:
              </h3>

              <div className="flex flex-col gap-4">
                {Object.values(kepribadianResult.dimensions).map((dim) => (
                  <div key={dim.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[var(--foreground)] font-bold">{dim.label}</span>
                      <span className="text-[var(--primary)] font-bold">{dim.percentage}% ({dim.score}/{dim.maxScore})</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                        style={{ width: `${dim.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                      {dim.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="card-modern p-5 flex flex-col gap-2.5">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                Rekomendasi Pengembangan:
              </h3>
              <ul className="text-xs text-[var(--muted-foreground)] space-y-1.5 list-disc list-inside leading-relaxed">
                {kepribadianResult.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 4. PENALARAN LOGIKA VIEW */}
        {type === 'penalaran' && penalaranResult && (
          <div className="flex flex-col gap-5">
            <div className="card-modern p-6 flex flex-col items-center gap-4 text-center">
              <div>
                <span className="text-xs text-[var(--muted-foreground)] font-bold uppercase tracking-wider block mb-1">
                  Skor Penalaran Logika
                </span>
                <span className="text-5xl sm:text-6xl font-black text-[var(--foreground)]">
                  {penalaranResult.score}
                </span>
                <span className="text-[var(--muted-foreground)] text-xs block mt-1">/ 100</span>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="card-subtle p-3 rounded-xl">
                  <span className="text-[11px] text-[var(--muted-foreground)] block">Benar</span>
                  <span className="text-xl font-bold text-emerald-600">{penalaranResult.correct}</span>
                </div>
                <div className="card-subtle p-3 rounded-xl">
                  <span className="text-[11px] text-[var(--muted-foreground)] block">Salah</span>
                  <span className="text-xl font-bold text-red-500">{penalaranResult.wrong}</span>
                </div>
              </div>

              {penalaranResult.breakdown && (
                <div className="w-full pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Deret</span>
                    <span className="font-bold text-[var(--foreground)]">
                      {penalaranResult.breakdown.deret.correct}/{penalaranResult.breakdown.deret.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Silogisme</span>
                    <span className="font-bold text-[var(--foreground)]">
                      {penalaranResult.breakdown.silogisme.correct}/{penalaranResult.breakdown.silogisme.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Spasial</span>
                    <span className="font-bold text-[var(--foreground)]">
                      {penalaranResult.breakdown.spasial.correct}/{penalaranResult.breakdown.spasial.total}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pembahasan toggle */}
            {penalaranResult.details && penalaranResult.details.length > 0 && (
              <div className="card-modern p-5">
                <button
                  type="button"
                  onClick={() => setShowReview(!showReview)}
                  className="w-full flex items-center justify-between text-xs font-bold text-[var(--foreground)]"
                >
                  <span>Pembahasan Detail Soal ({penalaranResult.details.length} Butir)</span>
                  {showReview ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                </button>

                {showReview && (
                  <div className="flex flex-col gap-4 mt-4 divide-y divide-[var(--border)] pt-2">
                    {penalaranResult.details.map((item, index) => (
                      <div key={item.id} className="pt-3.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[var(--foreground)]">Nomor {index + 1}</span>
                          <span
                            className={`badge-pill text-[10px] inline-flex items-center gap-1 ${
                              item.isCorrect ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {item.isCorrect ? (
                              <>
                                <CheckCircle size={12} weight="fill" /> Benar
                              </>
                            ) : (
                              <>
                                <XCircle size={12} weight="fill" /> Salah
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--foreground)] font-medium leading-relaxed">
                          {item.questionText}
                        </p>
                        <div className="text-[11px] text-[var(--muted-foreground)] flex gap-4">
                          <span>Jawaban Anda: <strong className={item.isCorrect ? 'text-emerald-600' : 'text-red-500'}>{item.chosenOptionId || 'Kosong'}</strong></span>
                          <span>Kunci Benar: <strong className="text-emerald-600">{item.correctOptionId}</strong></span>
                        </div>
                        {item.explanation && (
                          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                            <strong>Pembahasan:</strong> {item.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state fallback */}
        {!kraepelinResult && !kecermatanResult && !kepribadianResult && !penalaranResult && (
          <div className="card-modern p-8 text-center text-xs text-[var(--muted-foreground)]">
            Belum ada riwayat hasil untuk modul ini. Silakan mulai tes terlebih dahulu.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href={getRepeatHref()}
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5 shadow-sm"
          >
            <ArrowClockwise size={16} weight="fill" /> Ulangi Tes
          </Link>
          <Link
            href="/psikotes"
            className="btn-secondary text-xs py-2.5 px-4"
          >
            Kembali ke Hub Psikotes
          </Link>
        </div>
      </div>

      {/* Guest Limit Modal */}
      <GuestLimitModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        featureName="Simulasi Psikotes"
        title="Buka Seluruh Baterai Psikotes"
        description="Daftar atau masuk akun gratis sekarang untuk menyimpan riwayat psikotes, grafik ketahanan kerja per sesi, dan analisis profil PAPI Kostick."
      />
    </div>
  );
}

export default function PsikotesHasilPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">Memuat hasil psikotes…</p>
        </div>
      }
    >
      <HasilContent />
    </Suspense>
  );
}
