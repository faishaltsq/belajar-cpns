'use client';

import React, { useMemo } from 'react';
import { ExamAnswer, Question } from '@/lib/types';
import { getQuestionSections, getSectionColors, getSectionFullName } from '@/lib/questionSections';

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
  // Compute sections dynamically — works for any package size
  const sections = useMemo(
    () => getQuestionSections(questions, answers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, answers]
  );

  // Which section is the current question in?
  const activeSection = sections.find(
    (s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex
  );

  let answered = 0;
  answers.forEach((a) => {
    if (a.selectedOptionId != null && a.selectedOptionId !== '') answered++;
  });

  return (
    <div className="card-modern p-4 flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--foreground)]">
        <span>Nomor Soal</span>
        <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
          {answered}/{questions.length} terjawab
        </span>
      </div>

      {/* Section quick-jump chips */}
      {sections.length > 1 && (
        <div className="flex flex-col gap-1.5">
          {sections.map((s) => {
            const colors = getSectionColors(s.category);
            const isActive = activeSection?.category === s.category;
            const pct = s.totalCount > 0 ? Math.round((s.answeredCount / s.totalCount) * 100) : 0;

            return (
              <button
                key={s.category}
                type="button"
                onClick={() => onSelectIndex(s.startIndex)}
                title={`Lompat ke ${getSectionFullName(s.category)} (No ${s.startNumber}–${s.endNumber})`}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                  isActive
                    ? `${colors.activeBg} ${colors.text} border-2 ${colors.border} shadow-sm`
                    : `${colors.bg} ${colors.text} ${colors.border} border opacity-80 hover:opacity-100`
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wide">{s.category}</span>
                  <span className="opacity-70 font-normal">
                    {s.startNumber}–{s.endNumber}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="opacity-80">{s.answeredCount}/{s.totalCount}</span>
                  <div className="w-12 h-1.5 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'currentColor', opacity: 0.6 }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
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

      {/* Grid with section dividers */}
      <div className="overflow-y-auto max-h-[400px] p-1 space-y-2">
        {sections.length > 0 ? (
          sections.map((s) => {
            const colors = getSectionColors(s.category);
            const qs = questions.slice(s.startIndex, s.endIndex + 1);

            return (
              <div key={s.category}>
                {/* Section divider header */}
                <div className={`flex items-center gap-2 mb-1.5 px-1 py-1 rounded-lg ${colors.bg}`}>
                  <span className={`text-[10px] font-extrabold tracking-wider ${colors.text}`}>
                    {s.category}
                  </span>
                  <span className={`text-[10px] ${colors.text} opacity-60 font-normal`}>
                    {getSectionFullName(s.category)} · {s.startNumber}–{s.endNumber}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {qs.map((q, i) => {
                    const idx = s.startIndex + i;
                    const ans = answers.get(q.id);
                    const isAnswered =
                      ans && ans.selectedOptionId !== null && ans.selectedOptionId !== undefined;
                    const isFlagged = Boolean(ans && ans.isFlagged);
                    const isCurrent = idx === currentIndex;

                    let btnCls =
                      'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]';
                    if (isFlagged) {
                      btnCls = 'border border-amber-300 bg-amber-400 text-white font-semibold';
                    } else if (isAnswered) {
                      btnCls =
                        'border border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold';
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
          })
        ) : (
          /* Fallback flat grid if no sections detected */
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, idx) => {
              const ans = answers.get(q.id);
              const isAnswered =
                ans && ans.selectedOptionId !== null && ans.selectedOptionId !== undefined;
              const isFlagged = Boolean(ans && ans.isFlagged);
              const isCurrent = idx === currentIndex;

              let btnCls =
                'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]';
              if (isFlagged) {
                btnCls = 'border border-amber-300 bg-amber-400 text-white font-semibold';
              } else if (isAnswered) {
                btnCls =
                  'border border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold';
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
        )}
      </div>
    </div>
  );
}
