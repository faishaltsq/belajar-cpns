'use client';

import React from 'react';
import { Warning, CheckCircle } from '@phosphor-icons/react';

interface FinishExamModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  flaggedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FinishExamModal({
  isOpen,
  totalQuestions,
  answeredCount,
  flaggedCount,
  onCancel,
  onConfirm,
}: FinishExamModalProps) {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="card-modern max-w-md w-full p-6"
        style={{ boxShadow: '0 24px 48px -12px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 text-amber-500 mb-4">
          <Warning size={22} weight="duotone" />
          <h3 className="font-bold text-base text-[var(--foreground)]">Konfirmasi Selesai Ujian</h3>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-5">
          Apakah Anda yakin ingin mengakhiri sesi ujian ini? Pastikan seluruh soal telah dijawab.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6 card-subtle p-4 text-center">
          <div>
            <div className="text-xl font-bold text-[var(--foreground)]">{answeredCount}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Dijawab</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-500">{flaggedCount}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Ragu-ragu</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-500">{unansweredCount}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Belum</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            Lanjut Mengerjakan
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            <CheckCircle size={16} weight="duotone" />
            <span>Kumpulkan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
