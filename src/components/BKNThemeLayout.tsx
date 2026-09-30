'use client';

import React from 'react';
import { Question, ExamAnswer } from '@/lib/types';

interface BKNThemeLayoutProps {
  questions: Question[];
  currentIndex: number;
  answers: Map<number, ExamAnswer>;
  timerElement: React.ReactNode;
  onSelectIndex: (i: number) => void;
  onSelectOption: (optionId: string) => void;
  onToggleFlag: () => void;
  onOpenModal: () => void;
  packageId: string;
}

const BKN_BLUE = '#003580';
const BKN_BLUE_LIGHT = '#0046a3';

export function BKNThemeLayout({
  questions,
  currentIndex,
  answers,
  timerElement,
  onSelectIndex,
  onSelectOption,
  onToggleFlag,
  onOpenModal,
  packageId,
}: BKNThemeLayoutProps) {
  const q = questions[currentIndex];
  const ans = q ? answers.get(q.id) : undefined;

  const getCellStyle = (qi: number) => {
    const a = answers.get(questions[qi]?.id);
    const isCurrent = qi === currentIndex;
    const answered = a?.selectedOptionId != null && a.selectedOptionId !== '';
    const flagged = a?.isFlagged;

    if (isCurrent) return { background: BKN_BLUE, color: '#fff', border: '2px solid #fff', fontWeight: 700 };
    if (flagged) return { background: '#dc2626', color: '#fff', border: '2px solid #dc2626' };
    if (answered) return { background: '#16a34a', color: '#fff', border: '2px solid #16a34a' };
    return { background: '#fff', color: '#333', border: '1px solid #aaa' };
  };

  if (!q) return null;

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div
      className="min-h-screen flex flex-col text-sm"
      style={{ background: '#e8e8e8', fontFamily: 'Arial, sans-serif' }}
    >
      {/* BKN Header */}
      <header style={{ background: BKN_BLUE, color: '#fff', padding: '10px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Garuda placeholder */}
            <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🦅
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>Sistem CAT-BKN</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {packageId.replace('tryout-', 'Paket Tryout ').toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>WAKTU TERSISA</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{timerElement}</div>
            </div>
            <button
              onClick={onOpenModal}
              style={{
                background: '#f59e0b',
                color: '#000',
                border: 'none',
                padding: '8px 20px',
                fontWeight: 700,
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              AKHIRI UJIAN
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: '12px auto', width: '100%', padding: '0 16px', display: 'flex', gap: 16, flex: 1 }}>
        {/* Main Question */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Category badge */}
          <div style={{
            background: '#fff',
            borderRadius: 4,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #ccc',
          }}>
            <span style={{ fontWeight: 700, color: BKN_BLUE }}>
              Soal {currentIndex + 1} dari {questions.length}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 3,
              background: BKN_BLUE,
              color: '#fff',
            }}>
              {q.category}
            </span>
          </div>

          {/* Question text */}
          <div style={{ background: '#fff', borderRadius: 4, padding: 20, border: '1px solid #ccc', lineHeight: 1.7 }}>
            {q.image && (
              <img
                src={q.image}
                alt="Soal"
                style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', marginBottom: 16 }}
              />
            )}
            <p style={{ margin: 0, fontSize: 14, color: '#111' }}>{q.text}</p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, oi) => {
              const isSelected = ans?.selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    border: isSelected ? `2px solid ${BKN_BLUE}` : '1px solid #ccc',
                    borderRadius: 4,
                    background: isSelected ? '#e8f0fe' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 14,
                    color: '#111',
                    width: '100%',
                  }}
                >
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: 3,
                    background: isSelected ? BKN_BLUE : '#e5e7eb',
                    color: isSelected ? '#fff' : '#555',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}>
                    {optionLabels[oi] ?? opt.id}
                  </span>
                  <span style={{ lineHeight: 1.6 }}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Nav + flag */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              style={{
                padding: '10px 20px',
                background: currentIndex === 0 ? '#ccc' : BKN_BLUE_LIGHT,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ◀ Sebelumnya
            </button>
            <button
              onClick={onToggleFlag}
              style={{
                padding: '10px 16px',
                background: ans?.isFlagged ? '#dc2626' : '#fff',
                color: ans?.isFlagged ? '#fff' : '#333',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {ans?.isFlagged ? '🚩 Batalkan Ragu' : '🚩 Ragu-ragu'}
            </button>
            <button
              onClick={() => onSelectIndex(Math.min(questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === questions.length - 1}
              style={{
                padding: '10px 20px',
                background: currentIndex === questions.length - 1 ? '#ccc' : BKN_BLUE_LIGHT,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Selanjutnya ▶
            </button>
          </div>
        </div>

        {/* Sidebar nomor soal */}
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: BKN_BLUE, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 12 }}>
              DAFTAR SOAL
            </div>
            {/* Legend */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>⬜ Belum dijawab</span>
              <span style={{ color: '#16a34a' }}>🟩 Sudah dijawab</span>
              <span style={{ color: '#dc2626' }}>🟥 Ragu-ragu</span>
            </div>
            {/* Grid */}
            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {questions.map((_, qi) => (
                <button
                  key={qi}
                  onClick={() => onSelectIndex(qi)}
                  style={{
                    ...getCellStyle(qi),
                    borderRadius: 3,
                    padding: '6px 2px',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                  }}
                >
                  {qi + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
