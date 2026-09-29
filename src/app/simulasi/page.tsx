'use client';

import Link from 'next/link';
import { BookOpen, Timer, Target, ArrowRight } from '@phosphor-icons/react';

export default function SimulasiPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="clay-card p-8">
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Simulasi CAT CPNS</h1>
          <p className="text-slate-500 mb-8">
            Latihan ujian dengan format Computer Assisted Test (CAT) sesuai standar BKN.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="clay-card-flat p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">110</div>
              <div className="text-xs text-slate-400 mt-1">Total Soal</div>
            </div>
            <div className="clay-card-flat p-4 text-center">
              <Timer className="w-6 h-6 mx-auto mb-2 text-amber-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">100</div>
              <div className="text-xs text-slate-400 mt-1">Menit</div>
            </div>
            <div className="clay-card-flat p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-emerald-500" weight="duotone" />
              <div className="text-2xl font-bold text-slate-800">311</div>
              <div className="text-xs text-slate-400 mt-1">Total Passing Grade</div>
            </div>
          </div>

          <div className="clay-card-flat p-4 mb-8">
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

          <Link
            href="/simulasi/tryout-1"
            className="w-full py-3 px-6 bg-purple-500 hover:bg-purple-400 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition clay-button"
          >
            Mulai Simulasi
            <ArrowRight className="w-5 h-5" weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  );
}
