'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ReasoningQuestion } from '@/lib/types';
import questionsData from '@/data/psikotes_penalaran.json';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { setScopedJSON } from '@/lib/userStorage';

const allQuestions = questionsData as ReasoningQuestion[];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function PenalaranContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const initialCat = (searchParams?.get('category') as 'deret' | 'silogisme' | 'spasial' | 'semua') || 'semua';
  const [selectedCategory, setSelectedCategory] = useState<'deret' | 'silogisme' | 'spasial' | 'semua'>(initialCat);
  const [quizStarted, setQuizStarted] = useState(false);

  const activeQuestions = useMemo(() => {
    if (selectedCategory === 'semua') return allQuestions;
    return allQuestions.filter((q) => q.category === selectedCategory);
  }, [selectedCategory]);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(activeQuestions.length * 60);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    const breakdown = {
      deret: { correct: 0, total: 0 },
      silogisme: { correct: 0, total: 0 },
      spasial: { correct: 0, total: 0 },
    };

    let totalCorrect = 0;

    const details = activeQuestions.map((q) => {
      const chosen = answers[q.id];
      const correctOpt = q.options.find((o) => o.score === 1);
      const isCorrect = chosen === correctOpt?.id;

      if (isCorrect) totalCorrect++;

      const cat = (q.category as 'deret' | 'silogisme' | 'spasial') || 'deret';
      if (breakdown[cat]) {
        breakdown[cat].total++;
        if (isCorrect) breakdown[cat].correct++;
      }

      return {
        id: q.id,
        category: cat,
        questionText: q.questionText,
        chosenOptionId: chosen || null,
        correctOptionId: correctOpt?.id || 'A',
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((totalCorrect / activeQuestions.length) * 100);
    const payload = {
      category: selectedCategory,
      score,
      correct: totalCorrect,
      wrong: activeQuestions.length - totalCorrect,
      total: activeQuestions.length,
      breakdown,
      details,
    };

    setScopedJSON('psikotes_penalaran_result', user?.id, payload);
    localStorage.setItem('psikotes_penalaran_result', JSON.stringify(payload));
    router.push('/psikotes/hasil?type=penalaran');
  }, [answers, activeQuestions, router, selectedCategory, user]);

  // Countdown timer
  useEffect(() => {
    if (!quizStarted || submitted) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          if (!submittedRef.current) {
            handleSubmit();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [quizStarted, submitted, handleSubmit]);

  const handleStart = (cat: 'deret' | 'silogisme' | 'spasial' | 'semua') => {
    setSelectedCategory(cat);
    const qs = cat === 'semua' ? allQuestions : allQuestions.filter((q) => q.category === cat);
    setSecondsLeft(qs.length * 60);
    setCurrent(0);
    setAnswers({});
    setQuizStarted(true);
  };

  if (!quizStarted) {
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
            {/* Label pemilih paket, bukan heading dokumen: <h1> halaman ini
                dimiliki PenalaranOverview yang dirender server. */}
            <p className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight mb-2">
              Tes Penalaran Logika &amp; Spasial
            </p>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              Pilih paket materi latihan penalaran kognitif berbasis standar tes CPNS &amp; BUMN.
            </p>
          </div>

          <div className="grid gap-3.5">
            <button
              onClick={() => handleStart('deret')}
              className="card-modern p-5 text-left flex items-start justify-between gap-4 transition hover:border-[var(--primary)] hover:shadow-md group"
            >
              <div>
                <span className="badge-pill badge-neutral text-[10px] mb-2 inline-block">Paket 1</span>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Deret Angka &amp; Huruf</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Pola bilangan bertingkat, fibonacci, lompat, dan barisan alfabet.
                </p>
              </div>
              <div className="text-right shrink-0 text-xs text-[var(--muted-foreground)]">
                <span className="font-bold text-[var(--foreground)] block">15 Soal</span>
                <span>15 Menit</span>
              </div>
            </button>

            <button
              onClick={() => handleStart('silogisme')}
              className="card-modern p-5 text-left flex items-start justify-between gap-4 transition hover:border-[var(--primary)] hover:shadow-md group"
            >
              <div>
                <span className="badge-pill badge-neutral text-[10px] mb-2 inline-block">Paket 2</span>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Logika Silogisme &amp; Analitis</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Penarikan kesimpulan modus ponens/tollens, silogisme kategorik, dan analitis.
                </p>
              </div>
              <div className="text-right shrink-0 text-xs text-[var(--muted-foreground)]">
                <span className="font-bold text-[var(--foreground)] block">15 Soal</span>
                <span>15 Menit</span>
              </div>
            </button>

            <button
              onClick={() => handleStart('spasial')}
              className="card-modern p-5 text-left flex items-start justify-between gap-4 transition hover:border-[var(--primary)] hover:shadow-md group"
            >
              <div>
                <span className="badge-pill badge-neutral text-[10px] mb-2 inline-block">Paket 3</span>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Penalaran Spasial &amp; Bangun Ruang</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Jaring-jaring kubus, rotasi sudut 2D/3D, lipatan kertas, dan simetri visual.
                </p>
              </div>
              <div className="text-right shrink-0 text-xs text-[var(--muted-foreground)]">
                <span className="font-bold text-[var(--foreground)] block">15 Soal</span>
                <span>15 Menit</span>
              </div>
            </button>

            <button
              onClick={() => handleStart('semua')}
              className="card-modern p-5 text-left flex items-start justify-between gap-4 border-2 border-[var(--primary)]/30 hover:border-[var(--primary)] transition hover:shadow-md"
            >
              <div>
                <span className="badge-pill badge-neutral bg-amber-50 text-amber-700 border-amber-200 text-[10px] mb-2 inline-block font-bold">
                  Simulasi Lengkap
                </span>
                <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Semua Materi Campuran</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Latihan menyeluruh gabungan deret, silogisme, dan spasial dalam satu sesi.
                </p>
              </div>
              <div className="text-right shrink-0 text-xs text-[var(--muted-foreground)]">
                <span className="font-bold text-[var(--primary)] block">45 Soal</span>
                <span>45 Menit</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = activeQuestions[current];
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerWarning = secondsLeft < 60;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuizStarted(false)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
            >
              <ArrowLeft size={14} weight="bold" /> Ganti Paket
            </button>
            <span className="text-[var(--muted-foreground)] text-xs">·</span>
            <span className="text-[var(--foreground)] text-xs font-semibold">
              Soal {current + 1} / {activeQuestions.length}
            </span>
          </div>
          <span
            className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full ${
              timerWarning
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-[var(--muted)] text-[var(--foreground)]'
            }`}
          >
            ⏱ {pad(minutes)}:{pad(secs)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-[#e0dcea] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((current + 1) / activeQuestions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="card-modern p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="uppercase tracking-wider font-bold text-[10px] text-[var(--primary)]">
              {q.category ? `Kategori: ${q.category}` : 'Penalaran'}
            </span>
            <span>Nomor {current + 1}</span>
          </div>

          <p className="text-[var(--foreground)] font-semibold text-base sm:text-lg leading-relaxed whitespace-pre-line">
            {q.questionText}
          </p>

          <div className="flex flex-col gap-2.5">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                  className={[
                    'w-full text-left rounded-xl p-3.5 text-sm font-medium transition-all border flex items-start gap-3',
                    selected
                      ? 'border-[var(--primary)] bg-amber-50/60 text-[var(--foreground)] shadow-xs'
                      : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)]/50',
                  ].join(' ')}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      selected
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="flex-1 pt-0.5 leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
              className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ArrowLeft size={14} weight="bold" /> Sebelumnya
            </button>

            {current < activeQuestions.length - 1 ? (
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
                onClick={handleSubmit}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1 shadow-sm"
              >
                Kumpulkan Jawaban →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PenalaranRunner() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-[var(--muted-foreground)]">Memuat modul penalaran...</div>}>
      <PenalaranContent />
    </Suspense>
  );
}
