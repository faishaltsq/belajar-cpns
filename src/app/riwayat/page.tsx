'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClockCounterClockwise, Trophy, XCircle, ArrowRight, BookOpen, FloppyDisk, Play, Trash } from '@phosphor-icons/react';

interface DraftItem {
  packageId: string;
  packageLabel: string;
  answeredCount: number;
  savedAt: string;
}

function formatPackageLabel(packageId: string) {
  return packageId
    .replace('tryout-mini', 'Tryout Mini')
    .replace('tryout-figural', 'Tryout Figural Khusus')
    .replace('tryout-', 'Tryout ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface RiwayatItem {
  resultId: string;
  packageId: string;
  packageLabel: string;
  totalScore: number;
  isPassedAll: boolean;
  completedAt: string;
  durationSeconds: number;
}

export default function RiwayatPage() {
  const [history, setHistory] = useState<RiwayatItem[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  function loadData() {
    const items: RiwayatItem[] = [];
    const draftItems: DraftItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('exam_result_')) {
        const resultId = key.replace('exam_result_', '');
        const parts = resultId.split('-');
        const ts = Number(parts[parts.length - 1]);
        const packageId = isNaN(ts) ? resultId : parts.slice(0, -1).join('-');
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const r = JSON.parse(raw);
          items.push({
            resultId,
            packageId,
            packageLabel: formatPackageLabel(packageId),
            totalScore: r.totalScore ?? 0,
            isPassedAll: r.isPassedAll ?? false,
            completedAt: r.completedAt ?? new Date(ts || Date.now()).toISOString(),
            durationSeconds: r.durationSeconds ?? 0,
          });
        } catch {}
      }
    }

    // Drafts: exam_answers_* with at least 1 answered question
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('exam_answers_')) continue;
      const packageId = key.replace('exam_answers_', '');
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const answers = JSON.parse(raw);
        const answeredCount = Object.values(answers).filter(
          (v) => v !== null && v !== undefined && v !== ''
        ).length;
        if (answeredCount === 0) continue;
        const startTs = localStorage.getItem(`exam_start_${packageId}`);
        const savedAt = startTs
          ? new Date(Number(startTs)).toISOString()
          : new Date().toISOString();
        draftItems.push({ packageId, packageLabel: formatPackageLabel(packageId), answeredCount, savedAt });
      } catch {}
    }

    items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    draftItems.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    setHistory(items);
    setDrafts(draftItems);
  }

  useEffect(() => { loadData(); }, []);

  function deleteDraft(packageId: string) {
    if (!confirm(`Hapus draft "${formatPackageLabel(packageId)}"?`)) return;
    localStorage.removeItem(`exam_answers_${packageId}`);
    localStorage.removeItem(`exam_start_${packageId}`);
    localStorage.removeItem(`exam_mode_${packageId}`);
    loadData();
  }

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function fmtDuration(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8">
      <div className="max-w-2xl w-full space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shrink-0">
            <ClockCounterClockwise size={20} weight="duotone" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Riwayat Ujian</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              {history.length} sesi selesai · {drafts.length} draft tersimpan
            </p>
          </div>
        </div>

        {/* DRAFT SECTION */}
        {drafts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <FloppyDisk size={16} weight="duotone" className="text-amber-500" />
              Draft Tersimpan — Lanjutkan Pengerjaan
            </h2>
            {drafts.map((draft) => (
              <div
                key={draft.packageId}
                className="card-modern p-4 flex items-center gap-4 border-l-4"
                style={{ borderLeftColor: 'var(--primary)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FloppyDisk size={20} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--foreground)]">{draft.packageLabel}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {draft.answeredCount} soal terjawab · Disimpan {fmtDate(draft.savedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => deleteDraft(draft.packageId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                    title="Hapus draft"
                  >
                    <Trash size={15} weight="bold" />
                  </button>
                  <Link
                    href={`/simulasi/${draft.packageId}`}
                    className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Play size={11} weight="fill" />
                    Lanjutkan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info banner */}
        <div
          className="px-4 py-3 rounded-xl border text-xs text-[var(--muted-foreground)] flex items-center justify-between gap-2"
          style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="shrink-0" />
            Riwayat disimpan di perangkat ini. Daftar akun untuk sinkronisasi lintas perangkat.
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (!confirm('Hapus semua riwayat ujian di perangkat ini?')) return;
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key && (
                    key.startsWith('exam_result_') ||
                    key.startsWith('exam_questions_') ||
                    key.startsWith('exam_user_answers_') ||
                    key.startsWith('exam_answers_') ||
                    key.startsWith('exam_start_')
                  )) {
                    localStorage.removeItem(key);
                  }
                }
                loadData();
              }}
              className="text-red-500 hover:text-red-700 text-[10px] font-semibold whitespace-nowrap shrink-0 underline"
            >
              Hapus Semua Riwayat
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="card-modern p-12 text-center text-[var(--muted-foreground)] space-y-3">
            <ClockCounterClockwise size={36} className="mx-auto opacity-30" />
            <p className="text-sm">Belum ada riwayat ujian.</p>
            <Link href="/simulasi" className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4">
              Mulai Tryout Sekarang
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.resultId} className="card-modern p-4 flex items-center gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.isPassedAll ? 'bg-emerald-100' : 'bg-red-50'
                }`}>
                  {item.isPassedAll
                    ? <Trophy size={20} className="text-emerald-600" weight="duotone" />
                    : <XCircle size={20} className="text-red-400" weight="duotone" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--foreground)]">
                      {item.packageLabel}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.isPassedAll
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {item.isPassedAll ? 'LULUS' : 'BELUM LULUS'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {fmtDate(item.completedAt)} · {fmtDuration(item.durationSeconds)}
                  </div>
                </div>

                {/* Score + link */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-[var(--foreground)]">{item.totalScore}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">skor</div>
                </div>

                <Link
                  href={`/simulasi/hasil/${item.resultId}`}
                  className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1 shrink-0"
                >
                  Detail
                  <ArrowRight size={11} weight="bold" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
