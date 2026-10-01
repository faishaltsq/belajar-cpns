'use client';

import React, { useState } from 'react';
import { MagnifyingGlass, EyeSlash, Eye } from '@phosphor-icons/react';
import { Question } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedOptionId: string | null;
  isFlagged: boolean;
  eliminatedOptionIds?: string[];
  fontSize?: 'sm' | 'base' | 'lg';
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
  onToggleEliminate?: (optionId: string) => void;
  onChangeFontSize?: (size: 'sm' | 'base' | 'lg') => void;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedOptionId,
  isFlagged,
  eliminatedOptionIds = [],
  fontSize = 'base',
  onSelectOption,
  onToggleFlag,
  onToggleEliminate,
  onChangeFontSize,
}: QuestionCardProps) {
  const [imgZoom, setImgZoom] = useState(false);

  const textSizeClass =
    fontSize === 'sm' ? 'text-xs sm:text-sm' : fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

  return (
    <>
      <div className="card-modern p-6 flex flex-col justify-between min-h-[460px]">
        <div>
          {/* Header Kartu Soal */}
          <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-base text-[var(--foreground)]">Soal {questionNumber}</span>
              <span className="badge-pill badge-neutral text-[11px]">
                {question.category} &bull; {question.subCategory}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Font Size Selector */}
              {onChangeFontSize && (
                <div className="hidden sm:flex items-center gap-1 border rounded-lg p-0.5" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => onChangeFontSize('sm')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${fontSize === 'sm' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]'}`}
                    title="Font kecil"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => onChangeFontSize('base')}
                    className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${fontSize === 'base' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]'}`}
                    title="Font normal"
                  >
                    A
                  </button>
                  <button
                    onClick={() => onChangeFontSize('lg')}
                    className={`px-1.5 py-0.5 text-xs font-bold rounded ${fontSize === 'lg' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]'}`}
                    title="Font besar"
                  >
                    A+
                  </button>
                </div>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--muted-foreground)] select-none">
                <input
                  type="checkbox"
                  checked={isFlagged}
                  onChange={onToggleFlag}
                  className="w-4 h-4 rounded border-[var(--border)] accent-amber-500"
                />
                <span className={isFlagged ? 'text-amber-600 font-bold' : ''}>Ragu [R]</span>
              </label>
            </div>
          </div>

          {/* Teks Soal */}
          <p className={`text-[var(--foreground)] leading-relaxed mb-4 whitespace-pre-line ${textSizeClass}`}>
            {question.text}
          </p>

          {/* Question image with zoom */}
          {question.image && (
            <div className="mb-5 relative">
              <div
                className="relative rounded-xl overflow-hidden cursor-zoom-in border bg-white"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => setImgZoom(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.image}
                  alt={`Ilustrasi soal ${questionNumber}`}
                  className="w-full h-auto object-contain block mx-auto"
                  style={{ maxHeight: 420 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div
                  className="absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 0 1px var(--border)' }}
                >
                  <MagnifyingGlass size={14} className="text-[var(--muted-foreground)]" />
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">Klik gambar untuk perbesar</p>
            </div>
          )}

          {/* Opsi Jawaban */}
          <div className="space-y-2">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isEliminated = eliminatedOptionIds.includes(opt.id);

              return (
                <div
                  key={opt.id}
                  className={`w-full rounded-xl border flex items-center gap-2 p-1 transition-all ${
                    isEliminated
                      ? 'opacity-40 bg-[var(--muted)]/50 border-dashed border-[var(--border)]'
                      : isSelected
                      ? 'border-[var(--foreground)] bg-[var(--muted)]'
                      : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (!isEliminated) onSelectOption(opt.id);
                    }}
                    disabled={isEliminated}
                    className="flex-1 text-left p-2.5 flex items-start gap-3 text-sm disabled:cursor-not-allowed"
                  >
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border ${
                        isSelected
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                          : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span
                      className={`leading-relaxed pt-0.5 text-[var(--foreground)] flex-1 ${textSizeClass} ${
                        isEliminated ? 'line-through text-[var(--muted-foreground)]' : ''
                      }`}
                    >
                      {opt.text}
                      {opt.image && (
                        <span className="block mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={opt.image}
                            alt={`Opsi ${opt.id}`}
                            className="rounded-lg max-h-32 object-contain border"
                            style={{ borderColor: 'var(--border)' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Tombol Eliminasi Opsi (Coret) */}
                  {onToggleEliminate && (
                    <button
                      type="button"
                      onClick={() => onToggleEliminate(opt.id)}
                      className={`p-2 rounded-lg text-xs transition ${
                        isEliminated
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={isEliminated ? 'Batalkan coret opsi ini' : 'Coret opsi ini (eliminasi)'}
                    >
                      {isEliminated ? <Eye size={14} weight="bold" /> : <EyeSlash size={14} weight="bold" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      {imgZoom && question.image && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImgZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image}
            alt={`Soal ${questionNumber} — diperbesar`}
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            style={{ maxHeight: '90vh' }}
          />
          <p className="absolute bottom-4 text-white/60 text-xs">Klik di mana saja untuk menutup</p>
        </div>
      )}
    </>
  );
}
