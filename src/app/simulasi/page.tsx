'use client';

import Link from 'next/link';
import { BookOpen, Timer, Target, ArrowRight, Star } from '@phosphor-icons/react';
import { TRYOUT_LIST } from '@/lib/loadPackage';

export default function SimulasiPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="clay-card p-6 sm:p-8 mb-8">
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Simulasi CAT CPNS</h1>
          <p className="text-slate-500 mb-6">
            Latihan ujian dengan format Computer Assisted Test (CAT) sesuai standar BKN.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="clay-card-flat p-4 text-center">
              <BookOpen size={24} className="mx-auto mb-2 text-blue-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">110</div>
              <div className="text-xs text-slate-400 mt-1">Total Soal / Paket</div>
            </div>
            <div className="clay-card-flat p-4 text-center">
              <Timer size={24} className="mx-auto mb-2 text-amber-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">100</div>
              <div className="text-xs text-slate-400 mt-1">Menit</div>
            </div>
            <div className="clay-card-flat p-4 text-center">
              <Target size={24} className="mx-auto mb-2 text-emerald-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">311</div>
              <div className="text-xs text-slate-400 mt-1">Total Passing Grade</div>
            </div>
          </div>

          <div className="clay-card-flat p-4">
            <h3 className="font-semibold text-sm mb-3 text-slate-700">Passing Grade per Kategori</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-500">TWK (30 soal)</span>
                <span className="text-slate-600">65 / 150</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-500">TIU (35 soal)</span>
                <span className="text-slate-600">80 / 175</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-500">TKP (45 soal)</span>
                <span className="text-slate-600">166 / 225</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paket Tryout List */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">Pilih Paket Tryout</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRYOUT_LIST.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/simulasi/${pkg.id}`}
              className="clay-card p-5 hover:translate-y-[-2px] transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                  {pkg.label}
                </h3>
                {pkg.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    pkg.badge === 'Populer'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {pkg.badge === 'Populer' && <Star size={10} weight="fill" className="inline mr-0.5 -mt-0.5" />}
                    {pkg.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-3">{pkg.desc}</p>
              <div className="flex items-center text-xs text-purple-500 font-medium group-hover:gap-2 transition-all">
                Mulai Tryout
                <ArrowRight size={14} weight="bold" className="ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
