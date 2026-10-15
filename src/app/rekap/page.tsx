'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Spinner, XCircle, BookOpen } from '@phosphor-icons/react';

type Item = {
  packageId: string;
  number: number;
  category: 'TWK' | 'TIU' | 'TKP';
  yourAnswer: string;
  correctAnswer: string;
  explanation: string | null;
};

type Grouped = Record<'TWK' | 'TIU' | 'TKP', Item[]>;

const CATEGORY_LABEL: Record<string, string> = {
  TWK: 'Tes Wawasan Kebangsaan',
  TIU: 'Tes Intelegensia Umum',
  TKP: 'Tes Karakteristik Pribadi',
};

export default function RekapPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [grouped, setGrouped] = useState<Grouped | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/pro/recap')
      .then(async (r) => {
        if (r.status === 403) { setDenied(true); return; }
        if (!r.ok) throw new Error('Gagal memuat rekap.');
        const d = await r.json();
        setGrouped(d.grouped);
        setTotal(d.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Koneksi bermasalah.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="card-modern max-w-md mx-auto p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            <Crown size={26} weight="duotone" />
          </div>
          <h1 className="text-lg font-bold">Fitur PRO</h1>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            Rekap soal salah tersedia untuk akun PRO. Kamu bisa melihat semua soal yang
            pernah kamu jawab salah, dikelompokkan per subkategori.
          </p>
          <Link href="/simulasi" className="btn-primary inline-block px-5 py-2.5 text-sm font-semibold">
            Lihat Paket PRO
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-3xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} weight="fill" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/simulasi" className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={14} /> Kembali ke Simulasi
        </Link>

        <div className="card-modern p-6 space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Rekap Soal Yang Pernah Kamu Salah</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            {total === 0
              ? 'Belum ada jawaban salah yang tercatat. Pertahankan!'
              : `${total} soal perlu kamu pelajari ulang.`}
          </p>
        </div>

        {total > 0 && grouped && (
          <div className="space-y-5">
            {(['TWK', 'TIU', 'TKP'] as const).map((cat) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={cat} className="card-modern p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm">{CATEGORY_LABEL[cat]}</h2>
                    <span className="badge-pill text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                      {items.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {items.map((i) => (
                      <li key={`${i.packageId}-${i.number}`} className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                          <BookOpen size={13} weight="duotone" />
                          {i.packageId} · Soal {i.number}
                        </div>
                        <div className="text-xs flex flex-wrap gap-x-5 gap-y-1 mb-1.5">
                          <span className="text-red-600">Jawabanmu: {i.yourAnswer}</span>
                          <span className="text-emerald-600">Kunci: {i.correctAnswer}</span>
                        </div>
                        {i.explanation && (
                          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{i.explanation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
