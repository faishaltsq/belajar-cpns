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
  let flagged = 0;
  answers.forEach((a) => {
    if (a.selectedOptionId != null && a.selectedOptionId !== '') answered++;
    if (a.isFlagged) flagged++;
  });
  const total = questions.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="card-modern p-3 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="mb-2">
        <h3 className="font-semibold text-[var(--foreground)] text-xs mb-1">
          Navigasi Soal
        </h3>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: 'var(--primary)' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
          <span>{answered}/{total} dijawab</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-2.5 text-[10px] mb-2.5 text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)] inline-block" />
          <span>Sudah</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
          <span>Ragu</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-sm border inline-block"
            style={{ borderColor: 'var(--border)' }}
          />
          <span>Belum</span>
        </div>
      </div>

      {/* Grid nomor — 6 kolom, scroll jika perlu */}
      <div className="grid grid-cols-6 gap-1 overflow-y-auto pr-0.5 flex-1 min-h-0">
        {questions.map((q, idx) => {
          const ans = answers.get(q.id);
          const isAnswered = ans?.selectedOptionId != null && ans.selectedOptionId !== '';
          const isFlagged = Boolean(ans?.isFlagged);
          const isCurrent = idx === currentIndex;

          let bg = 'transparent';
          let textColor = 'var(--muted-foreground)';
          let borderColor = 'var(--border)';

          if (isFlagged) {
            bg = '#fbbf24'; // amber-400
            textColor = '#fff';
            borderColor = 'transparent';
          } else if (isAnswered) {
            bg = 'var(--primary)';
            textColor = 'var(--primary-foreground)';
            borderColor = 'transparent';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              title={`Soal ${idx + 1}`}
              className="h-7 w-full rounded-md text-[10px] font-medium flex items-center justify-center border transition-all"
              style={{
                background: bg,
                color: textColor,
                borderColor,
                outline: isCurrent ? '2px solid var(--ring)' : undefined,
                outlineOffset: isCurrent ? '1px' : undefined,
                fontWeight: isCurrent ? 700 : undefined,
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
