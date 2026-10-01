'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Timer as TimerIcon } from '@phosphor-icons/react';

interface TimerProps {
  initialSeconds: number;
  isPaused?: boolean;
  onTimeUp: () => void;
}

export interface TimerHandle {
  getRemainingSeconds: () => number;
}

export const Timer = forwardRef<TimerHandle, TimerProps>(
  ({ initialSeconds, isPaused = false, onTimeUp }, ref) => {
    const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
    const onTimeUpRef = useRef(onTimeUp);
    const pausedRef = useRef(isPaused);
    const secondsLeftRef = useRef(initialSeconds);

    useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
    useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

    useImperativeHandle(ref, () => ({
      getRemainingSeconds: () => secondsLeftRef.current,
    }));

    useEffect(() => {
      const targetTimestamp = Date.now() + initialSeconds * 1000;
      let pausedAt: number | null = null;
      let pauseDebt = 0;

      const interval = setInterval(() => {
        if (pausedRef.current) {
          if (pausedAt === null) pausedAt = Date.now();
          return;
        }
        if (pausedAt !== null) {
          pauseDebt += Date.now() - pausedAt;
          pausedAt = null;
        }
        const remaining = Math.max(
          0,
          Math.round((targetTimestamp + pauseDebt - Date.now()) / 1000)
        );
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          onTimeUpRef.current();
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [initialSeconds]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const isWarning = secondsLeft <= 600 && secondsLeft > 300;
    const isCritical = secondsLeft <= 300;

    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono font-bold text-sm sm:text-base border transition-colors ${
          isCritical
            ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
            : isWarning
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : ''
        }`}
        style={
          !isCritical && !isWarning
            ? {
                backgroundColor: 'var(--secondary)',
                color: 'var(--foreground)',
                borderColor: 'var(--border)',
              }
            : {}
        }
        title={isCritical ? 'Waktu hampir habis!' : isWarning ? 'Sisa waktu 10 menit' : ''}
      >
        <TimerIcon size={18} weight="duotone" />
        <span>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        {isCritical && (
          <span className="text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded-full ml-0.5 hidden sm:inline">
            KRITIS
          </span>
        )}
        {isWarning && !isCritical && (
          <span className="text-[9px] font-bold hidden sm:inline">10 menit</span>
        )}
      </div>
    );
  }
);

Timer.displayName = 'Timer';
