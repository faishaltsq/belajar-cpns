'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, WarningCircle, CheckCircle, ArrowRight, ArrowClockwise } from '@phosphor-icons/react';
import { collectWrongQuestions, markMastered, WrongQuestionItem } from '@/lib/wrongAnswers';

export default function UlangSalahPage() {
  const [items, setItems] = useState<WrongQuestionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [masteredThisSession, setMasteredThisSession] = useState(0);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const wrong = collectWrongQuestions();
    setItems(wrong.slice(0, 10));
    setLoaded(true);
  }, []);

  const q = items[idx]?.question;
  const prevAnswerId = items[idx]?.userAnswerId;

  function handleSelect(optId: string) {
    if (revealed) return;
    setSelectedId(optId);
    setRevealed(true);
  }

  function handleMastered() {
    if (!q) return;
    markMastered(q.id);
    setMasteredThisSession((n) => n + 1);
    nextQuestion();
  }

  function nextQuestion() {
    if (idx + 1 >= items.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelectedId(null);
      setRevealed(false);
    }
  }

  function restart() {
    const fresh = collectWrongQuestions().slice(0, 10);
    setItems(fresh);
    setIdx(0);
    setSelectedId(null);
    setRevealed(false);
    setMasteredThisSession(0);
    setDone(false);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f5' }}>
        <div className="text-gray-500">Memuat soal salah...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6" style={{ background: '#faf9f5' }}>
        <CheckCircle size={64} weight="fill" color="#22c55e" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Luar Biasa!</h2>
          <p className="text-gray-600 max-w-sm">
            Kamu belum punya soal yang salah, atau semua soal sudah berhasil dikuasai. Coba kerjakan beberapa paket Simulasi CAT terlebih dahulu.
          </p>
        </div>
        <Link href="/simulasi" className="px-6 py-3 rounded-xl font-semibold text-white" style={{ background: '#c96442' }}>
          Mulai Simulasi CAT
        </Link>
        <Link href="/drill" className="text-sm text-gray-500 underline">Kembali ke Latihan Drill</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6" style={{ background: '#faf9f5' }}>
        <CheckCircle size={64} weight="fill" color="#22c55e" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sesi Selesai!</h2>
          <p className="text-gray-600 max-w-sm">
            Kamu berhasil menyelesaikan <strong>{items.length} soal</strong> latihan.{' '}
            <strong className="text-green-600">{masteredThisSession} soal</strong> berhasil dikuasai dan dihapus dari daftar salah.
          </p>
        </div>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
          style={{ background: '#c96442' }}
        >
          <ArrowClockwise size={20} weight="bold" />
          Latihan Lagi
        </button>
        <Link href="/drill" className="text-sm text-gray-500 underline">Kembali ke Latihan</Link>
      </div>
    );
  }

  const maxScore = q ? Math.max(...q.options.map((o) => o.score)) : 0;
  const selectedOpt = q?.options.find((o) => o.id === selectedId);
  const isCorrect = selectedOpt ? selectedOpt.score === maxScore : false;

  const catColor: Record<string, string> = { TWK: '#3b82f6', TIU: '#8b5cf6', TKP: '#f59e0b' };

  return (
    <div className="min-h-screen pb-10" style={{ background: '#faf9f5' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/drill" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} weight="bold" />
            <span className="font-medium text-sm">Kembali</span>
          </Link>
          <div className="text-sm font-semibold text-gray-700">
            Soal {idx + 1} / {items.length}
          </div>
          <div className="text-sm font-semibold text-green-600">
            Tuntas: {masteredThisSession}
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((idx) / items.length) * 100}%`, background: '#c96442' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Category badge */}
        {q && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: catColor[q.category] ?? '#6b7280' }}
            >
              {q.category}
            </span>
            <span className="text-xs text-gray-500">{q.subCategory}</span>
            <span className="ml-auto text-xs text-orange-500 font-medium flex items-center gap-1">
              <WarningCircle size={14} weight="fill" />
              Pernah Salah
            </span>
          </div>
        )}

        {/* Question */}
        {q && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {q.image && (
              <img src={q.image} alt="soal" className="mb-4 max-h-48 object-contain rounded-lg" />
            )}
            <p className="text-gray-800 leading-relaxed font-medium">{q.text}</p>
          </div>
        )}

        {/* Options */}
        {q && (
          <div className="space-y-3">
            {q.options.map((opt) => {
              const isMax = opt.score === maxScore;
              const isPrevWrong = opt.id === prevAnswerId && !isMax;

              let bg = 'bg-white border-gray-200';
              let textColor = 'text-gray-800';

              if (revealed) {
                if (isMax) {
                  bg = 'bg-green-50 border-green-400';
                  textColor = 'text-green-800';
                } else if (opt.id === selectedId && !isMax) {
                  bg = 'bg-red-50 border-red-400';
                  textColor = 'text-red-800';
                } else if (isPrevWrong) {
                  bg = 'bg-orange-50 border-orange-300';
                  textColor = 'text-orange-700';
                }
              } else if (opt.id === selectedId) {
                bg = 'border-[#c96442] bg-orange-50';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={revealed}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${bg} ${textColor} ${!revealed ? 'hover:border-[#c96442] cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="font-bold mr-2">{opt.id}.</span>
                  {opt.text}
                  {revealed && isPrevWrong && !isMax && (
                    <span className="ml-2 text-xs text-orange-500">(jawaban lama kamu)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Explanation + action */}
        {revealed && q && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <BookOpen size={18} weight="fill" className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-1">Pembahasan</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{q.explanation}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {isCorrect ? (
                <button
                  onClick={handleMastered}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 transition"
                >
                  <CheckCircle size={20} weight="bold" />
                  Sudah Kuasai — Hapus dari Daftar Salah
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition"
                  style={{ background: '#c96442' }}
                >
                  Lanjut Soal Berikutnya
                  <ArrowRight size={20} weight="bold" />
                </button>
              )}
            </div>
            {isCorrect && (
              <button
                onClick={nextQuestion}
                className="w-full text-sm text-gray-500 underline text-center"
              >
                Lanjut tanpa hapus dari daftar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
