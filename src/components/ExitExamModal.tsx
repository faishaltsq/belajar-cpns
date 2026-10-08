'use client';

import React from 'react';
import { SignOut, FloppyDisk, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';

interface ExitExamModalProps {
  isOpen: boolean;
  examType?: 'official' | 'practice';
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmitNow: () => void;
  onAbandon?: () => void;
}

export function ExitExamModal({
  isOpen,
  examType = 'practice',
  onCancel,
  onSaveDraft,
  onSubmitNow,
  onAbandon,
}: ExitExamModalProps) {
  if (!isOpen) return null;

  const isOfficial = examType === 'official';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-4 bg-[var(--card)]">
        <div className="text-center space-y-1">
          <div
            className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
              isOfficial ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isOfficial ? <Warning size={22} weight="bold" /> : <SignOut size={22} weight="bold" />}
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">
            {isOfficial ? 'Keluar dari Tryout Resmi?' : 'Keluar dari Ujian?'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isOfficial
              ? 'Pilih tindakan Anda. Progres tidak dapat disimpan sebagai draf.'
              : 'Pilih cara Anda ingin mengakhiri sesi saat ini:'}
          </p>
        </div>

        {/* Peringatan Khusus Tryout Resmi */}
        {isOfficial && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed flex items-start gap-2">
            <Warning size={16} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
            <span>
              Mode Tryout Resmi mensimulasikan tes CAT BKN asli. Ujian{' '}
              <strong>tidak dapat dijeda atau disimpan</strong> sebagai draf. Jika keluar tanpa
              mengumpulkan, jawaban Anda <strong>tidak tersimpan dan skor hangus</strong>.
            </span>
          </div>
        )}

        <div className="space-y-2">
          {/* Pilihan 1: Simpan Draf (HANYA Practice Mode) */}
          {!isOfficial && (
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
          )}

          {/* Pilihan 2: Kumpulkan & Nilai Sekarang */}
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

          {/* Pilihan 3: Batalkan Ujian (HANYA Official Mode) */}
          {isOfficial && onAbandon && (
            <button
              onClick={onAbandon}
              className="w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition hover:bg-red-50 hover:border-red-300"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <XCircle size={18} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-800">Keluar & Batalkan Ujian</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Skor hangus, jawaban tidak tersimpan. Tidak dapat diulang.
                </p>
              </div>
            </button>
          )}
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
