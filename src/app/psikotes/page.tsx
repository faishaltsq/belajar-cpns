'use client';

import React from 'react';
import Link from 'next/link';
import { Brain, Lightbulb, ArrowLeft } from '@phosphor-icons/react';

export default function PsikotesHubPage() {
  const modules = [
    {
      title: 'Tes Koran Kraepelin',
      description: 'Uji kecepatan dan ketelitian berhitung dengan menjumlahkan pasangan angka secara berurutan.',
      icon: <Brain size={36} weight="duotone" className="text-[var(--foreground)]" />,
      badge: 'Kecepatan & Ketelitian',
      time: '~5 menit',
      count: '10 kolom × 25 angka',
      href: '/psikotes/kraepelin',
    },
    {
      title: 'Tes Penalaran Logika',
      description: 'Uji kemampuan logika dan pola dengan soal deret angka dan penalaran spasial.',
      icon: <Lightbulb size={36} weight="duotone" className="text-amber-500" />,
      badge: 'Logika & Pola',
      time: '~10 menit',
      count: '15 soal',
      href: '/psikotes/penalaran',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm mb-8 transition"
        >
          <ArrowLeft size={16} weight="fill" /> Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-1 tracking-tight">Simulasi Psikotes</h1>
        <p className="text-[var(--muted-foreground)] mb-8 text-sm">Pilih modul tes untuk mulai latihan.</p>

        <div className="flex flex-col gap-5">
          {modules.map((mod) => (
            <div key={mod.href} className="card-modern p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="card-subtle rounded-xl p-3 shrink-0">{mod.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{mod.title}</h2>
                    <span className="badge-pill badge-neutral text-[11px]">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-[var(--muted-foreground)] text-xs mb-3 leading-relaxed">{mod.description}</p>
                  <div className="flex gap-4 text-xs text-[var(--muted-foreground)] font-medium">
                    <span>⏱ {mod.time}</span>
                    <span>📋 {mod.count}</span>
                  </div>
                </div>
              </div>
              <Link href={mod.href} className="btn-primary self-end text-xs py-2 px-4">
                Mulai Tes →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
