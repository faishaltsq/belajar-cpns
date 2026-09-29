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
  const categoryBadgeColors: Record<'TWK' | 'TIU' | 'TKP', string> = {
    TWK: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    TIU: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    TKP: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between min-h-[460px]">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-zinc-100">Soal No. {questionNumber}</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                categoryBadgeColors[question.category]
              }`}
            >
              {question.category} &bull; {question.subCategory}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={isFlagged}
              onChange={onToggleFlag}
              className="w-4 h-4 rounded text-amber-500 bg-zinc-800 border-zinc-700 focus:ring-amber-400"
            />
            <span className={isFlagged ? 'text-amber-400 font-medium' : ''}>Ragu-ragu</span>
          </label>
        </div>

        <p className="text-zinc-200 text-base leading-relaxed mb-6 font-normal whitespace-pre-line">
          {question.text}
        </p>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectOption(opt.id)}
                className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                }`}
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {opt.id}
                </span>
                <span className="text-sm leading-relaxed pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
