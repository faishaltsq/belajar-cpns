'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Timer, Target, ArrowRight, Star } from '@phosphor-icons/react';
import { TRYOUT_LIST } from '@/lib/loadPackage';

type PkgItem = { id: string; label: string; desc: string; badge: string | null };

export default function SimulasiPage() {
  const [packages, setPackages] = useState<PkgItem[]>(TRYOUT_LIST);

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.json())
      .then(d => { if (d.packages?.length) setPackages(d.packages); })
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Info Card */}
        <div className="card-modern p-6 sm:p-8 mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-1">Simulasi CAT CPNS</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Format Computer Assisted Test (CAT) sesuai standar BKN — 110 soal, 100 menit.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card-subtle p-4 text-center">
              <BookOpen size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">110</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Soal / Paket</div>
            </div>
            <div className="card-subtle p-4 text-center">
              <Timer size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">100</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Menit</div>
            </div>
            <div className="card-subtle p-4 text-center">
              <Target size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">311</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Passing Grade</div>
            </div>
          </div>

          <div className="card-subtle p-4">
            <h3 className="font-semibold text-xs mb-2.5 text-[var(--foreground)]">Passing Grade per Kategori</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TWK (30 soal)</span>
                <span className="font-medium text-[var(--foreground)]">65 / 150</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TIU (35 soal)</span>
                <span className="font-medium text-[var(--foreground)]">80 / 175</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TKP (45 soal)</span>
                <span className="font-medium text-[var(--foreground)]">166 / 225</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paket Tryout List */}
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 tracking-tight">Pilih Paket Tryout</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/simulasi/${pkg.id}`}
              className="card-modern p-5 group block"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[var(--foreground)] group-hover:opacity-70 transition-opacity">
                  {pkg.label}
                </h3>
                {pkg.badge && (
                  <span className={`badge-pill text-[10px] ${
                    pkg.badge === 'Populer'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'badge-neutral'
                  }`}>
                    {pkg.badge === 'Populer' && <Star size={10} weight="fill" className="inline mr-0.5 -mt-0.5" />}
                    {pkg.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">{pkg.desc}</p>
              <div className="flex items-center text-xs font-medium text-[var(--foreground)] group-hover:gap-2 transition-all">
                Mulai Tryout
                <ArrowRight size={13} weight="bold" className="ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
