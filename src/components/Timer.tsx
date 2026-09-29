'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Timer as TimerIcon } from '@phosphor-icons/react';

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
      className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono font-bold text-sm sm:text-base border ${
        isCritical
          ? 'bg-red-100 text-red-600 border-red-300 animate-pulse'
          : 'bg-white/70 text-slate-700 border-white/60'
      }`}
      style={isCritical ? {} : {
        boxShadow: '2px 2px 6px rgba(0,0,0,0.06), -2px -2px 5px rgba(255,255,255,0.9)'
      }}
    >
      <TimerIcon size={18} weight="duotone" />
      <span>
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
