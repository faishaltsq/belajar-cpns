'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, Info } from '@phosphor-icons/react';
import questions from '@/data/psikotes_kepribadian.json';
import { evaluateKepribadianResults } from '@/lib/kepribadian';
import { useUser } from '@/lib/useUser';
import { setScopedJSON } from '@/lib/userStorage';

export default function KepribadianPage() {
  const router = useRouter();
  const { user } = useUser();

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});

  const totalQuestions = questions.length;
  const q = questions[current];
  const answeredCount = Object.keys(answers).length;

  const handleSelect = (choice: 'A' | 'B') => {
    setAnswers((prev) => ({ ...prev, [q.id]: choice }));
    // Auto advance if not on the last question
    if (current < totalQuestions - 1) {
      setTimeout(() => {
        setCurrent((c) => c + 1);
      }, 150);
    }
  };

  const handleSubmit = () => {
    const result = evaluateKepribadianResults(answers);
    setScopedJSON('psikotes_kepribadian_result', user?.id, result);
    localStorage.setItem('psikotes_kepribadian_result', JSON.stringify(result));
    router.push('/psikotes/hasil?type=kepribadian');
  };

  if (!started) {
    return (
      <div className="min-h-screen px-4 py-10 flex flex-col items-center">
        <div className="w-full max-w-xl flex flex-col gap-6">
          <Link
            href="/psikotes"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm transition"
          >
            <ArrowLeft size={16} weight="fill" /> Kembali ke Hub Psikotes
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight mb-2">
              Tes Karakteristik Pribadi Kerja (PAPI Kostick)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              Pemetaan gaya kerja dan orientasi perilaku profesional ASN berdasarkan 5 dimensi kompetensi kerja.
            </p>
          </div>

          <div className="card-modern p-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Info size={18} weight="fill" />
              <span>Prinsip Pengisian Asesmen:</span>
            </div>
            <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Tes terdiri dari <strong>30 butir pasangan pernyataan</strong> pilihan terpaksa (<em>forced-choice</em>).</li>
              <li><strong>Tidak ada jawaban benar atau salah.</strong> Pilihlah pernyataan yang paling mencerminkan kecenderungan gaya kerja alami Anda.</li>
              <li>Jawablah secara jujur dan spontan tanpa terlalu lama menganalisis.</li>
              <li>Hasil akan memetakan dimensi <strong>Kepemimpinan, Prestasi, Ketelitian, Relasi Sosial, dan Integritas Regulasi</strong>.</li>
            </ul>
          </div>

          <div className="card-modern p-5 flex items-center justify-between">
            <div className="text-xs text-[var(--muted-foreground)]">
              <p className="font-semibold text-[var(--foreground)] text-sm">30 Butir Soal</p>
              <p>Estimasi waktu pengerjaan: 5 - 10 menit</p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="btn-primary text-xs py-3 px-6 font-bold shadow-sm"
            >
              Mulai Asesmen →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedAnswer = answers[q.id];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
          >
            <ArrowLeft size={14} weight="bold" /> Keluar
          </button>
          <span className="font-semibold text-[var(--foreground)]">
            Butir {current + 1} dari {totalQuestions}
          </span>
          <span className="text-[var(--muted-foreground)]">
            Terisi: {answeredCount}/{totalQuestions}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#e0dcea] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((current + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Prompt */}
        <div className="card-modern p-6 sm:p-8 flex flex-col gap-6">
          <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider text-center">
            Pilih satu pernyataan yang paling menggambarkan diri Anda:
          </p>

          <div className="flex flex-col gap-3.5">
            {/* OPTION A */}
            <button
              type="button"
              onClick={() => handleSelect('A')}
              className={[
                'w-full text-left rounded-2xl p-4 sm:p-5 border-2 transition-all flex items-start gap-3.5',
                selectedAnswer === 'A'
                  ? 'border-[var(--primary)] bg-amber-50/70 shadow-xs'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--muted)]/40',
              ].join(' ')}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  selectedAnswer === 'A'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}
              >
                A
              </span>
              <span className="text-sm sm:text-base font-medium text-[var(--foreground)] leading-relaxed flex-1">
                {q.optionA.text}
              </span>
            </button>

            {/* OPTION B */}
            <button
              type="button"
              onClick={() => handleSelect('B')}
              className={[
                'w-full text-left rounded-2xl p-4 sm:p-5 border-2 transition-all flex items-start gap-3.5',
                selectedAnswer === 'B'
                  ? 'border-[var(--primary)] bg-amber-50/70 shadow-xs'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--muted)]/40',
              ].join(' ')}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  selectedAnswer === 'B'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}
              >
                B
              </span>
              <span className="text-sm sm:text-base font-medium text-[var(--foreground)] leading-relaxed flex-1">
                {q.optionB.text}
              </span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
              className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ArrowLeft size={14} weight="bold" /> Sebelumnya
            </button>

            {current < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => c + 1)}
                className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1"
              >
                Berikutnya <ArrowRight size={14} weight="bold" />
              </button>
            ) : (
              <button
                type="button"
                disabled={answeredCount < totalQuestions}
                onClick={handleSubmit}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                <CheckCircle size={16} weight="fill" /> Lihat Analisis Profil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
