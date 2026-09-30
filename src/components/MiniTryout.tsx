'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';

const SAMPLE_QUESTION = {
  text: 'Nilai Pancasila yang mencerminkan semangat persatuan bangsa Indonesia terdapat pada sila ke...',
  options: ['Pertama', 'Kedua', 'Ketiga', 'Keempat'],
  correct: 2, // 0-indexed → "Ketiga"
};

export default function MiniTryout() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="clay-card p-6 text-left">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">TWK</span>
        <span className="text-xs text-slate-500">Contoh Soal — Wawasan Kebangsaan</span>
      </div>
      <p className="text-slate-800 font-medium mb-5 text-sm leading-relaxed">
        {SAMPLE_QUESTION.text}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {SAMPLE_QUESTION.options.map((opt, i) => {
          let cls =
            'clay-card-flat px-4 py-3 rounded-2xl text-sm cursor-pointer border-2 transition-all select-none ';
          if (selected === null) {
            cls += 'border-white/60 hover:border-cyan-300 hover:bg-cyan-50/60 text-slate-700';
          } else if (i === SAMPLE_QUESTION.correct) {
            cls += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold';
          } else if (i === selected) {
            cls += 'border-red-400 bg-red-50 text-red-700 font-semibold';
          } else {
            cls += 'border-white/40 text-slate-400';
          }
          return (
            <button
              key={i}
              disabled={selected !== null}
              className={cls}
              onClick={() => setSelected(i)}
            >
              <span className="font-bold mr-2 text-slate-400">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div
          className={`text-xs px-3 py-2 rounded-xl mb-4 font-medium ${
            selected === SAMPLE_QUESTION.correct
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {selected === SAMPLE_QUESTION.correct
            ? '✅ Benar! Persatuan Indonesia adalah sila ke-3.'
            : `❌ Kurang tepat. Jawaban yang benar: ${SAMPLE_QUESTION.options[SAMPLE_QUESTION.correct]} (sila ke-3).`}
        </div>
      )}

      {selected !== null && (
        <button
          onClick={() => setSelected(null)}
          className="clay-button mt-4 text-sm font-medium px-4 py-2 bg-white/70 text-slate-600 mx-auto block"
        >
          Coba lagi &rarr;
        </button>
      )}

      <Link
        href="/simulasi/tryout-1"
        className="inline-flex items-center gap-1.5 text-cyan-600 font-semibold text-sm hover:text-cyan-500 transition"
      >
        Ada 109 soal lainnya di simulasi lengkap
        <ArrowRight size={14} weight="bold" />
      </Link>
    </div>
  );
}
