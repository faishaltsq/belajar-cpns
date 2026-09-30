'use client';

import React from 'react';
import Link from 'next/link';
import { Brain, Lightbulb, ArrowLeft } from '@phosphor-icons/react';

export default function PsikotesHubPage() {
  const modules = [
    {
      title: 'Tes Koran Kraepelin',
      description:
        'Uji kecepatan dan ketelitian berhitung dengan menjumlahkan pasangan angka secara berurutan.',
      icon: <Brain size={40} weight="duotone" className="text-cyan-500" />,
      badge: 'Kecepatan & Ketelitian',
      time: '~5 menit',
      count: '10 kolom × 25 angka',
      href: '/psikotes/kraepelin',
    },
    {
      title: 'Tes Penalaran Logika',
      description:
        'Uji kemampuan logika dan pola dengan soal deret angka dan penalaran spasial.',
      icon: <Lightbulb size={40} weight="duotone" className="text-amber-500" />,
      badge: 'Logika & Pola',
      time: '~10 menit',
      count: '15 soal',
      href: '/psikotes/penalaran',
    },
  ];

  return (
    <div className="min-h-screen bg-[#e8e4f0] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-8"
        >
          <ArrowLeft size={16} weight="fill" /> Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 mb-1">Simulasi Psikotes</h1>
        <p className="text-slate-500 mb-8">Pilih modul tes untuk mulai latihan.</p>

        <div className="flex flex-col gap-5">
          {modules.map((mod) => (
            <div key={mod.href} className="clay-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="clay-card-flat rounded-2xl p-3 shrink-0">{mod.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-bold text-slate-800">{mod.title}</h2>
                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-3">{mod.description}</p>
                  <div className="flex gap-4 text-xs text-slate-400 font-medium">
                    <span>⏱ {mod.time}</span>
                    <span>📋 {mod.count}</span>
                  </div>
                </div>
              </div>
              <Link href={mod.href} className="clay-button self-end">
                Mulai Tes →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
