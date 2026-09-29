'use client';

import Link from 'next/link';
import { BookOpen, Clock, Target, ArrowRight } from 'lucide-react';

export default function SimulasiPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">Simulasi CAT CPNS</h1>
          <p className="text-zinc-400 mb-8">
            Latihan ujian dengan format Computer Assisted Test (CAT) sesuai standar BKN.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold">110</div>
              <div className="text-xs text-zinc-500 mt-1">Total Soal</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <div className="text-2xl font-bold">100</div>
              <div className="text-xs text-zinc-500 mt-1">Menit</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
              <div className="text-2xl font-bold">311</div>
              <div className="text-xs text-zinc-500 mt-1">Total Passing Grade</div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-8">
            <h3 className="font-semibold text-sm mb-3">Passing Grade per Kategori</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-400">TWK (30 soal)</span>
                <span className="text-zinc-300">65 / 150</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">TIU (35 soal)</span>
                <span className="text-zinc-300">80 / 175</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">TKP (45 soal)</span>
                <span className="text-zinc-300">166 / 225</span>
              </div>
            </div>
          </div>

          <Link
            href="/simulasi/tryout-1"
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
          >
            Mulai Simulasi
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
