'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Timer, TimerHandle } from '@/components/Timer';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionNavigationGrid } from '@/components/QuestionNavigationGrid';
import { FinishExamModal } from '@/components/FinishExamModal';
import { ExamModeModal } from '@/components/ExamModeModal';
import { PauseExamModal } from '@/components/PauseExamModal';
import { ExitExamModal } from '@/components/ExitExamModal';
import { calculateExamScore } from '@/lib/scoring';
import { ExamAnswer, Question } from '@/lib/types';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';
import { CaretLeft, CaretRight, Desktop, Pause, SignOut, Warning } from '@phosphor-icons/react';
import { BKNThemeLayout } from '@/components/BKNThemeLayout';
import { ExamType, EXAM_MODES } from '@/lib/examMode';
import { mapKeyToAction } from '@/lib/examShortcuts';
import { shuffleWithinSections, getQuestionSections } from '@/lib/questionSections';
import { calculateTimePerQuestion } from '@/lib/timeTracker';

const EXAM_DURATION = 6000; // 100 minutes

export default function SimulasiPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? null;
  const storageKey = scopedKey(`exam_answers_${params.id}`, userId);
  const startKey = scopedKey(`exam_start_${params.id}`, userId);
  const modeKey = scopedKey(`exam_mode_${params.id}`, userId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [examDurationSec, setExamDurationSec] = useState(6000);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, ExamAnswer>>(() => new Map());
  const [hydrated, setHydrated] = useState(false);

  // Modals
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);

  // Mode Ujian
  const [examType, setExamType] = useState<ExamType>('official');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Ergonomi & Preferensi
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [eliminatedOptions, setEliminatedOptions] = useState<Map<number, Set<string>>>(() => new Map());
  const timerRef = useRef<TimerHandle | null>(null);

  // Time Tracker per Question
  const timeEventsRef = useRef<Array<{ questionIndex: number; timestamp: number }>>([]);
  const submittingRef = useRef(false);

  const [viewMode, setViewMode] = useState<'modern' | 'bkn'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cat_view_mode') as 'modern' | 'bkn') || 'modern';
    }
    return 'modern';
  });

  // Load package questions
  useEffect(() => {
    fetch(`/api/questions/${params.id}`)
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => {
        let loaded: Question[] = d.questions || [];
        const meta = d.meta;

        if (meta?.duration_sec) {
          setExamDurationSec(meta.duration_sec);
        } else if (loaded.length > 0 && loaded.length < 50) {
          setExamDurationSec(Math.max(600, loaded.length * 60));
        }

        if (meta?.randomize_questions) {
          loaded = shuffleWithinSections(loaded);
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

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(storageKey);
      if (savedAnswers) {
        const arr: ExamAnswer[] = JSON.parse(savedAnswers);
        setAnswers(new Map(arr.map((a) => [a.questionId, a])));
      }
      const savedFont = localStorage.getItem('cat_font_size') as 'sm' | 'base' | 'lg' | null;
      if (savedFont) setFontSize(savedFont);

      const savedMode = localStorage.getItem(modeKey) as ExamType | null;
      if (savedMode) {
        setExamType(savedMode);
      } else {
        // Belum pernah pilih mode untuk paket ini, tampilkan modal
        setShowModeModal(true);
      }
    } catch {}
    setHydrated(true);

    // Initial time event
    timeEventsRef.current = [{ questionIndex: 0, timestamp: Date.now() }];
  }, [storageKey, modeKey]);

  const examDuration = examDurationSec;
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

  // Autosave answers
  useEffect(() => {
    if (!hydrated) return;
    const obj: ExamAnswer[] = Array.from(answers.values());
    localStorage.setItem(storageKey, JSON.stringify(obj));
  }, [answers, storageKey, hydrated]);

  // Konfirmasi sebelum meninggalkan halaman (tutup tab / refresh / navigasi luar)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Keluar fullscreen otomatis saat unmount (navigasi keluar halaman ujian)
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Konfirmasi saat back/forward browser (Next.js router)
  useEffect(() => {
    const handlePopState = () => {
      // Tampilkan ExitExamModal alih-alih langsung navigasi
      setShowExitModal(true);
      // Push state lagi agar URL tidak berubah dulu
      history.pushState(null, '', window.location.href);
    };
    // Tambahkan dummy history entry agar popstate ter-trigger saat back
    history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Tab switch listener (Official Mode)
  useEffect(() => {
    if (examType !== 'official') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchCount((c) => {
          const next = c + 1;
          setShowTabWarning(true);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [examType]);

  // Handler berpindah nomor & catat delta waktu
  const handleNavigateIndex = useCallback((nextIdx: number) => {
    setCurrentIndex((prevIdx) => {
      if (nextIdx !== prevIdx) {
        timeEventsRef.current.push({ questionIndex: nextIdx, timestamp: Date.now() });
      }
      return nextIdx;
    });
  }, []);

  // Answer handler
  const handleSelectOption = (optionId: string) => {
    if (showPauseModal) return;
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
    if (showPauseModal) return;
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

  // Eliminasi Opsi (Coret)
  const handleToggleEliminate = (optionId: string) => {
    setEliminatedOptions((prev) => {
      const q = questions[currentIndex];
      const next = new Map(prev);
      const currentSet = new Set(next.get(q.id) || []);
      if (currentSet.has(optionId)) {
        currentSet.delete(optionId);
      } else {
        currentSet.add(optionId);
        // Jika opsi yang dicoret sedang dipilih, batalkan pilihan
        setAnswers((ansPrev) => {
          const ansNext = new Map(ansPrev);
          const existing = ansNext.get(q.id);
          if (existing?.selectedOptionId === optionId) {
            ansNext.set(q.id, { ...existing, selectedOptionId: null });
          }
          return ansNext;
        });
      }
      next.set(q.id, currentSet);
      return next;
    });
  };

  const handleChangeFontSize = (size: 'sm' | 'base' | 'lg') => {
    setFontSize(size);
    localStorage.setItem('cat_font_size', size);
  };

  // Submit Exam
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

      // Hitung durasi per soal dari events
      const timeMap = calculateTimePerQuestion(timeEventsRef.current, Date.now());
      const timePerQuestionRecord: Record<number, number> = {};
      questions.forEach((q, idx) => {
        timePerQuestionRecord[q.id] = timeMap.get(idx) ?? 0;
      });

      // Simpan data: user login pakai localStorage (permanen), guest pakai sessionStorage (temporary)
      if (userId) {
        localStorage.setItem(scopedKey(`exam_result_${resultId}`, userId), JSON.stringify(result));
        localStorage.setItem(scopedKey(`exam_questions_${resultId}`, userId), JSON.stringify(questions));
        localStorage.setItem(scopedKey(`exam_user_answers_${resultId}`, userId), JSON.stringify(answerArr));
        localStorage.setItem(scopedKey(`exam_time_per_q_${resultId}`, userId), JSON.stringify(timePerQuestionRecord));
      } else {
        try {
          sessionStorage.setItem(`guest_exam_result_${resultId}`, JSON.stringify(result));
          sessionStorage.setItem(`guest_exam_questions_${resultId}`, JSON.stringify(questions));
          sessionStorage.setItem(`guest_exam_user_answers_${resultId}`, JSON.stringify(answerArr));
          sessionStorage.setItem(`guest_exam_time_per_q_${resultId}`, JSON.stringify(timePerQuestionRecord));
        } catch {}
      }

      // Kirim ke leaderboard jika official mode
      if (EXAM_MODES[examType].publishToLeaderboard) {
        fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: params.id,
            answers: Object.fromEntries(answerArr.map((a) => [a.questionId, a.selectedOptionId])),
            scoreTwk: result.twk.score,
            scoreTiu: result.tiu.score,
            scoreTkp: result.tkp.score,
            totalScore: result.totalScore,
            isPassed: result.isPassedAll,
            durationUsed: durationSeconds,
          }),
        }).catch(() => {});
      }

      localStorage.removeItem(storageKey);
      localStorage.removeItem(startKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      router.push(`/simulasi/hasil/${resultId}`);
    },
    [params.id, storageKey, startKey, router, questions, examType]
  );

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const handleTimeUp = useCallback(() => {
    submitExam(answersRef.current);
  }, [submitExam]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika sedang buka modal atau mengetik di input
      if (showFinishModal || showExitModal || showPauseModal || showModeModal) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const action = mapKeyToAction(e.key, e.code);
      if (!action) return;

      if (action.type === 'SELECT_OPTION') {
        const q = questions[currentIndex];
        if (q && q.options[action.index]) {
          handleSelectOption(q.options[action.index].id);
        }
      } else if (action.type === 'NEXT_QUESTION') {
        handleNavigateIndex(Math.min(questions.length - 1, currentIndex + 1));
      } else if (action.type === 'PREV_QUESTION') {
        handleNavigateIndex(Math.max(0, currentIndex - 1));
      } else if (action.type === 'TOGGLE_FLAG') {
        handleToggleFlag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    questions,
    showFinishModal,
    showExitModal,
    showPauseModal,
    showModeModal,
    handleNavigateIndex,
  ]);

  const currentQ = questions[currentIndex];
  const currentAns = currentQ ? answers.get(currentQ.id) : undefined;
  const currentEliminated = currentQ ? Array.from(eliminatedOptions.get(currentQ.id) || []) : [];

  // Compute section position for QuestionCard label (e.g. "TIU (5/35)")
  const sectionPosition = useMemo(() => {
    if (!currentQ) return undefined;
    const sections = getQuestionSections(questions, answers);
    const sec = sections.find((s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex);
    if (!sec) return undefined;
    return {
      numberInSection: currentIndex - sec.startIndex + 1,
      sectionTotal: sec.totalCount,
    };
  }, [questions, answers, currentIndex, currentQ]);

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
      <div className="min-h-screen flex items-center justify-center text-xs text-[var(--muted-foreground)]">
        Memuat sesi ujian...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
        <p className="text-slate-600 font-semibold text-sm">Paket soal belum tersedia.</p>
        <button
          onClick={() => router.push('/simulasi')}
          className="btn-primary text-xs py-2.5 px-6"
        >
          Kembali ke Daftar Paket
        </button>
      </div>
    );
  }

  const isBknMode = viewMode === 'bkn';

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Peringatan Tab Switch (Khusus Official Mode) */}
      {showTabWarning && examType === 'official' && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 flex items-center justify-between sticky top-0 z-50 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Warning size={16} weight="bold" />
            <span>
              Perhatian: Anda terdeteksi meninggalkan layar ujian ({tabSwitchCount}x). Jaga fokus Anda!
            </span>
          </div>
          <button
            onClick={() => setShowTabWarning(false)}
            className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Utama Simulasi — hidden saat mode BKN (BKN punya header sendiri) */}
      {!isBknMode && (
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(250, 249, 245, 0.95)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(61, 57, 41, 0.04)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setShowExitModal(true)}
              className="p-1 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:border-red-300 transition"
              style={{ borderColor: 'var(--border)' }}
              title="Keluar / Jeda Ujian"
            >
              <SignOut size={15} weight="bold" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <span className="font-semibold text-xs sm:text-sm truncate text-[var(--foreground)]">Lolos.in</span>
            <span className="badge-pill badge-neutral text-[9px] sm:text-[10px] hidden md:inline-flex">
              {examType === 'official' ? '🏆 Tryout Resmi' : '📖 Latihan Mandiri'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Tombol Pause (Khusus Practice Mode) */}
            {examType === 'practice' && (
              <button
                onClick={() => setShowPauseModal(true)}
                className="p-1 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 text-[var(--foreground)] hover:bg-[var(--muted)] transition"
                style={{ borderColor: 'var(--border)' }}
                title="Jeda ujian sejenak"
              >
                <Pause size={14} weight="bold" />
                <span className="hidden sm:inline">Jeda</span>
              </button>
            )}

            {/* Toggle Mode BKN vs Modern */}
            <button
              onClick={() => {
                const next = viewMode === 'modern' ? 'bkn' : 'modern';
                setViewMode(next);
                localStorage.setItem('cat_view_mode', next);
              }}
              title="Beralih ke tampilan BKN asli"
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--secondary)',
                color: 'var(--foreground)',
              }}
            >
              <Desktop size={13} />
              {isBknMode ? 'Mode Modern' : 'Mode BKN'}
            </button>

            <Timer
              ref={timerRef}
              key={initialSeconds}
              initialSeconds={initialSeconds}
              isPaused={showPauseModal}
              onTimeUp={handleTimeUp}
            />

            <button
              onClick={() => setShowFinishModal(true)}
              className="btn-primary text-xs py-1.5 px-2.5 sm:py-2 sm:px-3.5 whitespace-nowrap"
            >
              Selesai
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Konten Simulasi (BKN vs Modern) */}
      {isBknMode ? (
        <>
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
            timerElement={
              <Timer
                key={initialSeconds}
                initialSeconds={initialSeconds}
                isPaused={showPauseModal}
                onTimeUp={handleTimeUp}
              />
            }
            onSelectIndex={handleNavigateIndex}
            onSelectOption={handleSelectOption}
            onToggleFlag={handleToggleFlag}
            onOpenModal={() => setShowFinishModal(true)}
            packageId={params.id}
          />
        </>
      ) : (
        <div className={`flex-1 max-w-screen-xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex gap-6 ${showPauseModal ? 'filter blur-md select-none pointer-events-none' : ''}`}>
          {/* Main Question Panel */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <QuestionCard
              question={currentQ}
              questionNumber={currentIndex + 1}
              selectedOptionId={currentAns?.selectedOptionId ?? null}
              isFlagged={currentAns?.isFlagged ?? false}
              eliminatedOptionIds={currentEliminated}
              fontSize={fontSize}
              sectionPosition={sectionPosition}
              onSelectOption={handleSelectOption}
              onToggleFlag={handleToggleFlag}
              onToggleEliminate={handleToggleEliminate}
              onChangeFontSize={handleChangeFontSize}
            />

            {/* Navigation buttons */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => handleNavigateIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary text-xs py-2.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <CaretLeft size={16} weight="bold" />
                <span>Sebelumnya <span className="opacity-50 text-[10px] hidden sm:inline">[←]</span></span>
              </button>
              <button
                onClick={() => handleNavigateIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="btn-primary text-xs py-2.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Selanjutnya <span className="opacity-75 text-[10px] hidden sm:inline">[→]</span></span>
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Sidebar Navigation Grid */}
          <aside className="hidden lg:block w-64 shrink-0">
            <QuestionNavigationGrid
              questions={questions}
              answers={answers}
              currentIndex={currentIndex}
              onSelectIndex={handleNavigateIndex}
            />
          </aside>
        </div>
      )}

      {/* Modal Pemilihan Mode (Official vs Practice) */}
      <ExamModeModal
        isOpen={showModeModal}
        packageLabel={params.id.replace('tryout-', 'Paket Tryout ')}
        onSelect={(mode) => {
          setExamType(mode);
          localStorage.setItem(modeKey, mode);
          setShowModeModal(false);
          if (mode === 'official' && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
      />

      {/* Modal Jeda / Pause */}
      <PauseExamModal
        isOpen={showPauseModal}
        remainingSeconds={timerRef.current ? timerRef.current.getRemainingSeconds() : 0}
        onResume={() => setShowPauseModal(false)}
      />

      {/* Modal Exit */}
      <ExitExamModal
        isOpen={showExitModal}
        examType={examType}
        onCancel={() => setShowExitModal(false)}
        onSaveDraft={() => {
          // Answers sudah terautosave di localStorage
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          setShowExitModal(false);
          router.push('/simulasi');
        }}
        onSubmitNow={() => {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          setShowExitModal(false);
          submitExam(answers);
        }}
        onAbandon={() => {
          // Official mode: hapus semua draft, skor hangus
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(startKey);
            localStorage.removeItem(modeKey);
          } catch {}
          setShowExitModal(false);
          router.push('/simulasi');
        }}
      />

      {/* Modal Finish / Submit */}
      <FinishExamModal
        isOpen={showFinishModal}
        totalQuestions={questions.length}
        answeredCount={answered}
        flaggedCount={flagged}
        onCancel={() => setShowFinishModal(false)}
        onConfirm={() => {
          setShowFinishModal(false);
          submitExam(answers);
        }}
      />
    </div>
  );
}
