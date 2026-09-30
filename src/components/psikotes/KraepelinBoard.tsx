'use client';

import React, { useEffect, useRef } from 'react';

interface KraepelinBoardProps {
  numbers: number[];
  currentPairIndex: number;
  columnSecondsLeft: number;
  columnDuration: number;
  currentColumnIndex: number;
  totalColumns: number;
  recentAnswerFeedback: 'correct' | 'wrong' | null;
}

export function KraepelinBoard({
  numbers,
  currentPairIndex,
  columnSecondsLeft,
  columnDuration,
  currentColumnIndex,
  totalColumns,
  recentAnswerFeedback,
}: KraepelinBoardProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const timerPct = Math.max(0, Math.min(100, (columnSecondsLeft / columnDuration) * 100));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentPairIndex]);

  const feedbackRing =
    recentAnswerFeedback === 'correct'
      ? 'ring-2 ring-green-400 animate-pulse'
      : recentAnswerFeedback === 'wrong'
      ? 'ring-2 ring-red-400 animate-pulse'
      : '';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Column progress header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>Kolom {currentColumnIndex + 1} / {totalColumns}</span>
        <span>{columnSecondsLeft}s</span>
      </div>

      {/* Column timer bar */}
      <div className="w-full h-2 rounded-full bg-[#e0dcea] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${timerPct}%`,
            background: timerPct > 30 ? '#a78bfa' : '#f87171',
          }}
        />
      </div>

      {/* Number strip */}
      <div
        className="clay-card-flat overflow-y-auto max-h-[55vh] rounded-2xl p-3"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex flex-col items-center gap-1">
          {numbers.map((num, i) => {
            const isTop = i === currentPairIndex;
            const isBottom = i === currentPairIndex + 1;
            const isActive = isTop || isBottom;

            return (
              <div
                key={i}
                ref={isTop ? activeRef : undefined}
                className={[
                  'w-14 h-14 flex items-center justify-center rounded-2xl text-2xl font-bold select-none transition-all duration-200',
                  isActive
                    ? `bg-[#ddd5f5] text-slate-800 shadow-[0_0_0_3px_#c4b5fd] ${feedbackRing}`
                    : 'text-slate-500',
                  isTop ? 'rounded-b-none' : '',
                  isBottom ? 'rounded-t-none -mt-1 border-t border-cyan-200' : '',
                ].join(' ')}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
