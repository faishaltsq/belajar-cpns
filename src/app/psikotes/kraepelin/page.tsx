'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KraepelinBoard } from '@/components/psikotes/KraepelinBoard';
import { KraepelinKeypad } from '@/components/psikotes/KraepelinKeypad';
import {
  generateKraepelinColumn,
  getPairSumLastDigit,
  evaluateKraepelinResults,
} from '@/lib/psikotes';
import type { KraepelinColumn, KraepelinInput } from '@/lib/types';
import { ArrowLeft, Play, Timer } from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { setScopedJSON } from '@/lib/userStorage';

type KraepelinMode = 'kilat' | 'standar' | 'simulasi';

interface KraepelinModeConfig {
  columns: number;
  durationPerCol: number;
  numbersPerCol: number;
  label: string;
  desc: string;
}

const MODES: Record<KraepelinMode, KraepelinModeConfig> = {
  kilat: {
    columns: 3,
    durationPerCol: 15,
    numbersPerCol: 20,
    label: 'Latihan Kilat',
    desc: '3 Kolom · 15 detik/kolom (Pemanasan cepat)',
  },
  standar: {
    columns: 5,
    durationPerCol: 30,
    numbersPerCol: 35,
    label: 'Standar Latihan',
    desc: '5 Kolom · 30 detik/kolom (Rekomendasi adaptasi ritme)',
  },
  simulasi: {
    columns: 10,
    durationPerCol: 30,
    numbersPerCol: 45,
    label: 'Simulasi Penuh Kedinasan / BKN',
    desc: '10 Kolom · 30 detik/kolom (Uji ketahanan mental penuh)',
  },
};

export default function KraepelinRunnerPage() {
  const router = useRouter();
  const { user } = useUser();

  const [selectedMode, setSelectedMode] = useState<KraepelinMode>('standar');
  const [phase, setPhase] = useState<'lobby' | 'countdown' | 'active' | 'done'>('lobby');
  const [countdown, setCountdown] = useState(3);
  const [columns, setColumns] = useState<KraepelinColumn[]>([]);
  const [currentCol, setCurrentCol] = useState(0);
  const [currentPair, setCurrentPair] = useState(0);
  const [inputs, setInputs] = useState<KraepelinInput[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pairStartRef = useRef(Date.now());
  const advancingRef = useRef(false);

  const config = MODES[selectedMode];

  const handleStart = (m: KraepelinMode) => {
    setSelectedMode(m);
    const cfg = MODES[m];
    setColumns(
      Array.from({ length: cfg.columns }, (_, i) =>
        generateKraepelinColumn(i, cfg.numbersPerCol)
      )
    );
    setInputs([]);
    setCurrentCol(0);
    setCurrentPair(0);
    setCountdown(3);
    setPhase('countdown');
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('active');
      pairStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Column timer
  useEffect(() => {
    if (phase !== 'active') return;
    setSecondsLeft(config.durationPerCol);
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, currentCol, config.durationPerCol]);

  // Advance column when time runs out
  const advanceColumn = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (currentCol + 1 >= config.columns) {
      setPhase('done');
    } else {
      setCurrentCol((c) => c + 1);
      setCurrentPair(0);
      pairStartRef.current = Date.now();
    }
    setTimeout(() => { advancingRef.current = false; }, 100);
  }, [currentCol, config.columns]);

  useEffect(() => {
    if (phase !== 'active' || secondsLeft > 0) return;
    advanceColumn();
  }, [secondsLeft, phase, advanceColumn]);

  // Finish -> evaluate, save, redirect
  useEffect(() => {
    if (phase !== 'done') return;
    const result = evaluateKraepelinResults(inputs, config.columns, config.durationPerCol);
    setScopedJSON('psikotes_kraepelin_result', user?.id, result);
    localStorage.setItem('psikotes_kraepelin_result', JSON.stringify(result));
    router.push('/psikotes/hasil?type=kraepelin');
  }, [phase, inputs, config.columns, config.durationPerCol, user, router]);

  const handleDigit = useCallback(
    (digit: number) => {
      if (phase !== 'active' || columns.length === 0) return;
      const col = columns[currentCol];
      if (currentPair + 1 >= col.numbers.length) return;

      const a = col.numbers[currentPair];
      const b = col.numbers[currentPair + 1];
      const correct = getPairSumLastDigit(a, b);
      const isCorrect = digit === correct;
      const now = Date.now();

      const inp: KraepelinInput = {
        columnIndex: currentCol,
        pairIndex: currentPair,
        userAnswer: digit,
        correctAnswer: correct,
        isCorrect,
        timeSpentMs: now - pairStartRef.current,
      };

      setInputs((prev) => [...prev, inp]);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setTimeout(() => setFeedback(null), 250);

      if (currentPair + 2 >= col.numbers.length) {
        advanceColumn();
      } else {
        setCurrentPair((p) => p + 1);
        pairStartRef.current = Date.now();
      }
    },
    [phase, columns, currentCol, currentPair, advanceColumn]
  );

  // Keyboard support for 0-9
  useEffect(() => {
    if (phase !== 'active') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(parseInt(e.key, 10));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleDigit]);

  // Lobby
  if (phase === 'lobby') {
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
              Tes Kraepelin / Pauli (Koran)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
              Tes penjumlahan angka cepat dari bawah ke atas untuk mengukur kecepatan, ketelitian, kestabilan emosi, dan ketahanan kerja di bawah tekanan waktu.
            </p>
          </div>

          <div className="card-modern p-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Aturan Pengerjaan:</h3>
            <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Jumlahkan 2 angka yang berdekatan.</li>
              <li>Tuliskan <strong>satuan terakhir</strong> saja (contoh: 8 + 7 = 15, masukkan angka <strong>5</strong>).</li>
              <li>Ketika waktu kolom habis, sistem otomatis berpindah ke kolom berikutnya.</li>
              <li>Gunakan tombol angka di layar atau tombol keyboard fisik <strong>0 - 9</strong>.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
              Pilih Mode Simulasi:
            </span>
            <div className="grid gap-2.5">
              {(Object.keys(MODES) as KraepelinMode[]).map((mKey) => {
                const cfg = MODES[mKey];
                const active = selectedMode === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setSelectedMode(mKey)}
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
            onClick={() => handleStart(selectedMode)}
            className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <Play size={18} weight="fill" /> Mulai Simulasi Kraepelin
          </button>
        </div>
      </div>
    );
  }

  // Countdown
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-modern rounded-3xl p-12 text-center max-w-xs w-full animate-scale-in">
          <p className="text-[var(--muted-foreground)] text-xs uppercase font-bold tracking-wider mb-3">
            Bersiap, Tes Dimulai Dalam
          </p>
          <span className="text-7xl font-black text-[var(--primary)]">{countdown}</span>
        </div>
      </div>
    );
  }

  // Active Runner
  if (phase === 'active' && columns.length > 0) {
    const col = columns[currentCol];
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-4 max-w-sm mx-auto">
        <KraepelinBoard
          numbers={col.numbers}
          currentPairIndex={currentPair}
          columnSecondsLeft={secondsLeft}
          columnDuration={config.durationPerCol}
          currentColumnIndex={currentCol}
          totalColumns={config.columns}
          recentAnswerFeedback={feedback}
        />
        <KraepelinKeypad onInput={handleDigit} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted-foreground)] text-sm animate-pulse">Menghitung analisis hasil…</p>
    </div>
  );
}
