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
    <div className="card-modern p-6 text-left">
      <div className="flex items-center gap-2 mb-4">
        <span className="badge-pill badge-neutral">TWK</span>
        <span className="text-xs text-[var(--muted-foreground)]">Contoh Soal — Wawasan Kebangsaan</span>
      </div>
      <p className="text-[var(--foreground)] font-medium mb-5 text-sm leading-relaxed">
        {SAMPLE_QUESTION.text}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {SAMPLE_QUESTION.options.map((opt, i) => {
          let cls = 'px-4 py-3 rounded-xl text-sm cursor-pointer border transition-all select-none ';
          if (selected === null) {
            cls += 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)] text-[var(--foreground)]';
          } else if (i === SAMPLE_QUESTION.correct) {
            cls += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold';
          } else if (i === selected) {
            cls += 'border-red-300 bg-red-50 text-red-700 font-semibold';
          } else {
            cls += 'border-[var(--border)] text-[var(--muted-foreground)] opacity-50';
          }
          return (
            <button
              key={i}
              disabled={selected !== null}
              className={cls}
              onClick={() => setSelected(i)}
            >
              <span className="font-semibold mr-2 text-[var(--muted-foreground)]">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div
          className={`text-xs px-3 py-2 rounded-lg mb-4 font-medium ${
            selected === SAMPLE_QUESTION.correct
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
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
          className="btn-secondary text-xs px-4 py-2 mx-auto block mt-3"
        >
          Coba lagi &rarr;
        </button>
      )}

      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <Link
          href="/simulasi"
          className="inline-flex items-center gap-1.5 text-[var(--foreground)] font-medium text-sm hover:opacity-70 transition"
        >
          Lihat 660 soal di 6 paket tryout
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
