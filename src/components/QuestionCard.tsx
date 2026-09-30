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
    TWK: 'bg-blue-100 text-blue-700 border-blue-200',
    TIU: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    TKP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="clay-card p-6 flex flex-col justify-between min-h-[460px]">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-slate-800">Soal No. {questionNumber}</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                categoryBadgeColors[question.category]
              }`}
            >
              {question.category} &bull; {question.subCategory}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 select-none">
            <input
              type="checkbox"
              checked={isFlagged}
              onChange={onToggleFlag}
              className="w-4 h-4 rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-400"
            />
            <span className={isFlagged ? 'text-amber-600 font-medium' : ''}>Ragu-ragu</span>
          </label>
        </div>

        <p className="text-slate-700 text-base leading-relaxed mb-6 font-normal whitespace-pre-line">
          {question.text}
        </p>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectOption(opt.id)}
                className={`w-full text-left p-4 rounded-2xl border flex items-start gap-4 transition-all ${
                  isSelected
                    ? 'bg-blue-100/80 border-blue-400 text-slate-800'
                    : 'bg-white/50 border-white/70 text-slate-600 hover:border-cyan-300 hover:bg-white/70'
                }`}
                style={isSelected ? {
                  boxShadow: 'inset 2px 2px 5px rgba(59,130,246,0.1), inset -2px -2px 5px rgba(255,255,255,0.8)'
                } : {
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.04), -2px -2px 5px rgba(255,255,255,0.85)'
                }}
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold border ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-400'
                      : 'bg-white/80 text-slate-500 border-slate-200'
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
