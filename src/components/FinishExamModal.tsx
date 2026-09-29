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
        className="clay-card max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-amber-500 mb-4">
          <Warning className="w-6 h-6" weight="duotone" />
          <h3 className="font-bold text-lg text-slate-800">Konfirmasi Selesai Ujian</h3>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Apakah Anda yakin ingin mengakhiri sesi ujian ini? Pastikan seluruh soal telah Anda jawab dengan baik.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6 clay-card-flat p-4 text-center">
          <div>
            <div className="text-xl font-bold text-emerald-600">{answeredCount}</div>
            <div className="text-xs text-slate-400 mt-0.5">Sudah Dijawab</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-500">{flaggedCount}</div>
            <div className="text-xs text-slate-400 mt-0.5">Ragu-ragu</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-500">{unansweredCount}</div>
            <div className="text-xs text-slate-400 mt-0.5">Belum Dijawab</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 bg-white/60 hover:bg-white/80 text-slate-700 text-sm font-medium transition"
            style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.05), -2px -2px 6px rgba(255,255,255,0.9)' }}
          >
            Lanjutkan Mengerjakan
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.1), -2px -2px 6px rgba(255,255,255,0.8)' }}
          >
            <CheckCircle className="w-4 h-4" weight="duotone" />
            <span>Kumpulkan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
