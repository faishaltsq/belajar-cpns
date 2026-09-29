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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-full">
      <h3 className="font-semibold text-zinc-100 mb-3 text-sm flex items-center justify-between">
        <span>Nomor Soal (1 - {questions.length})</span>
      </h3>

      <div className="flex items-center gap-3 text-xs mb-4 text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
          <span>Sudah</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
          <span>Ragu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700 inline-block" />
          <span>Belum</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[460px] pr-1">
        {questions.map((q, idx) => {
          const ans = answers.get(q.id);
          const isAnswered = ans && ans.selectedOptionId !== null && ans.selectedOptionId !== undefined;
          const isFlagged = Boolean(ans && ans.isFlagged);
          const isCurrent = idx === currentIndex;

          let btnColor = 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700';
          if (isFlagged) {
            btnColor = 'bg-amber-500 text-black font-semibold border-amber-400';
          } else if (isAnswered) {
            btnColor = 'bg-emerald-600 text-white font-semibold border-emerald-500';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-9 w-full rounded-lg text-xs flex items-center justify-center border transition-all ${btnColor} ${
                isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900 scale-105' : ''
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
