'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="font-bold text-lg text-white">Konfirmasi Selesai Ujian</h3>
        </div>

        <p className="text-sm text-zinc-300 mb-6">
          Apakah Anda yakin ingin mengakhiri sesi ujian ini? Pastikan seluruh soal telah Anda jawab dengan baik.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center">
          <div>
            <div className="text-xl font-bold text-emerald-400">{answeredCount}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Sudah Dijawab</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-400">{flaggedCount}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Ragu-ragu</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{unansweredCount}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Belum Dijawab</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition"
          >
            Lanjutkan Mengerjakan
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kumpulkan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
