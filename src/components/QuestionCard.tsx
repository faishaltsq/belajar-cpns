'use client';

import React, { useState } from 'react';
import { MagnifyingGlass, EyeSlash, Eye } from '@phosphor-icons/react';
import { Question } from '@/lib/types';
import { getSectionColors } from '@/lib/questionSections';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedOptionId: string | null;
  isFlagged: boolean;
  eliminatedOptionIds?: string[];
  fontSize?: 'sm' | 'base' | 'lg';
  /** Optional section context: position within section (e.g. "5 dari 35") */
  sectionPosition?: { numberInSection: number; sectionTotal: number };
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
  onToggleEliminate?: (optionId: string) => void;
  onChangeFontSize?: (size: 'sm' | 'base' | 'lg') => void;
  onOpenNavModal?: () => void;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedOptionId,
  isFlagged,
  eliminatedOptionIds = [],
  fontSize = 'base',
  sectionPosition,
  onSelectOption,
  onToggleFlag,
  onToggleEliminate,
  onChangeFontSize,
  onOpenNavModal,
}: QuestionCardProps) {
  const [imgZoom, setImgZoom] = useState(false);
  const colors = getSectionColors(question.category);

  const textSizeClass =
    fontSize === 'sm'
      ? 'text-xs sm:text-sm leading-relaxed'
      : fontSize === 'lg'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-sm sm:text-base leading-relaxed';

  return (
    <>
      <div className="card-modern p-4 sm:p-6 flex flex-col justify-between min-h-[320px] sm:min-h-[460px]">
        <div>
          {/* Header Kartu Soal */}
          <div
            className="flex items-center justify-between mb-3 sm:mb-4 pb-2.5 sm:pb-3 gap-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {/* Question number & category chip (clickable to open nav on mobile) */}
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenNavModal ? (
                <button
                  type="button"
                  onClick={onOpenNavModal}
                  className="flex items-center gap-1.5 p-1 -m-1 rounded-xl hover:bg-[var(--muted)]/60 transition group text-left"
                  title="Ketuk untuk buka daftar nomor soal"
                >
                  <span className="font-bold text-sm sm:text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition">
                    Soal {questionNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {question.category}
                    {sectionPosition && (
                      <span className="font-normal opacity-80 ml-1">
                        ({sectionPosition.numberInSection}/{sectionPosition.sectionTotal})
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--primary)] font-bold lg:hidden">
                    ▾
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-[var(--foreground)]">
                    Soal {questionNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {question.category}
                    {sectionPosition && (
                      <span className="font-normal opacity-80 ml-1">
                        ({sectionPosition.numberInSection}/{sectionPosition.sectionTotal})
                      </span>
                    )}
                  </span>
                </div>
              )}

              <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] hidden sm:inline">
                &bull; {question.subCategory}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Font Size Selector (Enabled on mobile as well!) */}
              {onChangeFontSize && (
                <div
                  className="flex items-center gap-0.5 border rounded-lg p-0.5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => onChangeFontSize('sm')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                      fontSize === 'sm'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                    title="Font kecil"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeFontSize('base')}
                    className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded transition ${
                      fontSize === 'base'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                    title="Font normal"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeFontSize('lg')}
                    className={`px-1.5 py-0.5 text-[11px] sm:text-xs font-bold rounded transition ${
                      fontSize === 'lg'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                    title="Font besar"
                  >
                    A+
                  </button>
                </div>
              )}

              {/* Ragu Checkbox with spacious hitbox */}
              <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer text-xs sm:text-sm text-[var(--muted-foreground)] select-none py-1 px-1.5 -my-1 rounded-lg hover:bg-[var(--muted)]/50 transition">
                <input
                  type="checkbox"
                  checked={isFlagged}
                  onChange={onToggleFlag}
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded border-[var(--border)] accent-amber-500 cursor-pointer"
                />
                <span className={isFlagged ? 'text-amber-600 font-bold' : 'font-medium'}>
                  Ragu
                </span>
              </label>
            </div>
          </div>

          {/* Teks Soal */}
          <p
            className={`text-[var(--foreground)] mb-4 sm:mb-5 whitespace-pre-line font-normal ${textSizeClass}`}
          >
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
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-contain block mx-auto"
                  style={{ maxHeight: 420 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div
                  className="absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 0 0 1px var(--border)',
                  }}
                >
                  <MagnifyingGlass size={14} className="text-[var(--muted-foreground)]" />
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
                Klik gambar untuk perbesar
              </p>
            </div>
          )}

          {/* Opsi Jawaban (Spacious padding for mobile thumbs) */}
          <div className="space-y-2.5">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isEliminated = eliminatedOptionIds.includes(opt.id);

              return (
                <div
                  key={opt.id}
                  className={`w-full rounded-2xl border flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 transition-all ${
                    isEliminated
                      ? 'opacity-40 bg-[var(--muted)]/50 border-dashed border-[var(--border)]'
                      : isSelected
                      ? 'border-[var(--primary)] bg-amber-50/60 shadow-xs'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/60 hover:bg-[var(--muted)]/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEliminated) onSelectOption(opt.id);
                    }}
                    disabled={isEliminated}
                    className="flex-1 text-left py-2.5 px-3 sm:py-3.5 sm:px-4 flex items-start gap-2.5 sm:gap-3 text-sm disabled:cursor-not-allowed"
                  >
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border transition mt-0.5 ${
                        isSelected
                          ? 'bg-[var(--primary)] text-white border-transparent'
                          : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span
                      className={`pt-0.5 text-[var(--foreground)] flex-1 ${textSizeClass} ${
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
                            loading="lazy"
                            decoding="async"
                            className="rounded-lg max-h-32 object-contain border"
                            style={{ borderColor: 'var(--border)' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Tombol Eliminasi Opsi (Coret) - minimum 40x40px touch hitbox */}
                  {onToggleEliminate && (
                    <button
                      type="button"
                      onClick={() => onToggleEliminate(opt.id)}
                      className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl transition ${
                        isEliminated
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={
                        isEliminated
                          ? 'Batalkan coret opsi ini'
                          : 'Coret opsi ini (eliminasi)'
                      }
                    >
                      {isEliminated ? (
                        <Eye size={16} weight="bold" />
                      ) : (
                        <EyeSlash size={16} weight="bold" />
                      )}
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
          <p className="absolute bottom-4 text-white/60 text-xs">
            Klik di mana saja untuk menutup
          </p>
        </div>
      )}
    </>
  );
}
