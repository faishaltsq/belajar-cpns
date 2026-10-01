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
  let answered = 0;
  answers.forEach((a) => {
    if (a.selectedOptionId != null && a.selectedOptionId !== '') answered++;
  });

  return (
    <div className="card-modern p-4 flex flex-col h-full">
      <h3 className="font-semibold text-[var(--foreground)] mb-3 text-xs flex items-center justify-between">
        <span>Nomor Soal (1 - {questions.length})</span>
        <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
          {answered}/{questions.length}
        </span>
      </h3>

      <div className="flex items-center gap-3 text-[11px] mb-4 text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[var(--primary)] inline-block" />
          <span>Sudah</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
          <span>Ragu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border inline-block" style={{ borderColor: 'var(--border)' }} />
          <span>Belum</span>
        </div>
      </div>

      {/* p-1 agar border selected tidak terpotong overflow di pojok */}
      <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-[460px] p-1">
        {questions.map((q, idx) => {
          const ans = answers.get(q.id);
          const isAnswered = ans && ans.selectedOptionId !== null && ans.selectedOptionId !== undefined;
          const isFlagged = Boolean(ans && ans.isFlagged);
          const isCurrent = idx === currentIndex;

          let btnCls = 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]';
          if (isFlagged) {
            btnCls = 'border border-amber-300 bg-amber-400 text-white font-semibold';
          } else if (isAnswered) {
            btnCls = 'border border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-8 w-full rounded-lg text-[11px] flex items-center justify-center transition-all ${btnCls} ${
                isCurrent ? 'ring-2 ring-[var(--foreground)] ring-offset-1 font-bold' : ''
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
