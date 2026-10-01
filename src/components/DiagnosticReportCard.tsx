'use client';

import React from 'react';
import Link from 'next/link';
import { SubcategoryDiagnosticReport, SubcategoryStat } from '@/lib/types';
import { Lightbulb, ArrowUp, ArrowDown, Minus, Lightning } from '@phosphor-icons/react';

interface DiagnosticReportCardProps {
  report: SubcategoryDiagnosticReport;
}

function StatusBadge({ status }: { status: SubcategoryStat['status'] }) {
  const style =
    status === 'KUAT'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
      : status === 'SEDANG'
      ? 'bg-amber-50 text-amber-700 border-amber-300'
      : 'bg-red-50 text-red-700 border-red-300';

  const Icon = status === 'KUAT' ? ArrowUp : status === 'SEDANG' ? Minus : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style}`}>
      <Icon size={10} weight="bold" />
      {status}
    </span>
  );
}

export function DiagnosticReportCard({ report }: DiagnosticReportCardProps) {
  const grouped: Record<string, SubcategoryStat[]> = {};
  report.allSubcategories.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const catLabels: Record<string, string> = {
    TWK: 'Tes Wawasan Kebangsaan',
    TIU: 'Tes Intelegensia Umum',
    TKP: 'Tes Karakteristik Pribadi',
  };

  const catOrder = ['TWK', 'TIU', 'TKP'];

  return (
    <div className="space-y-5">
      {/* Rekomendasi AI Box */}
      <div
        className="p-5 rounded-xl border flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(201, 100, 66, 0.04)',
          borderColor: 'rgba(201, 100, 66, 0.25)',
        }}
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
          <Lightbulb size={18} weight="fill" />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--primary)] mb-1">Rekomendasi Belajar</p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {report.recommendationNote}
          </p>
        </div>
      </div>

      {/* Category Groups */}
      {catOrder.map((cat) => {
        const subs = grouped[cat];
        if (!subs?.length) return null;

        return (
          <div key={cat} className="card-modern p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="badge-pill badge-neutral text-xs font-bold">{cat}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{catLabels[cat] || cat}</span>
            </div>
            <div className="space-y-3">
              {subs
                .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
                .map((stat) => (
                  <div key={stat.name} className="flex items-center gap-3 text-xs">
                    <StatusBadge status={stat.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-[var(--foreground)] truncate">{stat.name}</span>
                        <span className="shrink-0 font-mono text-[var(--muted-foreground)]">
                          {stat.correct}/{stat.total} benar &middot; {stat.accuracyPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${stat.accuracyPercent}%`,
                            backgroundColor:
                              stat.status === 'KUAT' ? '#10b981' : stat.status === 'SEDANG' ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                    {stat.status === 'LEMAH' && (
                      <Link
                        href={`/drill/${cat}/${encodeURIComponent(stat.name)}`}
                        className="shrink-0 px-2 py-1 rounded-md text-[10px] font-bold text-white bg-[var(--primary)] hover:opacity-90 transition flex items-center gap-1"
                        title={`Latihan 10 soal kilat topik ${stat.name}`}
                      >
                        <Lightning size={11} weight="fill" />
                        <span>Latih</span>
                      </Link>
                    )}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
