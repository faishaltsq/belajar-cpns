'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from '@/components/Timer';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionNavigationGrid } from '@/components/QuestionNavigationGrid';
import { FinishExamModal } from '@/components/FinishExamModal';
import { calculateExamScore } from '@/lib/scoring';
import { ExamAnswer, Question } from '@/lib/types';
import { CaretLeft, CaretRight, Desktop, Sparkle } from '@phosphor-icons/react';
import { BKNThemeLayout } from '@/components/BKNThemeLayout';

const EXAM_DURATION = 6000; // 100 minutes

export default function SimulasiPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const storageKey = `exam_answers_${params.id}`;
  const startKey = `exam_start_${params.id}`;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [examDurationSec, setExamDurationSec] = useState(6000);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, ExamAnswer>>(() => new Map());
  const [showModal, setShowModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const submittingRef = useRef(false);
  const [viewMode, setViewMode] = useState<'modern' | 'bkn'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('cat_view_mode') as 'modern' | 'bkn') || 'modern';
    return 'modern';
  });

  // Load package questions from server API (supports DB-stored custom packages)
  useEffect(() => {
    fetch(`/api/questions/${params.id}`)
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => {
        let loaded: Question[] = d.questions || [];
        const meta = d.meta;

        // Apply duration from package settings
        if (meta?.duration_sec) {
          setExamDurationSec(meta.duration_sec);
        } else if (loaded.length > 0 && loaded.length < 50) {
          setExamDurationSec(Math.max(600, loaded.length * 60));
        }

        // Apply randomize if enabled in package settings
        if (meta?.randomize_questions) {
          loaded = [...loaded].sort(() => 0.5 - Math.random());
        }
        if (meta?.randomize_options) {
          loaded = loaded.map((q) => ({
            ...q,
            options: [...q.options].sort(() => 0.5 - Math.random()),
          }));
        }

        setQuestions(loaded);
        setLoadingQuestions(false);
      })
      .catch(() => setLoadingQuestions(false));
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

  // Duration is set via package meta; examDurationSec state
  const examDuration = examDurationSec;

  // Track elapsed seconds using a start timestamp for crash recovery
  const elapsedRef = useRef(0);
  useEffect(() => {
    const stored = localStorage.getItem(startKey);
    if (!stored) {
      localStorage.setItem(startKey, String(Date.now()));
    } else {
      const elapsed = Math.floor((Date.now() - Number(stored)) / 1000);
      elapsedRef.current = Math.min(elapsed, examDuration);
    }
  }, [startKey, examDuration]);

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
      localStorage.setItem(`exam_questions_${resultId}`, JSON.stringify(questions));
      localStorage.setItem(`exam_user_answers_${resultId}`, JSON.stringify(answerArr));
      // Fire-and-forget: save to DB for leaderboard
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: params.id,
          answers: Object.fromEntries(answerArr.map(a => [a.questionId, a.selectedOptionId])),
          scoreTwk: result.twk.score,
          scoreTiu: result.tiu.score,
          scoreTkp: result.tkp.score,
          totalScore: result.totalScore,
          isPassed: result.isPassedAll,
          durationUsed: durationSeconds,
        }),
      }).catch(() => {}); // don't block UX
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
    ? Math.max(0, examDuration - elapsedRef.current)
    : examDuration;

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
          className="btn-primary text-sm py-2.5 px-6"
        >
          Kembali ke Daftar Paket
        </button>
      </div>
    );
  }

  const isBknMode = viewMode === 'bkn';

  if (isBknMode) {
    return (
      <>
        {/* Toggle switch fixed top right */}
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 999 }}>
          <button
            onClick={() => {
              setViewMode('modern');
              localStorage.setItem('cat_view_mode', 'modern');
            }}
            style={{
              background: '#c96442',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            ✨ Kembali ke Mode Modern
          </button>
        </div>
        <BKNThemeLayout
          questions={questions}
          currentIndex={currentIndex}
          answers={answers}
          timerElement={<Timer key={initialSeconds} initialSeconds={initialSeconds} onTimeUp={handleTimeUp} />}
          onSelectIndex={setCurrentIndex}
          onSelectOption={handleSelectOption}
          onToggleFlag={handleToggleFlag}
          onOpenModal={() => setShowModal(true)}
          packageId={params.id}
        />
        <FinishExamModal
          isOpen={showModal}
          totalQuestions={questions.length}
          answeredCount={answered}
          flaggedCount={flagged}
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirmSubmit}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(250, 249, 245, 0.9)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(61, 57, 41, 0.04)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm truncate text-[var(--foreground)]">Simulasi CAT CPNS</span>
            <span className="badge-pill badge-neutral text-[11px] hidden sm:inline-flex whitespace-nowrap">
              {params.id.replace('tryout-', 'Tryout ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <button
                onClick={() => {
                  const next = viewMode === 'modern' ? 'bkn' : 'modern';
                  setViewMode(next);
                  localStorage.setItem('cat_view_mode', next);
                }}
                title="Beralih ke tampilan BKN asli"
                className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--secondary)',
                  color: 'var(--foreground)',
                }}
              >
                <Desktop size={13} />
                Mode BKN
              </button>
              <Timer key={initialSeconds} initialSeconds={initialSeconds} onTimeUp={handleTimeUp} />
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-xs py-2 px-4 whitespace-nowrap"
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
              className="btn-secondary text-xs py-2.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CaretLeft size={16} weight="bold" />
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
              className="btn-primary text-xs py-2.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
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
