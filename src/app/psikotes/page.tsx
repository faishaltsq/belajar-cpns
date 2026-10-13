'use client';

import React from 'react';
import Link from 'next/link';
import {
  Brain,
  Lightbulb,
  ArrowLeft,
  Hash,
  TextT,
  UserCheck,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react';

export default function PsikotesHubPage() {
  const modules = [
    {
      title: 'Tes Koran Kraepelin / Pauli',
      description: 'Uji kecepatan, ketelitian, dan daya tahan kerja di bawah tekanan waktu lewat penjumlahan angka bersusun per kolom.',
      icon: <Brain size={28} weight="duotone" className="text-[var(--primary)]" />,
      badge: 'Ketahanan & Kecepatan',
      time: '3 - 10 menit',
      count: 'Hingga 10 Kolom',
      href: '/psikotes/kraepelin',
      highlight: true,
    },
    {
      title: 'Kecermatan Angka Hilang',
      description: 'Latihan kecepatan persepsi visual mencocokkan angka yang hilang dari tabel referensi 5 karakter kolom A - E.',
      icon: <Hash size={28} weight="bold" className="text-emerald-600" />,
      badge: 'Akurasi Persepsi',
      time: '3 - 10 menit',
      count: 'Multi Kolom A-E',
      href: '/psikotes/kecermatan-angka',
    },
    {
      title: 'Kecermatan Huruf Hilang',
      description: 'Latihan konsentrasi visual membedakan kombinasi huruf alfabet yang hilang dengan batas waktu cepat.',
      icon: <TextT size={28} weight="bold" className="text-blue-600" />,
      badge: 'Konsentrasi Huruf',
      time: '3 - 10 menit',
      count: 'Multi Kolom A-E',
      href: '/psikotes/kecermatan-huruf',
    },
    {
      title: 'Penalaran Logika & Spasial (45 Soal)',
      description: 'Uji daya nalar abstrak meliputi deret angka/huruf, logika silogisme penarikan kesimpulan, dan rotasi bangun ruang spasial.',
      icon: <Lightbulb size={28} weight="duotone" className="text-amber-500" />,
      badge: 'Penalaran Kognitif',
      time: '15 - 45 menit',
      count: '45 Soal Terkurasi',
      href: '/psikotes/penalaran',
    },
    {
      title: 'Karakteristik Kepribadian Kerja (PAPI Kostick)',
      description: 'Asesmen gaya kerja berbasis 5 dimensi kepemimpinan, prestasi, ketelitian, relasi sosial, dan kepatuhan regulasi ASN.',
      icon: <UserCheck size={28} weight="duotone" className="text-purple-600" />,
      badge: 'Profil ASN BerAKHLAK',
      time: '5 - 10 menit',
      count: '30 Butir Asesmen',
      href: '/psikotes/kepribadian',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm mb-6 transition"
        >
          <ArrowLeft size={16} weight="fill" /> Kembali ke Beranda
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
            <Sparkle size={14} weight="fill" className="text-[var(--primary)]" />
            <span>Baterai Tes Psikotes Komprehensif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight mb-2">
            Simulasi Psikotes CPNS &amp; Kedinasan
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
            Asesmen psikologi terstruktur untuk mengukur kecepatan berhitung, daya tahan mental, akurasi persepsi, penalaran logika, dan karakteristik profil kerja.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={[
                'card-modern p-5 sm:p-6 transition hover:border-[var(--primary)] hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group',
                mod.highlight ? 'border-amber-300/80 bg-amber-50/20' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] shrink-0 group-hover:bg-amber-50 transition">
                  {mod.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition">
                      {mod.title}
                    </h2>
                    <span className="badge-pill badge-neutral text-[10px]">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-2.5">
                    {mod.description}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)] font-medium">
                    <span>⏱ {mod.time}</span>
                    <span>·</span>
                    <span>📋 {mod.count}</span>
                  </div>
                </div>
              </div>

              <div className="self-end sm:self-center shrink-0">
                <span className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1 group-hover:btn-primary transition">
                  Mulai Tes <CaretRight size={14} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
