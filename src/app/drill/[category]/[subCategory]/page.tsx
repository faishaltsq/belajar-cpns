'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Question } from '@/lib/types';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';
import { GuestLimitModal } from '@/components/GuestLimitModal';
import {
  Lightning,
  CaretRight,
  ArrowCounterClockwise,
  CheckCircle,
  XCircle,
  Lightbulb,
  Pause,
  Play,
  X,
  SignOut,
} from '@phosphor-icons/react';

export default function DrillSessionPage({
  params,
}: {
  params: { category: string; subCategory: string };
}) {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? null;
  const subCategoryDecoded = decodeURIComponent(params.subCategory);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<number, string>>({});
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Cek apakah guest sudah pernah mencoba drill sebelumnya
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      if (localStorage.getItem('lolos_guest_tried_drill') === 'true') {
        setShowGuestModal(true);
      }
    }
  }, [user]);

  // Strip "Soal nomor X (Kategori):" prefix — artefak dari data lama, tidak relevan di mode acak
  function stripQuestionPrefix(text: string): string {
    return text.replace(/^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\([^)]*\))?\s*:\s*/i, '').trim();
  }

  // Load questions matching category & subcategory from sample package or DB
  useEffect(() => {
    const isFigural = subCategoryDecoded.toLowerCase() === 'figural';
    // Figural: ambil dari bank soal bergambar murni, bukan tryout-1 yang tidak punya gambar
    const targetPackage = isFigural ? 'tryout-figural-2' : 'tryout-1';

    fetch(`/api/questions/${targetPackage}`)
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => {
        const all: Question[] = (d.questions || []).map((q: Question) => ({
          ...q,
          text: stripQuestionPrefix(q.text),
        }));
        let matched: Question[];
        if (isFigural) {
          // Hanya soal yang benar-benar punya gambar
          matched = all.filter((q) => Boolean(q.image));
        } else {
          matched = all.filter(
            (q) =>
              q.category.toUpperCase() === params.category.toUpperCase() &&
              q.subCategory?.toLowerCase() === subCategoryDecoded.toLowerCase()
          );
          if (matched.length < 5) {
            matched = all.filter(
              (q) => q.category.toUpperCase() === params.category.toUpperCase()
            );
          }
        }
        const shuffled = [...matched].sort(() => 0.5 - Math.random()).slice(0, 10);
        setQuestions(shuffled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.category, subCategoryDecoded]);

  const currentQ = questions[currentIndex];

  const handleSelect = (optId: string) => {
    if (hasRevealed || isPaused) return;
    setSelectedOption(optId);
    setHasRevealed(true);

    const opt = currentQ.options.find((o) => o.id === optId);
    const maxScore = Math.max(...currentQ.options.map((o) => o.score));
    const isCorrect = opt ? opt.score === maxScore : false;

    if (isCorrect) setCorrectCount((c) => c + 1);
    setAnswersMap((prev) => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setHasRevealed(false);
    } else {
      // Simpan riwayat drill ke localStorage agar bisa dibaca wrongAnswers.ts
      try {
        const sessionId = `drill_${Date.now()}`;
        const answers = Object.entries({ ...answersMap }).map(([qId, optId]) => ({
          questionId: Number(qId),
          selectedOptionId: optId,
        }));
        const qKey = scopedKey(`drill_questions_${sessionId}`, userId);
        const aKey = scopedKey(`drill_answers_${sessionId}`, userId);
        localStorage.setItem(qKey, JSON.stringify(questions));
        localStorage.setItem(aKey, JSON.stringify(answers));

        // Batasi riwayat drill: simpan max 20 sesi terakhir untuk user ini
        const prefix = scopedKey('drill_questions_', userId);
        const drillKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(prefix)) drillKeys.push(k);
        }
        drillKeys.sort().slice(0, Math.max(0, drillKeys.length - 20)).forEach((k) => {
          const id = k.replace(prefix, '');
          localStorage.removeItem(k);
          localStorage.removeItem(scopedKey(`drill_answers_${id}`, userId));
          });
          } catch { /* localStorage penuh atau private mode */ }
          setIsFinished(true);
          if (!user) {
          try {
            localStorage.setItem('lolos_guest_tried_drill', 'true');
          } catch {}
          setShowGuestModal(true);
          }
          }
          };

          const handleRestart = () => {
          if (!user) {
          setShowGuestModal(true);
          return;
          }
          setCurrentIndex(0);
    setSelectedOption(null);
    setHasRevealed(false);
    setCorrectCount(0);
    setIsFinished(false);
    setIsPaused(false);
    setShowExitConfirm(false);
    setQuestions((q) => [...q].sort(() => 0.5 - Math.random()));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-[var(--muted-foreground)]">
        Memuat 10 soal latihan...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm font-semibold mb-3">Topik ini belum memiliki bank soal cukup.</p>
        <Link href="/drill" className="btn-primary text-xs py-2 px-4">
          Pilih Topik Lain
        </Link>
      </div>
    );
  }

  // Summary finish screen
  if (isFinished) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-modern max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] text-2xl font-bold">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Latihan Selesai!</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Topik: {subCategoryDecoded} ({params.category})
            </p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--muted)' }}>
            <p className="text-xs text-[var(--muted-foreground)]">Skor Anda</p>
            <p className="text-4xl font-bold text-[var(--foreground)] my-1">
              {correctCount} / {questions.length}
            </p>
            <p className="text-xs font-semibold text-[var(--primary)]">Akurasi {accuracy}%</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              Latihan Lagi
            </button>
            <Link
              href="/drill"
              className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              Ganti Topik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-6 relative">
      <div className="max-w-2xl w-full space-y-4">
        {/* Navigation Bar: Exit & Pause Controls */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:border-red-300 transition"
              style={{ borderColor: 'var(--border)' }}
              title="Keluar dari sesi latihan"
            >
              <SignOut size={14} weight="bold" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <span className="badge-pill badge-neutral text-[10px] font-bold">{params.category}</span>
            <span className="text-xs font-bold text-[var(--foreground)] truncate max-w-[150px] sm:max-w-xs">
              {subCategoryDecoded}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 text-[var(--foreground)] hover:bg-[var(--muted)] transition"
              style={{ borderColor: 'var(--border)' }}
            >
              {isPaused ? <Play size={14} weight="fill" className="text-emerald-600" /> : <Pause size={14} weight="bold" />}
              <span>{isPaused ? 'Lanjut' : 'Jeda'}</span>
            </button>
            <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded-md">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
              background: 'var(--primary)',
            }}
          />
        </div>

        {/* Question Card or Paused State */}
        {isPaused ? (
          <div className="card-modern p-10 text-center space-y-4 my-8">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-[var(--secondary)] text-[var(--primary)]">
              <Pause size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Latihan Dijeda</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Tarik nafas sejenak. Kamu sedang di soal {currentIndex + 1} dari {questions.length}.
              </p>
            </div>
            <button
              onClick={() => setIsPaused(false)}
              className="btn-primary py-2 px-6 text-xs inline-flex items-center gap-1.5 mx-auto"
            >
              <Play size={14} weight="fill" />
              Lanjutkan Latihan
            </button>
          </div>
        ) : (
          <div className="card-modern p-5 space-y-4">
            {currentQ.image && (
              <img
                src={currentQ.image}
                alt="Gambar Soal"
                className="max-h-56 mx-auto rounded border object-contain"
                style={{ borderColor: 'var(--border)' }}
              />
            )}
            <p className="text-sm text-[var(--foreground)] leading-relaxed font-medium">
              {currentQ.text}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {currentQ.options.map((opt, oi) => {
                const isSelected = selectedOption === opt.id;
                const maxScoreVal = Math.max(...currentQ.options.map((o) => o.score));
                const isCorrect = opt.score === maxScoreVal;

                let styleClass = 'border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]';
                if (hasRevealed) {
                  if (isCorrect) {
                    styleClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    styleClass = 'border-red-400 bg-red-50 text-red-900 line-through';
                  } else {
                    styleClass = 'border-[var(--border)] opacity-60 text-[var(--muted-foreground)]';
                  }
                } else if (isSelected) {
                  styleClass = 'border-[var(--primary)] bg-[var(--secondary)] font-semibold';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    disabled={hasRevealed}
                    className={`w-full text-left p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${styleClass}`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        hasRevealed && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : hasRevealed && isSelected && !isCorrect
                          ? 'bg-red-500 text-white'
                          : 'bg-[var(--muted)] text-[var(--foreground)]'
                      }`}
                    >
                      {optionLabels[oi] ?? opt.id}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                    {hasRevealed && isCorrect && (
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" weight="fill" />
                    )}
                    {hasRevealed && isSelected && !isCorrect && (
                      <XCircle size={16} className="text-red-500 shrink-0" weight="fill" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Box (Revealed) */}
            {hasRevealed && (
              <div
                className="p-4 rounded-xl border text-xs space-y-1.5 animate-fadeIn"
                style={{
                  backgroundColor: 'rgba(201, 100, 66, 0.04)',
                  borderColor: 'rgba(201, 100, 66, 0.25)',
                }}
              >
                <div className="flex items-center gap-1.5 text-[var(--primary)] font-bold">
                  <Lightbulb size={14} weight="fill" />
                  <span>Pembahasan Singkat:</span>
                </div>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {currentQ.explanation || 'Pembahasan belum tersedia untuk butir ini.'}
                </p>
              </div>
            )}

            {/* Next Button */}
            {hasRevealed && (
              <button
                onClick={handleNext}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <span>{currentIndex + 1 === questions.length ? 'Lihat Hasil Akhir' : 'Lanjut Soal Berikutnya'}</span>
                <CaretRight size={14} weight="bold" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card-modern max-w-sm w-full p-6 text-center space-y-4 bg-[var(--card)]">
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-red-100 text-red-600">
              <SignOut size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Keluar dari Latihan?</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Progres sesi {currentIndex + 1}/{questions.length} soal tidak akan tersimpan jika kamu keluar sekarang.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => router.push('/drill')}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Limit Modal */}
      <GuestLimitModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        featureName="Latihan Kilat"
        title="Latihan Kilat Selesai!"
        description="Kamu telah mencoba 1 sesi Latihan Kilat gratis. Daftar atau masuk akun sekarang untuk membuka semua topik latihan tanpa batas, menyimpan skor, dan melacak kelemahanmu."
      />
    </div>
  );
}