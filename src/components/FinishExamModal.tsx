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
  /** Submission is in flight — the dialog must not be dismissible. */
  isSubmitting?: boolean;
  /** Last failed submission attempt, shown inside the dialog. */
  errorMessage?: string | null;
}

export function FinishExamModal({
  isOpen,
  totalQuestions,
  answeredCount,
  flaggedCount,
  onCancel,
  onConfirm,
  isSubmitting = false,
  errorMessage = null,
}: FinishExamModalProps) {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={isSubmitting ? undefined : onCancel}
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

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-red-300/60 bg-red-50 p-3"
          >
            <Warning size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-red-700">{errorMessage}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Lanjut Mengerjakan
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Mengirim…</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} weight="duotone" />
                <span>{errorMessage ? 'Coba Kirim Ulang' : 'Kumpulkan'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
