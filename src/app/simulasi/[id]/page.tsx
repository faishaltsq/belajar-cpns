'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from '@/components/Timer';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionNavigationGrid } from '@/components/QuestionNavigationGrid';
import { FinishExamModal } from '@/components/FinishExamModal';
import { calculateExamScore } from '@/lib/scoring';
import { ExamAnswer, Question } from '@/lib/types';
import { loadPackage } from '@/lib/loadPackage';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const EXAM_DURATION = 6000; // 100 minutes

export default function SimulasiPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const storageKey = `exam_answers_${params.id}`;
  const startKey = `exam_start_${params.id}`;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, ExamAnswer>>(() => new Map());
  const [showModal, setShowModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const submittingRef = useRef(false);

  // Load package questions asynchronously
  useEffect(() => {
    loadPackage(params.id).then((qs) => {
      setQuestions(qs);
      setLoadingQuestions(false);
    });
  }, [params.id]);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr: ExamAnswer[] = JSON.parse(saved);
        setAnswers(new Map(arr.map((a) => [a.questionId, a])));
      }
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  // Track elapsed seconds using a start timestamp for crash recovery
  const elapsedRef = useRef(0);
  useEffect(() => {
    const stored = localStorage.getItem(startKey);
    if (!stored) {
      localStorage.setItem(startKey, String(Date.now()));
    } else {
      const elapsed = Math.floor((Date.now() - Number(stored)) / 1000);
      elapsedRef.current = Math.min(elapsed, EXAM_DURATION);
    }
  }, [startKey]);

  // Autosave answers to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const obj: ExamAnswer[] = Array.from(answers.values());
    localStorage.setItem(storageKey, JSON.stringify(obj));
  }, [answers, storageKey, hydrated]);

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => {
      const q = questions[currentIndex];
      const next = new Map(prev);
      const existing = next.get(q.id);
      next.set(q.id, {
        questionId: q.id,
        selectedOptionId: optionId,
        isFlagged: existing?.isFlagged ?? false,
      });
      return next;
    });
  };

  const handleToggleFlag = () => {
    setAnswers((prev) => {
      const q = questions[currentIndex];
      const next = new Map(prev);
      const existing = next.get(q.id);
      next.set(q.id, {
        questionId: q.id,
        selectedOptionId: existing?.selectedOptionId ?? null,
        isFlagged: !existing?.isFlagged,
      });
      return next;
    });
  };

  const submitExam = useCallback(
    (answersMap: Map<number, ExamAnswer>) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      const startTime = Number(localStorage.getItem(startKey) ?? Date.now());
      const durationSeconds = Math.min(
        Math.floor((Date.now() - startTime) / 1000),
        EXAM_DURATION
      );
      const answerArr = Array.from(answersMap.values());
      const result = calculateExamScore(questions, answerArr, durationSeconds);
      const resultId = `${params.id}-${Date.now()}`;
      localStorage.setItem(`exam_result_${resultId}`, JSON.stringify(result));
      localStorage.removeItem(storageKey);
      localStorage.removeItem(startKey);
      router.push(`/simulasi/hasil/${resultId}`);
    },
    [params.id, storageKey, startKey, router, questions]
  );

  // Stable ref so Timer's onTimeUp closure doesn't go stale
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const handleTimeUp = useCallback(() => {
    submitExam(answersRef.current);
  }, [submitExam]);

  const handleConfirmSubmit = () => {
    setShowModal(false);
    submitExam(answers);
  };

  const currentQ = questions[currentIndex];
  const currentAns = currentQ ? answers.get(currentQ.id) : undefined;

  let answered = 0;
  let flagged = 0;
  answers.forEach((a) => {
    if (a.selectedOptionId != null && a.selectedOptionId !== '') answered++;
    if (a.isFlagged) flagged++;
  });

  const initialSeconds = hydrated
    ? Math.max(0, EXAM_DURATION - elapsedRef.current)
    : EXAM_DURATION;

  if (!hydrated || loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Memuat sesi ujian...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
        <p className="text-slate-600 font-semibold">Paket soal belum tersedia.</p>
        <button
          onClick={() => router.push('/simulasi')}
          className="py-2.5 px-6 bg-purple-500 text-white rounded-2xl text-sm clay-button font-medium"
        >
          Kembali ke Daftar Paket
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-white/50"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-sm sm:text-base truncate text-slate-800">Simulasi CAT CPNS</span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 border border-purple-200 font-medium whitespace-nowrap">
              {params.id.replace('tryout-', 'Tryout ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Timer key={initialSeconds} initialSeconds={initialSeconds} onTimeUp={handleTimeUp} />
            <button
              onClick={() => setShowModal(true)}
              className="py-2 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-semibold rounded-xl transition whitespace-nowrap"
              style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.1), -2px -2px 6px rgba(255,255,255,0.8)' }}
            >
              Selesai Ujian
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Main */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <QuestionCard
            question={currentQ}
            questionNumber={currentIndex + 1}
            selectedOptionId={currentAns?.selectedOptionId ?? null}
            isFlagged={currentAns?.isFlagged ?? false}
            onSelectOption={handleSelectOption}
            onToggleFlag={handleToggleFlag}
          />

          {/* Navigation buttons */}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 py-2.5 px-5 rounded-2xl clay-card-flat text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <CaretLeft size={16} weight="bold" />
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1.5 py-2.5 px-5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed clay-button"
            >
              Selanjutnya
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <QuestionNavigationGrid
            questions={questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelectIndex={setCurrentIndex}
          />
        </aside>
      </div>

      <FinishExamModal
        isOpen={showModal}
        totalQuestions={questions.length}
        answeredCount={answered}
        flaggedCount={flagged}
        onCancel={() => setShowModal(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}
