'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReasoningQuestion } from '@/lib/types';
import questionsData from '@/data/sample_psikotes.json';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';

const TOTAL_TIME = 15 * 60; // 15 minutes in seconds

const questions = questionsData as ReasoningQuestion[];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function PenalaranPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);

  // Countdown
  useEffect(() => {
    if (submitted) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    const correct = questions.filter((q) => {
      const chosen = answers[q.id];
      return q.options.some((o) => o.id === chosen && o.score === 1);
    }).length;
    const score = Math.round((correct / questions.length) * 100);
    const payload = { score, correct, wrong: questions.length - correct, total: questions.length };
    localStorage.setItem('psikotes_penalaran_result', JSON.stringify(payload));
    router.push('/psikotes/hasil?type=penalaran');
  }

  const q = questions[current];
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerWarning = secondsLeft < 60;

  return (
    <div className="min-h-screen bg-[#e8e4f0] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-sm font-medium">
            Soal {current + 1} / {questions.length}
          </span>
          <span
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              timerWarning
                ? 'bg-red-100 text-red-600'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            ⏱ {pad(minutes)}:{pad(secs)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-[#e0dcea] overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-400 transition-all duration-300"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="clay-card rounded-3xl p-6 flex flex-col gap-5">
          <p className="text-slate-800 font-semibold text-lg leading-snug">{q.questionText}</p>

          <div className="flex flex-col gap-3">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                  className={[
                    'clay-card-flat rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all border-2',
                    selected
                      ? 'border-purple-400 bg-purple-50 text-slate-800'
                      : 'border-transparent text-slate-600 hover:border-purple-200',
                  ].join(' ')}
                >
                  <span className="font-bold text-purple-500 mr-2">{opt.id}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
              className="clay-button flex items-center gap-1 disabled:opacity-40"
            >
              <ArrowLeft size={16} weight="fill" /> Prev
            </button>

            {current < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => c + 1)}
                className="clay-button flex items-center gap-1"
              >
                Next <ArrowRight size={16} weight="fill" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="clay-button bg-purple-500 text-white"
              >
                Submit →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
