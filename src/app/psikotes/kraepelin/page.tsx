'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KraepelinBoard } from '@/components/psikotes/KraepelinBoard';
import { KraepelinKeypad } from '@/components/psikotes/KraepelinKeypad';
import {
  generateKraepelinColumn,
  getPairSumLastDigit,
  evaluateKraepelinResults,
} from '@/lib/psikotes';
import type { KraepelinColumn, KraepelinInput } from '@/lib/types';

const TOTAL_COLUMNS = 10;
const COLUMN_DURATION = 20; // seconds
const NUMBERS_PER_COLUMN = 25;

export default function KraepelinRunnerPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'countdown' | 'active' | 'done'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [columns, setColumns] = useState<KraepelinColumn[]>([]);
  const [currentCol, setCurrentCol] = useState(0);
  const [currentPair, setCurrentPair] = useState(0);
  const [inputs, setInputs] = useState<KraepelinInput[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(COLUMN_DURATION);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const pairStartRef = useRef(Date.now());
  const advancingRef = useRef(false);

  // Generate columns once
  useEffect(() => {
    setColumns(
      Array.from({ length: TOTAL_COLUMNS }, (_, i) =>
        generateKraepelinColumn(i, NUMBERS_PER_COLUMN)
      )
    );
  }, []);

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
    setSecondsLeft(COLUMN_DURATION);
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
  }, [phase, currentCol]);

  // When timer hits 0 → next column or finish
  useEffect(() => {
    if (phase !== 'active' || secondsLeft > 0) return;
    advanceColumn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  const advanceColumn = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (currentCol + 1 >= TOTAL_COLUMNS) {
      setPhase('done');
    } else {
      setCurrentCol((c) => c + 1);
      setCurrentPair(0);
      pairStartRef.current = Date.now();
    }
    setTimeout(() => { advancingRef.current = false; }, 100);
  }, [currentCol]);

  // Finish → evaluate, save, redirect
  useEffect(() => {
    if (phase !== 'done') return;
    const result = evaluateKraepelinResults(inputs, TOTAL_COLUMNS, COLUMN_DURATION);
    localStorage.setItem('psikotes_kraepelin_result', JSON.stringify(result));
    router.push('/psikotes/hasil?type=kraepelin');
  }, [phase, inputs, router]);

  const handleDigit = useCallback(
    (digit: number) => {
      if (phase !== 'active' || columns.length === 0) return;
      const col = columns[currentCol];
      if (currentPair + 1 >= col.numbers.length) return; // no more pairs

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
      setTimeout(() => setFeedback(null), 300);

      // Advance pair or column
      if (currentPair + 2 >= col.numbers.length) {
        // No more pairs in this column — auto-advance
        advanceColumn();
      } else {
        setCurrentPair((p) => p + 1);
        pairStartRef.current = Date.now();
      }
    },
    [phase, columns, currentCol, currentPair, advanceColumn]
  );

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="clay-card rounded-3xl p-12 text-center">
          <p className="text-[var(--muted-foreground)] text-sm mb-2">Tes dimulai dalam</p>
          <span className="text-7xl font-black text-[var(--foreground)]">{countdown}</span>
        </div>
      </div>
    );
  }

  // Active screen
  if (phase === 'active' && columns.length > 0) {
    const col = columns[currentCol];
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-4">
        <KraepelinBoard
          numbers={col.numbers}
          currentPairIndex={currentPair}
          columnSecondsLeft={secondsLeft}
          columnDuration={COLUMN_DURATION}
          currentColumnIndex={currentCol}
          totalColumns={TOTAL_COLUMNS}
          recentAnswerFeedback={feedback}
        />
        <KraepelinKeypad onInput={handleDigit} />
      </div>
    );
  }

  // Done / loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--muted-foreground)]">Menghitung hasil…</p>
    </div>
  );
}
