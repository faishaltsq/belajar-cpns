'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Timer, TimerHandle } from '@/components/Timer';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionNavigationGrid } from '@/components/QuestionNavigationGrid';
import { QuestionNavigationModal } from '@/components/QuestionNavigationModal';
import { FinishExamModal } from '@/components/FinishExamModal';
import { ExamModeModal } from '@/components/ExamModeModal';
import { PauseExamModal } from '@/components/PauseExamModal';
import { ExitExamModal } from '@/components/ExitExamModal';
import { UpgradeProModal } from '@/components/UpgradeProModal';
import { ExamAnswer, ExamResult, Question } from '@/lib/types';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';
import { CaretLeft, CaretRight, Desktop, Pause, SignOut, Warning, SquaresFour } from '@phosphor-icons/react';
import { BKNThemeLayout } from '@/components/BKNThemeLayout';
import { ExamType, EXAM_MODES } from '@/lib/examMode';
import { mapKeyToAction } from '@/lib/examShortcuts';
import { shuffleWithinSections, getQuestionSections } from '@/lib/questionSections';
import { calculateTimePerQuestion } from '@/lib/timeTracker';
import { elapsedSeconds, shiftDeadlineForPause } from '@/lib/examClock';

export default function ExamSession({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const userId = user?.id ?? null;
  const storageKey = scopedKey(`exam_answers_${params.id}`, userId);
  const startKey = scopedKey(`exam_start_${params.id}`, userId);
  // Written while a practice pause is open, so a reload inside the pause can
  // give the paused minutes back instead of silently spending them.
  const pausedKey = scopedKey(`exam_paused_at_${params.id}`, userId);
  const modeKey = scopedKey(`exam_mode_${params.id}`, userId);
  const indexKey = scopedKey(`exam_index_${params.id}`, userId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [examDurationSec, setExamDurationSec] = useState(6000);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, ExamAnswer>>(() => new Map());
  const [hydrated, setHydrated] = useState(false);
  // 403 from /api/questions: the package is behind the paywall or the visitor
  // is not signed in. Kept separate from "no questions" so the user gets a
  // real next step instead of a dead end.
  const [lockedReason, setLockedReason] = useState<'login_required' | 'payment_required' | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Modals
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showMobileNavModal, setShowMobileNavModal] = useState(false);

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
      .then(async (r) => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}));
          setLockedReason(body?.reason === 'login_required' ? 'login_required' : 'payment_required');
          return { questions: [] as Question[] };
        }
        return r.ok ? r.json() : { questions: [] };
      })
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
  //
  // Waits for the auth probe to settle first. `useUser()` resolves
  // asynchronously, so `userId` is null on the first render and flips ~200 ms
  // later; without this gate every key below is minted under the guest scope
  // and then re-read from the account scope mid-exam, which silently swapped a
  // half-finished paper for an older draft and restarted the clock.
  useEffect(() => {
    if (userLoading) return;
    try {
      const savedAnswers = localStorage.getItem(storageKey);
      if (savedAnswers) {
        const arr: ExamAnswer[] = JSON.parse(savedAnswers);
        setAnswers(new Map(arr.map((a) => [a.questionId, a])));
      }
      const savedFont = localStorage.getItem('cat_font_size') as 'sm' | 'base' | 'lg' | null;
      if (savedFont) setFontSize(savedFont);

      const savedIndex = localStorage.getItem(indexKey);
      if (savedIndex) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setCurrentIndex(parsed);
        }
      }

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
  }, [storageKey, modeKey, indexKey, userLoading]);

  const examDuration = examDurationSec;
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (userLoading) return;
    const stored = localStorage.getItem(startKey);
    if (!stored) {
      localStorage.setItem(startKey, String(Date.now()));
      localStorage.removeItem(pausedKey);
    } else {
      // Credit back any pause that was still open when the browser closed.
      const pausedAt = Number(localStorage.getItem(pausedKey));
      if (Number.isFinite(pausedAt) && pausedAt > 0) {
        const pausedFor = Date.now() - pausedAt;
        const shifted = shiftDeadlineForPause(Number(stored), pausedFor, examDuration);
        if (shifted !== Number(stored)) localStorage.setItem(startKey, String(shifted));
        localStorage.removeItem(pausedKey);
      }
      const start = Number(localStorage.getItem(startKey) ?? stored);
      elapsedRef.current = elapsedSeconds(start, Date.now(), examDuration);
    }
  }, [startKey, pausedKey, examDuration, userLoading]);

  // Practice mode lets the learner pause. The countdown pauses inside <Timer/>,
  // but `startKey` is the wall-clock deadline that every reload and the final
  // `durationUsed` are computed from — so without shifting it the paused
  // minutes are still charged against the paper, and because the value is
  // wall-clock the loss becomes permanent the moment the tab is closed while
  // paused.
  const pausedAtRef = useRef<number | null>(null);
  const endPause = useCallback(() => {
    const at = pausedAtRef.current;
    if (at === null) return;
    pausedAtRef.current = null;
    const pausedFor = Date.now() - at;
    if (pausedFor <= 0) return;
    try {
      const stored = localStorage.getItem(startKey);
      if (stored) {
        const shifted = shiftDeadlineForPause(Number(stored), pausedFor, examDuration);
        if (shifted !== Number(stored)) localStorage.setItem(startKey, String(shifted));
      }
      localStorage.removeItem(pausedKey);
    } catch {}
  }, [startKey, pausedKey, examDuration]);

  useEffect(() => {
    if (!showPauseModal) return undefined;
    const at = Date.now();
    pausedAtRef.current = at;
    try {
      localStorage.setItem(pausedKey, String(at));
    } catch {}
    return endPause;
  }, [showPauseModal, endPause, pausedKey]);

  // Autosave answers
  useEffect(() => {
    if (!hydrated) return;
    const obj: ExamAnswer[] = Array.from(answers.values());
    localStorage.setItem(storageKey, JSON.stringify(obj));
  }, [answers, storageKey, hydrated]);

  // Autosave active question index
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(indexKey, String(currentIndex));
  }, [currentIndex, indexKey, hydrated]);

  // Konfirmasi sebelum meninggalkan halaman (tutup tab / refresh / navigasi luar)
  // Hanya dipasang ketika sesi ujian benar-benar sedang berjalan — halaman
  // terkunci (paywall) dan halaman gagal-muat tidak boleh memunculkan dialog.
  useEffect(() => {
    if (questions.length === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [questions.length]);

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
    // Tanpa sesi berjalan, tombol back harus berperilaku normal.
    if (questions.length === 0) return;
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
  }, [questions.length]);

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
  //
  // The exam questions arrive without option scores (see questionPayload.ts), so
  // the browser cannot compute a real result on its own — a local
  // `calculateExamScore` over those options sums `undefined` and yields NaN, and
  // in practice it printed a screenful of "NaN" instead of a score. The server
  // is therefore the only scorer, and a failed POST must not be papered over:
  // the draft is left intact so the learner can retry instead of losing the
  // paper they just spent 100 minutes on.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitExam = useCallback(
    async (answersMap: Map<number, ExamAnswer>) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);

      const startTime = Number(localStorage.getItem(startKey) ?? Date.now());
      const durationSeconds = Math.min(
        Math.floor((Date.now() - startTime) / 1000),
        examDuration
      );
      const answerArr = Array.from(answersMap.values());
      const answerRecord = Object.fromEntries(
        answerArr.map((a) => [a.questionId, a.selectedOptionId])
      );
      const resultId = `${params.id}-${Date.now()}`;
      const isPractice = !EXAM_MODES[examType].publishToLeaderboard;

      let serverResultId: string | null = null;
      let result: ExamResult | null = null;
      let scoreSnapshot: { questionId: number; score: number; maxScore: number }[] = [];
      let reviewSnapshot: Question[] | null = null;

      try {
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: params.id,
            answers: answerRecord,
            durationUsed: durationSeconds,
            practice: isPractice,
          }),
        });

        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          setLockedReason(body?.reason === 'login_required' ? 'login_required' : 'payment_required');
          setSubmitError('Sesi ujianmu tidak lagi punya akses ke paket ini.');
          submittingRef.current = false;
          setSubmitting(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data?.result) result = data.result;
        if (typeof data?.id === 'string' && data.id) serverResultId = data.id;
        if (Array.isArray(data?.questionScores)) scoreSnapshot = data.questionScores;
        if (Array.isArray(data?.review)) reviewSnapshot = data.review;
      } catch {
        // Network drop or server error: keep every draft key so the answers and
        // the original start timestamp survive, and let the learner retry.
        setSubmitError(
          'Koneksi terputus saat mengirim jawaban. Jawabanmu masih tersimpan — tekan "Selesai" lagi untuk mencoba ulang.'
        );
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      if (!result) {
        setSubmitError('Server tidak mengembalikan hasil ujian. Coba kirim ulang.');
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // Hitung durasi per soal dari events
      const timeMap = calculateTimePerQuestion(timeEventsRef.current, Date.now());
      const timePerQuestionRecord: Record<number, number> = {};
      questions.forEach((q, idx) => {
        timePerQuestionRecord[q.id] = timeMap.get(idx) ?? 0;
      });

      // The score snapshot is what the wrong-answer collector reads, since the
      // stored questions do not carry per-option scores (audit F3).
      const scoreMap: Record<string, { score: number; maxScore: number }> = {};
      for (const s of scoreSnapshot) scoreMap[String(s.questionId)] = { score: s.score, maxScore: s.maxScore };

      // Practice results are not stored server-side, so the review payload the
      // server returned is what /simulasi/hasil renders instead of the exam key.
      const questionsForReview = reviewSnapshot ?? questions;

      if (userId) {
        localStorage.setItem(scopedKey(`exam_result_${resultId}`, userId), JSON.stringify(result));
        localStorage.setItem(scopedKey(`exam_questions_${resultId}`, userId), JSON.stringify(questionsForReview));
        localStorage.setItem(scopedKey(`exam_user_answers_${resultId}`, userId), JSON.stringify(answerArr));
        localStorage.setItem(scopedKey(`exam_time_per_q_${resultId}`, userId), JSON.stringify(timePerQuestionRecord));
        localStorage.setItem(scopedKey(`exam_scores_${resultId}`, userId), JSON.stringify(scoreMap));
        if (serverResultId) {
          localStorage.setItem(scopedKey(`exam_server_id_${resultId}`, userId), serverResultId);
        }
      } else {
        try {
          sessionStorage.setItem(`guest_exam_result_${resultId}`, JSON.stringify(result));
          sessionStorage.setItem(`guest_exam_questions_${resultId}`, JSON.stringify(questionsForReview));
          sessionStorage.setItem(`guest_exam_user_answers_${resultId}`, JSON.stringify(answerArr));
          sessionStorage.setItem(`guest_exam_time_per_q_${resultId}`, JSON.stringify(timePerQuestionRecord));
          sessionStorage.setItem(`guest_exam_scores_${resultId}`, JSON.stringify(scoreMap));
          if (serverResultId) {
            sessionStorage.setItem(`guest_exam_server_id_${resultId}`, serverResultId);
          }
        } catch {}
      }

      // Only now — the result is persisted and navigable — is the draft retired.
      localStorage.removeItem(storageKey);
      localStorage.removeItem(startKey);
      localStorage.removeItem(indexKey);
      localStorage.removeItem(pausedKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      router.push(`/simulasi/hasil/${resultId}`);
    },
    // examDuration is the resolved per-package duration; EXAM_DURATION (6000)
    // was hardcoded here and would clamp a 130-minute special-needs paper.
    [params.id, storageKey, startKey, indexKey, pausedKey, router, questions, examType, userId, examDuration]
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
    // Konten paket sudah dirender server di page.tsx; ini hanya status singkat.
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-[var(--muted-foreground)]">
        Menyiapkan sesi ujian...
      </div>
    );
  }

  if (lockedReason && questions.length === 0) {
    // The server refused the package. Show a real next step rather than the
    // generic "not available" screen — the package exists, it is simply locked.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="card-modern max-w-md w-full p-6">
          <p className="text-xl font-bold text-[var(--foreground)]">
            {lockedReason === 'login_required' ? 'Masuk untuk melanjutkan' : 'Paket ini bagian dari akses berbayar'}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {lockedReason === 'login_required'
              ? 'Kamu bisa mengerjakan paket gratis tanpa akun. Paket ini tersimpan di akunmu setelah kamu masuk.'
              : 'Paket ini terbuka untuk pengguna yang sudah membeli paket ini, bundle, atau akses PRO.'}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => router.push(`/login?redirect=/simulasi/${params.id}`)}
              className="btn-secondary text-xs py-2.5 px-5"
            >
              Masuk
            </button>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="btn-primary text-xs py-2.5 px-5"
            >
              Lihat Paket Akses
            </button>
            <button
              onClick={() => router.push('/simulasi')}
              className="text-xs py-2.5 px-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-4"
            >
              Paket gratis
            </button>
          </div>
        </div>
        <UpgradeProModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          packageId={params.id}
          triggerPackage={params.id.replace('tryout-', 'Paket Tryout ')}
        />
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
        <div className="max-w-screen-xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Sisi Kiri: Keluar, Brand, Navigasi Soal Mobile, Mode Badge (Desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
            <button
              onClick={() => setShowExitModal(true)}
              className="h-8 px-2 sm:px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 text-[var(--muted-foreground)] hover:text-red-600 hover:border-red-300 transition shrink-0"
              style={{ borderColor: 'var(--border)' }}
              title="Keluar / Jeda Ujian"
            >
              <SignOut size={16} weight="bold" />
              <span className="hidden sm:inline">Keluar</span>
            </button>

            <span className="font-bold text-xs sm:text-sm text-[var(--foreground)] hidden sm:inline shrink-0">
              Lolos.in
            </span>

            {/* Tombol Cepat Buka Daftar Soal di Header Mobile */}
            <button
              type="button"
              onClick={() => setShowMobileNavModal(true)}
              className="h-8 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--foreground)] bg-[var(--card)] hover:border-[var(--primary)] transition lg:hidden shadow-xs shrink-0 flex items-center gap-1.5"
              title="Buka daftar nomor soal"
            >
              <SquaresFour size={15} weight="bold" className="text-[var(--primary)]" />
              <span>{currentIndex + 1}/{questions.length}</span>
            </button>

            {/* Mode Ujian - hanya tampil di layar md ke atas agar header mobile lega */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--border)] shrink-0">
              {examType === 'official' ? '🏆 Tryout Resmi' : '📖 Latihan Mandiri'}
            </span>
          </div>

          {/* Sisi Kanan: Pause, Mode BKN, Timer, Selesai */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Tombol Pause (Khusus Practice Mode) */}
            {examType === 'practice' && (
              <button
                onClick={() => setShowPauseModal(true)}
                className="h-8 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-1 text-[var(--foreground)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition shrink-0 shadow-xs"
                title="Jeda ujian sejenak"
              >
                <Pause size={15} weight="bold" />
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
              className="hidden sm:flex h-8 items-center gap-1 text-[10px] font-bold px-2.5 rounded-xl border transition shrink-0"
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
              className="h-8 btn-primary text-xs py-0 px-3 sm:px-4 rounded-xl font-bold whitespace-nowrap shrink-0 shadow-xs"
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
              onOpenNavModal={() => setShowMobileNavModal(true)}
            />

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <button
                onClick={() => handleNavigateIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary text-xs sm:text-sm py-2.5 px-3 sm:px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
              >
                <CaretLeft size={16} weight="bold" />
                <span>Sebelumnya <span className="opacity-50 text-[10px] hidden sm:inline">[←]</span></span>
              </button>

              {/* Mobile Quick-jump button */}
              <button
                type="button"
                onClick={() => setShowMobileNavModal(true)}
                className="flex-1 max-w-[200px] py-2.5 px-2 sm:px-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98 lg:hidden"
                title="Buka daftar nomor soal"
              >
                <SquaresFour size={16} weight="bold" className="text-[var(--primary)]" />
                <span>No. {currentIndex + 1} / {questions.length}</span>
              </button>

              <button
                onClick={() => handleNavigateIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="btn-primary text-xs sm:text-sm py-2.5 px-3 sm:px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
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
            localStorage.removeItem(pausedKey);
          } catch {}
          setShowExitModal(false);
          router.push('/simulasi');
        }}
      />

      {/* Modal Navigasi Nomor Soal Mobile */}
      <QuestionNavigationModal
        isOpen={showMobileNavModal}
        onClose={() => setShowMobileNavModal(false)}
        questions={questions}
        answers={answers}
        currentIndex={currentIndex}
        onSelectIndex={handleNavigateIndex}
      />

      {/* Modal Finish / Submit */}
      <FinishExamModal
        isOpen={showFinishModal}
        totalQuestions={questions.length}
        answeredCount={answered}
        flaggedCount={flagged}
        isSubmitting={submitting}
        errorMessage={submitError}
        onCancel={() => setShowFinishModal(false)}
        onConfirm={() => {
          // The dialog stays open while the POST is in flight. submitExam
          // navigates away on success and only returns here on failure, so the
          // retry button and the error are exactly where the learner left off.
          submitExam(answers);
        }}
      />

      {/* Failures from the time-up path arrive with no dialog open, so the
          retryable state has to be visible on the paper itself. */}
      {submitError && !showFinishModal && (
        <div
          role="alert"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-lg items-start gap-2 rounded-2xl border border-red-300/60 bg-white p-3 shadow-lg dark:bg-neutral-900 sm:inset-x-6 sm:bottom-5"
        >
          <Warning size={16} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-red-700 dark:text-red-400">{submitError}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowFinishModal(true)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 transition"
              >
                Coba Kirim Ulang
              </button>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
