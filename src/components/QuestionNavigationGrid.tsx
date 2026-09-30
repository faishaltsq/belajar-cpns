'use client';

import React from 'react';
import { ExamAnswer, Question } from '@/lib/types';

interface GridProps {
  questions: Question[];
  answers: Map<number, ExamAnswer>;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function QuestionNavigationGrid({
  questions,
  answers,
  currentIndex,
  onSelectIndex,
}: GridProps) {
  return (
    <div className="clay-card p-4 flex flex-col h-full">
      <h3 className="font-semibold text-slate-800 mb-3 text-sm flex items-center justify-between">
        <span>Nomor Soal (1 - {questions.length})</span>
      </h3>

      <div className="flex items-center gap-3 text-xs mb-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
          <span>Sudah</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block" />
          <span>Ragu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-white/60 border border-slate-200 inline-block" />
          <span>Belum</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[460px] pr-1">
        {questions.map((q, idx) => {
          const ans = answers.get(q.id);
          const isAnswered = ans && ans.selectedOptionId !== null && ans.selectedOptionId !== undefined;
          const isFlagged = Boolean(ans && ans.isFlagged);
          const isCurrent = idx === currentIndex;

          let btnColor = 'bg-white/60 text-slate-500 hover:bg-white/80 border-white/70';
          if (isFlagged) {
            btnColor = 'bg-amber-400 text-white font-semibold border-amber-300';
          } else if (isAnswered) {
            btnColor = 'bg-emerald-500 text-white font-semibold border-emerald-400';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-9 w-full rounded-xl text-xs flex items-center justify-center border transition-all ${btnColor} ${
                isCurrent ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#f0ecf4] scale-105' : ''
              }`}
              style={{ boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -2px -2px 4px rgba(255,255,255,0.9)' }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
