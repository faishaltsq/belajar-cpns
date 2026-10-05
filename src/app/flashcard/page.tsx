'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowClockwise, CheckCircle, XCircle, Shuffle, Cards } from '@phosphor-icons/react';
import { FLASHCARD_DATA, Flashcard } from '@/data/flashcards';

const STORAGE_KEY = 'lolos_mastered_flashcards';

function getMasteredIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveMastered(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

type FilterCat = 'Semua' | 'TWK' | 'TIU' | 'TKP';
const TABS: { label: string; value: FilterCat }[] = [
  { label: 'Semua', value: 'Semua' },
  { label: 'TWK (Hafalan)', value: 'TWK' },
  { label: 'TIU (Rumus Cepat)', value: 'TIU' },
  { label: 'TKP (Kata Kunci)', value: 'TKP' },
];

const catColor: Record<string, string> = { TWK: '#3b82f6', TIU: '#8b5cf6', TKP: '#f59e0b' };

export default function FlashcardPage() {
  const [filter, setFilter] = useState<FilterCat>('Semua');
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const filtered = useMemo(() => {
    return filter === 'Semua' ? FLASHCARD_DATA : FLASHCARD_DATA.filter((f) => f.category === filter);
  }, [filter]);

  const buildDeck = useCallback(
    (m: Set<string>) => {
      const remaining = filtered.filter((f) => !m.has(f.id));
      return remaining;
    },
    [filtered]
  );

  useEffect(() => {
    const m = getMasteredIds();
    setMastered(m);
    setDeck(buildDeck(m));
    setIdx(0);
    setFlipped(false);
    setLoaded(true);
  }, [filter, buildDeck]);

  function handleMastered() {
    const card = deck[idx];
    if (!card) return;
    const next = new Set(mastered);
    next.add(card.id);
    setMastered(next);
    saveMastered(next);
    const newDeck = deck.filter((_, i) => i !== idx);
    setDeck(newDeck);
    if (idx >= newDeck.length) setIdx(Math.max(0, newDeck.length - 1));
    setFlipped(false);
  }

  function handleNotYet() {
    // Move card to end of deck
    if (deck.length <= 1) { setFlipped(false); return; }
    const newDeck = [...deck];
    const [card] = newDeck.splice(idx, 1);
    newDeck.push(card);
    setDeck(newDeck);
    if (idx >= newDeck.length) setIdx(0);
    setFlipped(false);
  }

  function handleShuffle() {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setIdx(0);
    setFlipped(false);
  }

  function resetProgress() {
    const empty = new Set<string>();
    setMastered(empty);
    saveMastered(empty);
    setDeck(filtered);
    setIdx(0);
    setFlipped(false);
  }

  const totalInCategory = filtered.length;
  const masteredInCategory = filtered.filter((f) => mastered.has(f.id)).length;
  const pct = totalInCategory > 0 ? Math.round((masteredInCategory / totalInCategory) * 100) : 0;

  const card = deck[idx];

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f5' }}>
        <div className="text-gray-500">Memuat kartu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#faf9f5' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
          <Cards size={22} weight="fill" style={{ color: '#c96442' }} />
          <h1 className="text-base font-bold text-gray-800">Flashcard Hafalan</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
                filter === tab.value
                  ? 'text-white border-transparent'
                  : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={filter === tab.value ? { background: '#c96442' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">
              Tuntas: <strong className="text-green-600">{masteredInCategory}</strong> / {totalInCategory} kartu
            </span>
            <span className="font-bold" style={{ color: '#c96442' }}>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#c96442' }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Tersisa: {deck.length} kartu dalam tumpukan</span>
            <button onClick={resetProgress} className="underline hover:text-gray-600">Reset Progress</button>
          </div>
        </div>

        {/* Card area */}
        {deck.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle size={56} weight="fill" color="#22c55e" />
            <h2 className="text-xl font-bold text-gray-800">Semua Kartu Dikuasai!</h2>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Kamu sudah menguasai semua {totalInCategory} flashcard pada kategori ini. Luar biasa!
            </p>
            <button
              onClick={resetProgress}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#c96442' }}
            >
              <ArrowClockwise size={18} weight="bold" /> Ulangi dari Awal
            </button>
          </div>
        ) : card ? (
          <>
            {/* 3D Flip Card */}
            <div
              className="relative cursor-pointer mx-auto"
              style={{ perspective: '1000px', maxWidth: '480px' }}
              onClick={() => setFlipped(!flipped)}
            >
              <div
                className="relative w-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  minHeight: '260px',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between border-2 shadow-md"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: '#fff',
                    borderColor: catColor[card.category] ?? '#d1d5db',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: catColor[card.category] }}
                      >
                        {card.category}
                      </span>
                      <span className="text-[10px] text-gray-400">{card.subTopic}</span>
                    </div>
                    <p className="text-gray-800 font-semibold text-base leading-relaxed">{card.front}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-4">Ketuk kartu untuk membalik →</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between border-2 shadow-md"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: '#fffbf5',
                    borderColor: catColor[card.category] ?? '#d1d5db',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: catColor[card.category] }}
                      >
                        {card.category}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">JAWABAN</span>
                    </div>
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{card.back}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-4">Ketuk kartu untuk membalik ←</p>
                </div>
              </div>
            </div>

            {/* Card counter */}
            <p className="text-center text-xs text-gray-400">
              Kartu {idx + 1} dari {deck.length} tersisa
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleNotYet}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
              >
                <XCircle size={18} weight="fill" />
                Belum Hafal
              </button>
              <button
                onClick={handleMastered}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition"
              >
                <CheckCircle size={18} weight="fill" />
                Sudah Hafal
              </button>
            </div>

            {/* Shuffle */}
            <div className="text-center">
              <button
                onClick={handleShuffle}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
              >
                <Shuffle size={14} weight="bold" />
                Acak Urutan Kartu
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
