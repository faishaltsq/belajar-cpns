'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Question, ExamAnswer } from '@/lib/types';
import { getQuestionSections, getSectionColors, getSectionFullName } from '@/lib/questionSections';
import { X, SquaresFour, Flag, CheckCircle, Circle } from '@phosphor-icons/react';

interface QuestionNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  answers: Map<number, ExamAnswer>;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function QuestionNavigationModal({
  isOpen,
  onClose,
  questions,
  answers,
  currentIndex,
  onSelectIndex,
}: QuestionNavigationModalProps) {
  const sections = useMemo(() => getQuestionSections(questions, answers), [questions, answers]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto scroll to active question when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        activeBtnRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let totalAnswered = 0;
  let totalFlagged = 0;

  answers.forEach((a) => {
    if (a.selectedOptionId != null && a.selectedOptionId !== '') totalAnswered++;
    if (a.isFlagged) totalFlagged++;
  });

  const totalUnanswered = questions.length - totalAnswered;

  const filteredSections = filterCategory === 'all'
    ? sections
    : sections.filter((s) => s.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-xl max-h-[88vh] sm:max-h-[82vh] bg-[var(--card)] rounded-t-3xl sm:rounded-3xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden z-10 animate-slide-up">
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--card)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[var(--primary)] flex items-center justify-center border border-amber-200">
              <SquaresFour size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)]">
                Daftar Nomor Soal
              </h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Ketuk nomor untuk langsung lompat ke soal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition"
            aria-label="Tutup"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Quick Stats Pills */}
        <div className="px-5 py-2.5 bg-[var(--muted)]/40 border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle size={14} weight="fill" className="text-emerald-600" />
              <span>{totalAnswered} Terjawab</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-700">
              <Flag size={14} weight="fill" className="text-amber-500" />
              <span>{totalFlagged} Ragu</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
              <Circle size={14} className="text-[var(--muted-foreground)]" />
              <span>{totalUnanswered} Belum</span>
            </span>
          </div>

          <span className="text-[11px] font-bold text-[var(--foreground)] bg-[var(--card)] px-2 py-0.5 rounded-md border border-[var(--border)]">
            Total {questions.length} Soal
          </span>
        </div>

        {/* Section Filter Tabs */}
        {sections.length > 1 && (
          <div className="px-4 py-2 border-b border-[var(--border)] flex gap-1.5 overflow-x-auto shrink-0 bg-[var(--card)] no-scrollbar">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${
                filterCategory === 'all'
                  ? 'bg-[var(--primary)] text-white border-transparent shadow-xs'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]/60'
              }`}
            >
              Semua ({questions.length})
            </button>
            {sections.map((s) => {
              const active = filterCategory === s.category;
              return (
                <button
                  key={s.category}
                  onClick={() => setFilterCategory(s.category)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border flex items-center gap-1.5 ${
                    active
                      ? 'bg-[var(--primary)] text-white border-transparent shadow-xs'
                      : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/60'
                  }`}
                >
                  <span>{s.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}>
                    {s.answeredCount}/{s.totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Question Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {filteredSections.map((s) => {
            const colors = getSectionColors(s.category);
            const qs = questions.slice(s.startIndex, s.endIndex + 1);

            return (
              <div key={s.category} className="space-y-2.5">
                {/* Sub-heading per section */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {s.category}
                    </span>
                    <span className="text-xs font-semibold text-[var(--foreground)]">
                      {getSectionFullName(s.category)}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    No {s.startNumber}–{s.endNumber} ({s.answeredCount}/{s.totalCount})
                  </span>
                </div>

                {/* 5-column grid for mobile, comfortable touch target */}
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {qs.map((q, i) => {
                    const idx = s.startIndex + i;
                    const ans = answers.get(q.id);
                    const isAnswered = ans && ans.selectedOptionId != null && ans.selectedOptionId !== '';
                    const isFlagged = Boolean(ans && ans.isFlagged);
                    const isCurrent = idx === currentIndex;

                    let btnStyle = 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]';
                    if (isFlagged) {
                      btnStyle = 'border-amber-400 bg-amber-400 text-slate-900 font-black shadow-xs';
                    } else if (isAnswered) {
                      btnStyle = 'border-transparent bg-[var(--primary)] text-white font-bold shadow-xs';
                    }

                    return (
                      <button
                        key={q.id}
                        ref={isCurrent ? activeBtnRef : undefined}
                        onClick={() => {
                          onSelectIndex(idx);
                          onClose();
                        }}
                        className={`h-11 sm:h-12 w-full rounded-2xl border text-xs sm:text-sm flex flex-col items-center justify-center relative transition-all active:scale-95 ${btnStyle} ${
                          isCurrent
                            ? 'ring-3 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--card)] font-black scale-102'
                            : ''
                        }`}
                      >
                        <span className="leading-none">{idx + 1}</span>
                        {isAnswered && !isFlagged && (
                          <span className="text-[9px] opacity-85 leading-none mt-0.5 font-bold uppercase">
                            {ans.selectedOptionId}
                          </span>
                        )}
                        {isFlagged && (
                          <span className="text-[9px] leading-none mt-0.5">
                            🚩 {ans?.selectedOptionId || ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[var(--border)] bg-[var(--muted)]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] inline-block" />
              Sudah
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Ragu
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] inline-block" />
              Belum
            </span>
          </div>

          <button
            onClick={onClose}
            className="btn-primary text-xs py-2 px-4 shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
