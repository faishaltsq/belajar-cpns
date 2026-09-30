'use client';

import React from 'react';
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
  return (
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

        <p className="text-[var(--foreground)] text-sm leading-relaxed mb-6 whitespace-pre-line">
          {question.text}
        </p>

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
                <span className="leading-relaxed pt-0.5 text-[var(--foreground)]">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
