'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Timer, Sparkle, FastForward } from '@phosphor-icons/react';
import {
  generateKecermatanTable,
  generateKecermatanQuestion,
  evaluateKecermatanResults,
} from '@/lib/kecermatan';
import type {
  KecermatanReferenceTable,
  KecermatanQuestion,
  KecermatanInput,
} from '@/lib/types';
import { useUser } from '@/lib/useUser';
import { setScopedJSON } from '@/lib/userStorage';

interface KecermatanRunnerProps {
  type: 'angka' | 'huruf';
  title: string;
  description: string;
}

type DurationMode = 'kilat' | 'standar' | 'simulasi';

interface ModeConfig {
  columns: number;
  durationSeconds: number;
  label: string;
  desc: string;
}

const MODES: Record<DurationMode, ModeConfig> = {
  kilat: { columns: 3, durationSeconds: 30, label: 'Latihan Kilat', desc: '3 Kolom · 30 detik/kolom (Pemanasan cepat)' },
  standar: { columns: 5, durationSeconds: 60, label: 'Standar CPNS', desc: '5 Kolom · 60 detik/kolom (Rekomendasi)' },
  simulasi: { columns: 10, durationSeconds: 60, label: 'Simulasi Penuh', desc: '10 Kolom · 60 detik/kolom (Ketahanan psikotes)' },
};

