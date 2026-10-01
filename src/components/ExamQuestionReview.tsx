'use client';

import React, { useState, useMemo } from 'react';
import { Question, ExamAnswer } from '@/lib/types';
import {
  CheckCircle,
  XCircle,
  Flag,
  Lightbulb,
  HourglassMedium,
  Check,
  X,
  MagnifyingGlass,
  ClockCountdown,
  Rocket,
} from '@phosphor-icons/react';
import { classifyTime, TIME_LABELS } from '@/lib/timeTracker';
import { parseExplanation } from '@/lib/explanationParser';

interface ExamQuestionReviewProps {
  questions: Question[];
  userAnswers: ExamAnswer[];
  timeSpentPerQuestion?: Record<number, number>; // questionId -> seconds
}

type FilterType = 'all' | 'wrong' | 'flagged' | 'empty';

export function ExamQuestionReview({
  questions,
  userAnswers,
  timeSpentPerQuestion = {},
}: ExamQuestionReviewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const answerMap = useMemo(() => {
    const map = new Map<number, ExamAnswer>();
    userAnswers.forEach((a) => map.set(a.questionId, a));
    return map;
  }, [userAnswers]);

  // Evaluasi status tiap soal
  const evaluatedQuestions = useMemo(() => {
    return questions.map((q) => {
      const userAns = answerMap.get(q.id);
      const chosenId = userAns?.selectedOptionId ?? null;
      const isFlagged = Boolean(userAns?.isFlagged);
      const isEmpty = !chosenId;

      const chosenOpt = q.options.find((o) => o.id === chosenId);
      const userScore = chosenOpt?.score ?? 0;
      const maxScore = Math.max(...q.options.map((o) => o.score ?? 0));

      const isCorrect = q.category === 'TKP' ? userScore >= 4 : userScore === maxScore && maxScore > 0;
      const isWrong = !isEmpty && !isCorrect;

      return {
        question: q,
        userAns,
        chosenId,
        chosenOpt,
        userScore,
        maxScore,
        isCorrect,
        isWrong,
        isFlagged,
        isEmpty,
      };
    });
  }, [questions, answerMap]);

  // Filtered list
  const filtered = useMemo(() => {
    switch (filter) {
      case 'wrong':
        return evaluatedQuestions.filter((item) => item.isWrong);
      case 'flagged':
        return evaluatedQuestions.filter((item) => item.isFlagged);
      case 'empty':
        return evaluatedQuestions.filter((item) => item.isEmpty);
      case 'all':
      default:
        return evaluatedQuestions;
    }
  }, [evaluatedQuestions, filter]);

  // Counts
  const counts = useMemo(() => {
    let wrong = 0;
    let flagged = 0;
    let empty = 0;
    evaluatedQuestions.forEach((item) => {
      if (item.isWrong) wrong++;
      if (item.isFlagged) flagged++;
      if (item.isEmpty) empty++;
    });
    return { all: evaluatedQuestions.length, wrong, flagged, empty };
  }, [evaluatedQuestions]);

  // Reset index saat ganti filter
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  };

  const currentItem = filtered[currentIndex];

  if (!questions.length) {
    return (
      <div className="card-modern p-8 text-center text-[var(--muted-foreground)] text-xs">
        Data pembahasan soal tidak tersedia untuk sesi ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'btn-secondary text-[var(--foreground)]'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => handleFilterChange('wrong')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              filter === 'wrong'
                ? 'bg-red-600 text-white'
                : 'btn-secondary text-red-600'
            }`}
          >
            <XCircle size={13} weight="fill" />
            Hanya Salah ({counts.wrong})
          </button>
          <button
            onClick={() => handleFilterChange('flagged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              filter === 'flagged'
                ? 'bg-amber-600 text-white'
                : 'btn-secondary text-amber-700'
            }`}
          >
            <Flag size={13} weight="fill" />
            Ragu-ragu ({counts.flagged})
          </button>
          <button
            onClick={() => handleFilterChange('empty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              filter === 'empty'
                ? 'bg-zinc-700 text-white'
                : 'btn-secondary text-[var(--muted-foreground)]'
            }`}
          >
            <HourglassMedium size={13} weight="fill" />
            Belum Dijawab ({counts.empty})
          </button>
        </div>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          Menampilkan {filtered.length} dari {questions.length} soal
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card-modern p-10 text-center text-xs text-[var(--muted-foreground)]">
          Tidak ada soal dalam kategori filter ini. Mantap!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Number Nav Grid */}
          <div className="lg:col-span-4 card-modern p-4">
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-3">
              Daftar Soal
            </p>
            <div className="grid grid-cols-5 gap-1.5 max-h-96 overflow-y-auto pr-1">
              {filtered.map((item, idx) => {
                const isActive = idx === currentIndex;
                let bgStyle = 'bg-[var(--secondary)] text-[var(--foreground)]';

                if (item.isEmpty) {
                  bgStyle = 'bg-zinc-100 text-zinc-400 border-dashed border border-zinc-300';
                } else if (item.isCorrect) {
                  bgStyle = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
                } else if (item.isWrong) {
                  bgStyle = 'bg-red-100 text-red-800 border border-red-300';
                }

                if (isActive) {
                  bgStyle = 'bg-[var(--primary)] text-[var(--primary-foreground)] ring-2 ring-[var(--primary)] font-bold';
                }

                return (
                  <button
                    key={item.question.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-8 rounded-md text-xs font-mono font-medium flex items-center justify-center transition relative ${bgStyle}`}
                  >
                    {item.question.id}
                    {item.isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-4 pt-3 border-t text-[10px] text-[var(--muted-foreground)] space-y-1" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400" /> Benar (atau nilai 4-5 TKP)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-200 border border-red-400" /> Salah
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-zinc-200 border border-zinc-400" /> Kosong
              </div>
            </div>
          </div>

          {/* Right Column: Question & Explanation Card */}
          <div className="lg:col-span-8 space-y-4">
            {currentItem && (
              <div className="card-modern p-6 space-y-5">
                {/* Header Soal */}
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="badge-pill badge-neutral text-xs">
                      Soal #{currentItem.question.id}
                    </span>
                    <span className="text-xs font-semibold text-[var(--primary)]">
                      {currentItem.question.category} &bull; {currentItem.question.subCategory}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {/* Time Spent Badge */}
                    {timeSpentPerQuestion[currentItem.question.id] !== undefined && (() => {
                      const secs = timeSpentPerQuestion[currentItem.question.id];
                      const cat = classifyTime(secs);
                      const info = TIME_LABELS[cat];
                      return (
                        <span className={`inline-flex items-center gap-1 font-mono font-bold ${info.color}`}>
                          <ClockCountdown size={13} weight="bold" />
                          {secs}s — {info.label}
                        </span>
                      );
                    })()}
                    {currentItem.isEmpty ? (
                      <span className="inline-flex items-center gap-1 text-zinc-500 font-medium">
                        <HourglassMedium size={14} /> Tidak Dijawab (0 Poin)
                      </span>
                    ) : currentItem.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle size={15} weight="fill" /> +{currentItem.userScore} Poin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                        <XCircle size={15} weight="fill" /> {currentItem.userScore} Poin
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Image (if any) */}
                {currentItem.question.image && (
                  <div className="relative group max-w-md mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentItem.question.image}
                      alt={`Soal #${currentItem.question.id}`}
                      className="rounded-xl border max-h-64 mx-auto object-contain cursor-zoom-in"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                      onClick={() => setZoomImage(currentItem.question.image || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomImage(currentItem.question.image || null)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                      title="Perbesar gambar"
                    >
                      <MagnifyingGlass size={14} />
                    </button>
                  </div>
                )}

                {/* Question Text */}
                <p className="text-sm font-sans leading-relaxed text-[var(--foreground)] whitespace-pre-line">
                  {currentItem.question.text}
                </p>

                {/* Options List */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">Pilihan Jawaban:</p>
                  {currentItem.question.options.map((opt) => {
                    const isUserChoice = opt.id === currentItem.chosenId;
                    const isBestOption = opt.score === currentItem.maxScore;

                    let rowStyle = 'border-[var(--border)] bg-transparent';
                    let badgeStyle = 'bg-[var(--secondary)] text-[var(--muted-foreground)]';

                    if (isBestOption) {
                      rowStyle = 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium';
                      badgeStyle = 'bg-emerald-600 text-white font-bold';
                    } else if (isUserChoice && !isBestOption) {
                      rowStyle = 'border-red-300 bg-red-50/70 text-red-950';
                      badgeStyle = 'bg-red-500 text-white font-bold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs transition ${rowStyle}`}
                      >
                        <span
                          className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${badgeStyle}`}
                        >
                          {opt.id}
                        </span>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p>{opt.text}</p>
                          {opt.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={opt.image}
                              alt={`Opsi ${opt.id}`}
                              className="mt-2 max-h-24 rounded border object-contain"
                              style={{ borderColor: 'var(--border)' }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {isUserChoice && (
                            <span className="badge-pill text-[10px] bg-zinc-900 text-white">
                              Pilihanmu
                            </span>
                          )}
                          <span
                            className={`font-mono font-semibold text-[11px] ${
                              opt.score === currentItem.maxScore
                                ? 'text-emerald-700'
                                : 'text-[var(--muted-foreground)]'
                            }`}
                          >
                            Skor: {opt.score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Structured Explanation Box */}
                {currentItem.question.explanation && (() => {
                  const parsed = parseExplanation(currentItem.question.explanation);
                  return (
                    <div className="space-y-2 mt-4">
                      {/* Core explanation */}
                      <div
                        className="p-4 rounded-xl border space-y-2"
                        style={{
                          backgroundColor: 'rgba(201, 100, 66, 0.04)',
                          borderColor: 'rgba(201, 100, 66, 0.25)',
                        }}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
                          <Lightbulb size={16} weight="fill" />
                          Pembahasan:
                        </div>
                        <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-line font-sans">
                          {parsed.core || currentItem.question.explanation}
                        </p>
                      </div>
                      {/* Trik Cepat box */}
                      {parsed.trickTip && (
                        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                            <Rocket size={14} weight="fill" />
                            Trik Cepat / Kata Kunci:
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">
                            {parsed.trickTip}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bottom Nav: Prev / Next */}
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    &larr; Soal Sebelumnya
                  </button>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {currentIndex + 1} / {filtered.length}
                  </span>
                  <button
                    disabled={currentIndex === filtered.length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(filtered.length - 1, prev + 1))}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    Soal Berikutnya &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImage}
            alt="Perbesar gambar soal"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
