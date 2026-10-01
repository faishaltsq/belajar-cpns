'use client';

import React from 'react';
import { SignOut, FloppyDisk, CheckCircle } from '@phosphor-icons/react';

interface ExitExamModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmitNow: () => void;
}

export function ExitExamModal({
  isOpen,
  onCancel,
  onSaveDraft,
  onSubmitNow,
}: ExitExamModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-4 bg-[var(--card)]">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-100 text-amber-700">
            <SignOut size={22} weight="bold" />
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">Keluar dari Ujian?</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Pilih cara Anda ingin mengakhiri sesi saat ini:
          </p>
        </div>

        <div className="space-y-2">
          {/* Pilihan 1: Simpan Draf */}
          <button
            onClick={onSaveDraft}
            className="w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition hover:bg-[var(--muted)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center shrink-0">
              <FloppyDisk size={18} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Simpan Draf & Lanjut Nanti</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Jawaban & sisa waktu tersimpan di browser ini.
              </p>
            </div>
          </button>

          {/* Pilihan 2: Selesaikan & Nilai */}
          <button
            onClick={onSubmitNow}
            className="w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition hover:bg-emerald-50 hover:border-emerald-300"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle size={18} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800">Kumpulkan & Nilai Sekarang</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Ujian selesai, hitung skor dan lihat hasil evaluasi.
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="btn-secondary w-full py-2.5 text-xs font-semibold"
        >
          Batal & Lanjutkan Pengerjaan
        </button>
      </div>
    </div>
  );
}
