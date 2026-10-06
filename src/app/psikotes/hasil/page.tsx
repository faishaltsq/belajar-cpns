'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KraepelinChart } from '@/components/psikotes/KraepelinChart';
import type { KraepelinOverallResult } from '@/lib/types';
import { ArrowLeft, ArrowClockwise } from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { GuestLimitModal } from '@/components/GuestLimitModal';

interface PenalaranResult {
  score: number;
  correct: number;
  wrong: number;
  total: number;
}

function HasilContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') ?? 'kraepelin';
  const { user, loading: userLoading } = useUser();

  const [kraepelinResult, setKraepelinResult] =
    useState<KraepelinOverallResult | null>(null);
  const [penalaranResult, setPenalaranResult] =
    useState<PenalaranResult | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    if (type === 'kraepelin') {
      const raw = localStorage.getItem('psikotes_kraepelin_result');
      if (raw) setKraepelinResult(JSON.parse(raw));
    } else {
      const raw = localStorage.getItem('psikotes_penalaran_result');
      if (raw) setPenalaranResult(JSON.parse(raw));
    }
  }, [type]);

  // Munculkan popup jika user guest selesai tes psikotes
  useEffect(() => {
    if (!user && !userLoading) {
      try {
        localStorage.setItem('lolos_guest_tried_psikotes', 'true');
      } catch {}
      setShowGuestModal(true);
    }
  }, [user, userLoading]);

  const repeatHref =
    type === 'kraepelin' ? '/psikotes/kraepelin' : '/psikotes/penalaran';

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-6">
        {/* Back */}
        <Link
          href="/psikotes"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[var(--foreground)] text-sm"
        >
          <ArrowLeft size={16} weight="fill" /> Kembali ke Menu Psikotes
        </Link>

        <h1 className="text-2xl font-bold text-slate-800">
          Hasil {type === 'kraepelin' ? 'Tes Koran Kraepelin' : 'Tes Penalaran Logika'}
        </h1>

        {/* Kraepelin view */}
        {type === 'kraepelin' && kraepelinResult && (
          <div className="flex flex-col gap-6">
            <KraepelinChart columnResults={kraepelinResult.columnResults} />

            <div className="grid grid-cols-2 gap-4">
              <div className="clay-card rounded-2xl p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Ketelitian
                </span>
                <span className="text-3xl font-extrabold text-[var(--foreground)]">
                  {kraepelinResult.overallAccuracy}%
                </span>
              </div>

              <div className="clay-card rounded-2xl p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Kecepatan Rata-rata
                </span>
                <span className="text-3xl font-extrabold text-[var(--foreground)]">
                  {kraepelinResult.averageSpeedPerColumn}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] block mt-0.5">soal/menit</span>
              </div>

              <div className="clay-card rounded-2xl p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Stabilitas
                </span>
                <span className="text-3xl font-extrabold text-[var(--foreground)]">
                  {kraepelinResult.stabilityScore}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] block mt-0.5">
                  (makin kecil makin stabil)
                </span>
              </div>

              <div className="clay-card rounded-2xl p-4 text-center">
                <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                  Tren Kerja
                </span>
                <span
                  className={`text-2xl font-extrabold ${
                    kraepelinResult.workPaceTrend === 'Meningkat'
                      ? 'text-green-600'
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

        {/* Penalaran view */}
        {type === 'penalaran' && penalaranResult && (
          <div className="clay-card rounded-3xl p-6 flex flex-col items-center gap-6 text-center">
            <div>
              <span className="text-xs text-[var(--muted-foreground)] font-medium block mb-1">
                Skor Akhir
              </span>
              <span className="text-6xl font-black text-[var(--foreground)]">
                {penalaranResult.score}
              </span>
              <span className="text-[var(--muted-foreground)] text-sm block mt-1">/ 100</span>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="clay-card-flat rounded-2xl p-4">
                <span className="text-xs text-[var(--muted-foreground)] block mb-1">Benar</span>
                <span className="text-2xl font-bold text-green-600">
                  {penalaranResult.correct}
                </span>
              </div>
              <div className="clay-card-flat rounded-2xl p-4">
                <span className="text-xs text-[var(--muted-foreground)] block mb-1">Salah</span>
                <span className="text-2xl font-bold text-red-500">
                  {penalaranResult.wrong}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Empty state fallback */}
        {!kraepelinResult && !penalaranResult && (
          <div className="clay-card rounded-2xl p-6 text-center text-slate-500">
            Tidak ada data hasil. Silakan ikuti tes terlebih dahulu.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link
            href={repeatHref}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowClockwise size={16} weight="fill" /> Ulangi Tes
          </Link>
          <Link href="/psikotes" className="btn-primary">
            Kembali ke Menu
          </Link>
        </div>
      </div>

      {/* Guest Limit Modal */}
      <GuestLimitModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        featureName="Simulasi Psikotes"
        title="Buka Seluruh Tes Psikotes"
        description="Kamu telah mencoba 1 simulasi psikotes. Daftar atau masuk akun gratis sekarang untuk membuka grafik ketahanan kerja lengkap, tes kecermatan angka hilang, dan tes penalaran lainnya."
      />
    </div>
  );
}

export default function PsikotesHasilPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500">Memuat hasil…</p>
        </div>
      }
    >
      <HasilContent />
    </Suspense>
  );
}
