'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lightning, Brain, Globe, Star, WarningCircle } from '@phosphor-icons/react';
import { collectWrongQuestions } from '@/lib/wrongAnswers';

const DRILL_TOPICS: {
  category: 'TWK' | 'TIU' | 'TKP';
  subCategory: string;
  label: string;
  icon: string;
}[] = [
  // TWK
  { category: 'TWK', subCategory: 'Pancasila', label: 'Pilar Pancasila', icon: '🇮🇩' },
  { category: 'TWK', subCategory: 'UUD 1945', label: 'UUD 1945', icon: '📜' },
  { category: 'TWK', subCategory: 'Bela Negara', label: 'Bela Negara', icon: '🛡️' },
  { category: 'TWK', subCategory: 'Nasionalisme', label: 'Nasionalisme', icon: '🌟' },
  { category: 'TWK', subCategory: 'Integritas', label: 'Integritas ASN', icon: '⚖️' },
  { category: 'TWK', subCategory: 'Bahasa Indonesia', label: 'Bahasa Indonesia', icon: '📖' },
  // TIU
  { category: 'TIU', subCategory: 'Analogi', label: 'Analogi Verbal', icon: '🔗' },
  { category: 'TIU', subCategory: 'Silogisme', label: 'Silogisme', icon: '💭' },
  { category: 'TIU', subCategory: 'Analitis', label: 'Analitis', icon: '🔍' },
  { category: 'TIU', subCategory: 'Deret Angka', label: 'Deret Angka', icon: '🔢' },
  { category: 'TIU', subCategory: 'Soal Cerita', label: 'Soal Cerita Hitung', icon: '🧮' },
  { category: 'TIU', subCategory: 'Figural', label: 'Figural / Visual', icon: '🎨' },
  // TKP
  { category: 'TKP', subCategory: 'Pelayanan Publik', label: 'Pelayanan Publik', icon: '🤝' },
  { category: 'TKP', subCategory: 'Profesionalisme', label: 'Profesionalisme', icon: '💼' },
  { category: 'TKP', subCategory: 'Anti-Radikalisme', label: 'Anti-Radikalisme', icon: '☮️' },
  { category: 'TKP', subCategory: 'Jejaring Kerja', label: 'Jejaring Kerja', icon: '🌐' },
  { category: 'TKP', subCategory: 'TIK', label: 'Teknologi Informasi', icon: '💻' },
  { category: 'TKP', subCategory: 'Sosial Budaya', label: 'Sosial & Budaya', icon: '🎭' },
];

const catMeta: Record<'TWK' | 'TIU' | 'TKP', { label: string; desc: string; color: string; icon: React.ReactNode }> = {
  TWK: { label: 'Tes Wawasan Kebangsaan', desc: 'Nasionalisme, UUD, Pancasila', color: '#3b82f6', icon: <Globe size={16} weight="duotone" /> },
  TIU: { label: 'Tes Intelegensia Umum', desc: 'Logika, Analogi, Numerik', color: '#8b5cf6', icon: <Brain size={16} weight="duotone" /> },
  TKP: { label: 'Tes Karakteristik Pribadi', desc: 'Perilaku kerja & kepribadian', color: '#10b981', icon: <Star size={16} weight="duotone" /> },
};

export default function DrillPage() {
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    const list = collectWrongQuestions();
    setWrongCount(list.length);
  }, []);

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
              <Lightning size={20} weight="duotone" />
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Latihan Kilat</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] ml-12">
            10 soal fokus per topik • Feedback instan setelah setiap jawaban • Tanpa batas waktu gugur
          </p>
        </div>

        {/* Banner Ulang Soal Salah */}
        {wrongCount > 0 && (
          <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                <WarningCircle size={22} weight="fill" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-900">
                  Ada {wrongCount} soal yang pernah kamu jawab salah!
                </p>
                <p className="text-[11px] text-orange-700">
                  Perbaiki kelemahanmu dengan drilling khusus soal salah ini.
                </p>
              </div>
            </div>
            <Link
              href="/drill/ulang-salah"
              className="px-4 py-2 rounded-lg text-xs font-bold text-white shrink-0 shadow-sm"
              style={{ background: '#c96442' }}
            >
              Latih Sekarang →
            </Link>
          </div>
        )}

        {/* Stats banner */}
        <div
          className="px-5 py-4 rounded-xl border text-xs flex items-center gap-3"
          style={{ background: 'rgba(201,100,66,0.04)', borderColor: 'rgba(201,100,66,0.2)' }}
        >
          <Lightning size={18} className="text-[var(--primary)] shrink-0" weight="duotone" />
          <span className="text-[var(--foreground)]">
            Pilih topik yang ingin dilatih. Jawaban langsung dinilai — bukan nunggu submit di akhir.
            Cocok untuk sesi belajar singkat 5-10 menit.
          </span>
        </div>

        {/* Grouped by category */}
        {(['TWK', 'TIU', 'TKP'] as const).map((cat) => {
          const meta = catMeta[cat];
          const topics = DRILL_TOPICS.filter((t) => t.category === cat);
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.icon}
                  {cat}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{meta.label} — {meta.desc}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topics.map((t) => (
                  <Link
                    key={t.subCategory}
                    href={`/drill/${t.category}/${encodeURIComponent(t.subCategory)}`}
                    className="card-modern p-4 flex items-center gap-3 hover:bg-[var(--muted)] transition group"
                  >
                    <span className="text-2xl leading-none">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--foreground)] truncate">{t.label}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">10 soal · instan</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
