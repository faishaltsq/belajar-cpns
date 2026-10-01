'use client';

import React from 'react';
import { EXAM_MODES, ExamType } from '@/lib/examMode';
import { Trophy, BookOpen } from '@phosphor-icons/react';

interface ExamModeModalProps {
  isOpen: boolean;
  packageLabel: string;
  onSelect: (mode: ExamType) => void;
}

export function ExamModeModal({ isOpen, packageLabel, onSelect }: ExamModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-lg w-full p-6 space-y-5 bg-[var(--card)]">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Pilih Mode Ujian</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            {packageLabel}
          </p>
        </div>

        <div className="grid gap-3">
          {/* Mode Tryout Resmi */}
          <button
            onClick={() => onSelect('official')}
            className="w-full text-left p-4 rounded-xl border-2 transition hover:border-[var(--primary)] hover:shadow-md group"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Trophy size={22} weight="fill" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--foreground)]">{EXAM_MODES.official.label}</p>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {EXAM_MODES.official.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Timer Ketat', 'Tanpa Jeda', 'Deteksi Tab', 'Leaderboard'].map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          {/* Mode Latihan */}
          <button
            onClick={() => onSelect('practice')}
            className="w-full text-left p-4 rounded-xl border-2 transition hover:border-[var(--primary)] hover:shadow-md group"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <BookOpen size={22} weight="fill" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--foreground)]">{EXAM_MODES.practice.label}</p>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {EXAM_MODES.practice.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Bisa Jeda', 'Simpan Draf', 'Tanpa Tekanan'].map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
