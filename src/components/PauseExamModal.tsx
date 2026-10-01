'use client';

import React from 'react';
import { Pause, Play, Timer } from '@phosphor-icons/react';

interface PauseExamModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onResume: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function PauseExamModal({ isOpen, remainingSeconds, onResume }: PauseExamModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="card-modern max-w-sm w-full p-8 text-center space-y-5 bg-[var(--card)]">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-[var(--secondary)] text-[var(--primary)] border-4 border-[var(--primary)]/20">
          <Pause size={28} weight="bold" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Ujian Dijeda</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Layar soal disembunyikan agar tidak terbaca.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl font-mono font-bold text-sm bg-[var(--muted)]">
          <Timer size={16} />
          <span className="text-[var(--foreground)]">Sisa Waktu: {formatTime(remainingSeconds)}</span>
        </div>
        <button
          onClick={onResume}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold"
        >
          <Play size={16} weight="fill" />
          Lanjutkan Ujian
        </button>
      </div>
    </div>
  );
}
