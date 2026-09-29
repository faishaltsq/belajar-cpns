'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export function Timer({ initialSeconds, onTimeUp }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    const targetTimestamp = Date.now() + initialSeconds * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((targetTimestamp - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUpRef.current();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const isCritical = secondsLeft < 300;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono font-bold text-sm sm:text-base border ${
        isCritical
          ? 'bg-red-500/10 text-red-500 border-red-500 animate-pulse'
          : 'bg-zinc-900 text-zinc-100 border-zinc-800'
      }`}
    >
      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
      <span>
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