export default function KecermatanRunner({ type, title, description }: KecermatanRunnerProps) {
  const router = useRouter();
  const { user } = useUser();

  const [mode, setMode] = useState<DurationMode>('standar');
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'column_transition' | 'finished'>('lobby');

  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [referenceTable, setReferenceTable] = useState<KecermatanReferenceTable | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<KecermatanQuestion | null>(null);

  const [inputs, setInputs] = useState<KecermatanInput[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const modeConfig = MODES[mode];

  // Initialize fresh column
  const startColumn = useCallback((colIdx: number) => {
    const table = generateKecermatanTable(type);
    const q = generateKecermatanQuestion(table);
    setReferenceTable(table);
    setCurrentQuestion(q);
    setCurrentColumnIndex(colIdx);
    setSecondsRemaining(modeConfig.durationSeconds);
    setGameState('playing');
  }, [type, modeConfig.durationSeconds]);

  // Answer handler
  const handleAnswer = useCallback((letter: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (gameState !== 'playing' || !currentQuestion || !referenceTable) return;

    const isCorrect = letter === currentQuestion.correctLetter;
    const inputRecord: KecermatanInput = {
      columnIndex: currentColumnIndex,
      questionIndex: inputs.filter((i) => i.columnIndex === currentColumnIndex).length,
      selectedLetter: letter,
      correctLetter: currentQuestion.correctLetter,
      isCorrect,
      timeSpentMs: 0,
    };

    setInputs((prev) => [...prev, inputRecord]);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFeedback(null), 180);

    // Next question in current column
    setCurrentQuestion(generateKecermatanQuestion(referenceTable));
  }, [gameState, currentQuestion, referenceTable, currentColumnIndex]);

  // Keyboard navigation A-E or 1-5
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const map: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'> = {
        A: 'A', '1': 'A',
        B: 'B', '2': 'B',
        C: 'C', '3': 'C',
        D: 'D', '4': 'D',
        E: 'E', '5': 'E',
      };
      if (map[key]) {
        e.preventDefault();
        handleAnswer(map[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleAnswer]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Move to next column or finish
          const nextCol = currentColumnIndex + 1;
          if (nextCol < modeConfig.columns) {
            setGameState('column_transition');
            setTimeout(() => {
              startColumn(nextCol);
            }, 1200);
          } else {
            setGameState('finished');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentColumnIndex, modeConfig.columns, startColumn]);

  // On finished: evaluate and redirect
  useEffect(() => {
    if (gameState === 'finished') {
      const result = evaluateKecermatanResults(
        inputs,
        modeConfig.columns,
        modeConfig.durationSeconds,
        type
      );
      setScopedJSON('psikotes_kecermatan_result', user?.id, result);
      localStorage.setItem('psikotes_kecermatan_result', JSON.stringify(result));
      router.push(`/psikotes/hasil?type=kecermatan`);
    }
  }, [gameState, inputs, modeConfig, type, user, router]);

  // Lobby Screen
  if (gameState === 'lobby') {
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
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              {description}
            </p>
          </div>

          <div className="card-modern p-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Petunjuk Pengerjaan:</h3>
            <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Di bagian atas akan muncul <strong>Tabel Kunci</strong> berisi 5 pasangan huruf (A, B, C, D, E) dan simbol referensi.</li>
              <li>Pada setiap soal, ditampilkan 4 simbol acak.</li>
              <li>Tugas Anda: temukan <strong>1 simbol yang HILANG</strong>, lalu pilih huruf tombol kuncinya secepat dan seakurat mungkin.</li>
              <li>Dapat menggunakan klik layar atau tombol keyboard <strong>A, B, C, D, E</strong> (atau angka <strong>1, 2, 3, 4, 5</strong>).</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
              Pilih Durasi Latihan:
            </span>
            <div className="grid gap-2.5">
              {(Object.keys(MODES) as DurationMode[]).map((mKey) => {
                const cfg = MODES[mKey];
                const active = mode === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setMode(mKey)}
                    className={[
                      'p-4 rounded-2xl text-left border transition flex items-center justify-between',
                      active
                        ? 'border-[var(--primary)] bg-amber-50/60 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60',
                    ].join(' ')}
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{cfg.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{cfg.desc}</p>
                    </div>
                    {active && <span className="badge-pill bg-[var(--primary)] text-white text-xs">Dipilih</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInputs([]);
              startColumn(0);
            }}
            className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <Play size={18} weight="fill" /> Mulai Tes Kecermatan
          </button>
        </div>
      </div>
    );
  }

  // Column transition splash
  if (gameState === 'column_transition') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="card-modern p-8 text-center max-w-sm flex flex-col items-center gap-4 animate-scale-in">
          <FastForward size={40} className="text-[var(--primary)] animate-bounce" weight="fill" />
          <h2 className="text-xl font-bold text-[var(--foreground)]">PINDAH KOLOM!</h2>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Bersiap untuk Kolom {currentColumnIndex + 2} dari {modeConfig.columns}. Kunci simbol akan diperbarui!
          </p>
        </div>
      </div>
    );
  }

  // Active Runner
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 max-w-lg mx-auto">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-md">
            Kolom {currentColumnIndex + 1} / {modeConfig.columns}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            Terjawab: {inputs.filter((i) => i.columnIndex === currentColumnIndex).length}
          </span>
        </div>
        <div
          className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
            secondsRemaining <= 10
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-[var(--muted)] text-[var(--foreground)]'
          }`}
        >
          <Timer size={16} weight="bold" />
          <span>{secondsRemaining}s</span>
        </div>
      </div>

      {/* Progress bar per column */}
      <div className="w-full h-1.5 bg-[#e0dcea] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-1000"
          style={{ width: `${(secondsRemaining / modeConfig.durationSeconds) * 100}%` }}
        />
      </div>

      {/* REFERENCE TABLE */}
      {referenceTable && (
        <div className="w-full card-modern p-4 sm:p-5 mb-5 shadow-xs border-2 border-[var(--primary)]/20">
          <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider text-center mb-3">
            Tabel Referensi Kunci (Kolom {currentColumnIndex + 1})
          </p>
          <div className="grid grid-cols-5 gap-2">
            {referenceTable.keys.map((k) => (
              <div
                key={k.letter}
                className="flex flex-col items-center rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] py-2 px-1"
              >
                <span className="text-xs font-bold text-[var(--primary)] mb-1">{k.letter}</span>
                <span className="text-xl sm:text-2xl font-black text-[var(--foreground)] font-mono">{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUESTION DISPLAY */}
      {currentQuestion && (
        <div
          className={[
            'w-full card-modern p-6 mb-6 text-center flex flex-col items-center gap-4 transition-all duration-150',
            feedback === 'correct' ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : '',
            feedback === 'wrong' ? 'ring-2 ring-red-500 bg-red-50/30' : '',
          ].join(' ')}
        >
          <p className="text-xs text-[var(--muted-foreground)]">Karakter manakah yang HILANG?</p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 my-2">
            {currentQuestion.displayedValues.map((val, idx) => (
              <div
                key={idx}
                className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-[var(--card)] border-2 border-[var(--border)] shadow-xs flex items-center justify-center text-2xl sm:text-3xl font-black font-mono text-[var(--foreground)]"
              >
                {val}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INPUT KEYPAD */}
      <div className="w-full grid grid-cols-5 gap-2 sm:gap-3">
        {(['A', 'B', 'C', 'D', 'E'] as const).map((letter, idx) => (
          <button
            key={letter}
            type="button"
            onClick={() => handleAnswer(letter)}
            className="py-4 sm:py-5 rounded-2xl bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition active:scale-95 shadow-xs flex flex-col items-center justify-center group"
          >
            <span className="text-lg sm:text-xl font-black group-hover:text-white text-[var(--foreground)]">
              {letter}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] group-hover:text-white/80">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[var(--muted-foreground)] mt-6 text-center">
        Tip: Gunakan tombol keyboard <strong>A, B, C, D, E</strong> atau <strong>1, 2, 3, 4, 5</strong> untuk pengerjaan lebih cepat.
      </p>
    </div>
  );
}
