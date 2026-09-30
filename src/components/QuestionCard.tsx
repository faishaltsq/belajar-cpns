'use client';

import React, { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Question } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedOptionId: string | null;
  isFlagged: boolean;
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedOptionId,
  isFlagged,
  onSelectOption,
  onToggleFlag,
}: QuestionCardProps) {
  const [imgZoom, setImgZoom] = useState(false);

  return (
    <>
      <div className="card-modern p-6 flex flex-col justify-between min-h-[460px]">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-base text-[var(--foreground)]">Soal {questionNumber}</span>
              <span className="badge-pill badge-neutral text-[11px]">
                {question.category} &bull; {question.subCategory}
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--muted-foreground)] select-none">
              <input
                type="checkbox"
                checked={isFlagged}
                onChange={onToggleFlag}
                className="w-4 h-4 rounded border-[var(--border)] accent-amber-500"
              />
              <span className={isFlagged ? 'text-amber-600 font-medium' : ''}>Ragu</span>
            </label>
          </div>

          <p className="text-[var(--foreground)] text-sm leading-relaxed mb-4 whitespace-pre-line">
            {question.text}
          </p>

          {/* Question image with zoom */}
          {question.image && (
            <div className="mb-5 relative">
              <div
                className="relative rounded-xl overflow-hidden cursor-zoom-in border"
                style={{ borderColor: 'var(--border)', maxWidth: 520 }}
                onClick={() => setImgZoom(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.image}
                  alt={`Ilustrasi soal ${questionNumber}`}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: 320 }}
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

          <div className="space-y-2">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt.id)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all text-sm ${
                    isSelected
                      ? 'border-[var(--foreground)] bg-[var(--muted)]'
                      : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border ${
                      isSelected
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                        : 'bg-white border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="leading-relaxed pt-0.5 text-[var(--foreground)] flex-1">
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
