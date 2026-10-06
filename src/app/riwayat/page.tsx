'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClockCounterClockwise,
  Trophy,
  XCircle,
  ArrowRight,
  BookOpen,
  FloppyDisk,
  Play,
  Trash,
  ShoppingBag,
  CheckCircle,
  Crown,
  Sparkle,
  WhatsappLogo,
  ArrowClockwise,
  User,
} from '@phosphor-icons/react';
import { UpgradeProModal } from '@/components/UpgradeProModal';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';

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

interface ActivePackage {
  packageId: string;
  title: string;
}

interface TransactionItem {
  id: number;
  orderType: 'single' | 'pro';
  packageId: string | null;
  packageTitle: string;
  baseAmount: number;
  uniqueCode: number;
  exactAmount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
}

type MainTab = 'exam' | 'billing';
type TransactionFilter = 'all' | 'paid' | 'pending' | 'cancelled';

export default function RiwayatPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [activeTab, setActiveTab] = useState<MainTab>('exam');

  // Exam history states
  const [history, setHistory] = useState<RiwayatItem[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  // Billing history states
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [proActivatedAt, setProActivatedAt] = useState<string | null>(null);
  const [activePackages, setActivePackages] = useState<ActivePackage[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  // Modal bayar ulang untuk pending
  const [selectedPayPackage, setSelectedPayPackage] = useState<{ id?: string; label?: string } | null>(null);

  function loadExamData() {
    const items: RiwayatItem[] = [];
    const draftItems: DraftItem[] = [];

    const examPrefix = scopedKey('exam_result_', userId);
    const answersDraftPrefix = scopedKey('exam_answers_', userId);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(examPrefix)) {
        const resultId = key.replace(examPrefix, '');
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

    // Drafts: scoped exam_answers_* with at least 1 answered question
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(answersDraftPrefix)) continue;
      const packageId = key.replace(answersDraftPrefix, '');
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const answers = JSON.parse(raw);
        const answeredCount = Object.values(answers).filter(
          (v) => v !== null && v !== undefined && v !== ''
        ).length;
        if (answeredCount === 0) continue;
        const startTs = localStorage.getItem(scopedKey(`exam_start_${packageId}`, userId));
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

  async function loadBillingData() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch('/api/payment/history');
      if (res.status === 401) {
        setBillingError('unauthorized');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIsPro(Boolean(data.isPro));
        setProActivatedAt(data.proActivatedAt || null);
        setActivePackages(data.activePackages || []);
        setTransactions(data.transactions || []);
      } else {
        setBillingError(data.error || 'Gagal memuat data transaksi');
      }
    } catch {
      setBillingError('Gagal memuat riwayat transaksi. Periksa koneksi internet.');
    } finally {
      setBillingLoading(false);
    }
  }

  useEffect(() => {
    loadExamData();
    loadBillingData();
  }, [userId]);

  function deleteDraft(packageId: string) {
    if (!confirm(`Hapus draft "${formatPackageLabel(packageId)}"?`)) return;
    localStorage.removeItem(scopedKey(`exam_answers_${packageId}`, userId));
    localStorage.removeItem(scopedKey(`exam_start_${packageId}`, userId));
    localStorage.removeItem(scopedKey(`exam_mode_${packageId}`, userId));
    loadExamData();
  }

  async function handleCancelOrder(orderId: number) {
    if (!confirm(`Batalkan pesanan ID #${orderId}?`)) return;
    setCancellingId(orderId);
    try {
      const res = await fetch('/api/payment/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadBillingData();
      } else {
        alert(data.error || 'Gagal membatalkan pesanan.');
      }
    } catch {
      alert('Terjadi kesalahan saat membatalkan pesanan.');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleCheckStatus(orderId: number) {
    setCheckingId(orderId);
    try {
      const res = await fetch(`/api/payment/order-status?orderId=${orderId}`);
      const data = await res.json();
      if (data.paid) {
        alert('Pembayaran berhasil dikonfirmasi! Akses paket sudah terbuka.');
        await loadBillingData();
      } else {
        alert('Pembayaran belum terdeteksi. Silakan coba sesaat lagi.');
      }
    } catch {
      alert('Gagal mengecek status pembayaran.');
    } finally {
      setCheckingId(null);
    }
  }

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'paid') return tx.status === 'paid';
    if (txFilter === 'pending') return tx.status === 'pending';
    if (txFilter === 'cancelled') return tx.status === 'cancelled' || tx.status === 'expired';
    return true;
  });

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8">
      <div className="max-w-2xl w-full space-y-5">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shrink-0 shadow-sm">
              <ClockCounterClockwise size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">Riwayat &amp; Paket</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                Pantau riwayat tryout, paket aktif, dan status pembayaran kamu
              </p>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--muted)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'exam'
                ? 'bg-white text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <ClockCounterClockwise size={16} weight={activeTab === 'exam' ? 'bold' : 'regular'} />
            Riwayat Tryout
            {history.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
                {history.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'billing'
                ? 'bg-white text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <ShoppingBag size={16} weight={activeTab === 'billing' ? 'bold' : 'regular'} />
            Paket &amp; Transaksi
            {transactions.some((t) => t.status === 'pending') && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: RIWAYAT UJIAN & DRAFTS                            */}
        {/* ========================================================= */}
        {activeTab === 'exam' && (
          <div className="space-y-4">
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
                Riwayat pengerjaan soal disimpan di peramban ini.
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (!confirm('Hapus semua riwayat ujian di perangkat ini?')) return;
                    const scope = userId ? `u_${userId}` : 'guest';
                    const prefix = `lolos_${scope}_exam_`;
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith(prefix)) {
                        localStorage.removeItem(key);
                      }
                    }
                    loadExamData();
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
                <p className="text-sm font-medium">Belum ada riwayat ujian yang diselesaikan.</p>
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
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isPassedAll ? 'bg-emerald-100' : 'bg-red-50'
                      }`}
                    >
                      {item.isPassedAll ? (
                        <Trophy size={20} className="text-emerald-600" weight="duotone" />
                      ) : (
                        <XCircle size={20} className="text-red-400" weight="duotone" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--foreground)]">{item.packageLabel}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.isPassedAll ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
                          }`}
                        >
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
        )}

        {/* ========================================================= */}
        {/* TAB 2: PAKET AKTIF & RIWAYAT TRANSAKSI                   */}
        {/* ========================================================= */}
        {activeTab === 'billing' && (
          <div className="space-y-5">
            {/* If unauthorized */}
            {billingError === 'unauthorized' && (
              <div className="card-modern p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <User size={24} weight="bold" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)]">Masuk ke Akun Anda</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
                    Masuk atau buat akun untuk melihat paket yang kamu miliki serta memantau status pembayaran.
                  </p>
                </div>
                <Link href="/login" className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-5">
                  Masuk Sekarang
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            )}

            {billingLoading && (
              <div className="card-modern p-12 text-center text-xs text-[var(--muted-foreground)]">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-2" />
                Memuat riwayat transaksi...
              </div>
            )}

            {!billingLoading && billingError && billingError !== 'unauthorized' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                <span>{billingError}</span>
                <button
                  onClick={loadBillingData}
                  className="font-bold text-red-800 hover:underline flex items-center gap-1"
                >
                  <ArrowClockwise size={14} /> Coba Lagi
                </button>
              </div>
            )}

            {!billingLoading && !billingError && (
              <>
                {/* 1. SECTION: PAKET AKTIF */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
                    Paket yang Kamu Miliki
                  </h2>

                  {isPro ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-orange-500/10 border-2 border-amber-300 relative overflow-hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Crown size={24} weight="fill" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-amber-950">Member PRO Lolos.in</h3>
                              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                                AKTIF
                              </span>
                            </div>
                            <p className="text-xs text-amber-900/80 mt-0.5">
                              Akses tak terbatas ke seluruh 19+ paket tryout SKD CPNS dan fitur pembahasan lengkap.
                            </p>
                            {proActivatedAt && (
                              <p className="text-[10px] text-amber-800/70 mt-1">
                                Diaktifkan pada {fmtDate(proActivatedAt)}
                              </p>
                            )}
                          </div>
                        </div>

                        <Link
                          href="/simulasi"
                          className="btn-primary text-xs py-1.5 px-3 shrink-0 shadow-sm flex items-center gap-1"
                        >
                          <Play size={12} weight="fill" /> Kerjakan Tryout
                        </Link>
                      </div>
                    </div>
                  ) : activePackages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activePackages.map((pkg) => (
                        <div
                          key={pkg.packageId}
                          className="card-modern p-3 flex items-center justify-between gap-3 border-emerald-200 bg-emerald-50/30"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <CheckCircle size={18} weight="fill" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--foreground)] truncate">{pkg.title}</div>
                              <div className="text-[10px] text-emerald-700 font-semibold">Akses Terbuka</div>
                            </div>
                          </div>
                          <Link
                            href={`/simulasi/${pkg.packageId}`}
                            className="btn-secondary text-[10px] py-1 px-2.5 shrink-0"
                          >
                            Mulai
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card-modern p-5 text-center space-y-2 border-dashed">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Kamu belum memiliki paket berbayar aktif. Dapatkan akses ke paket tryout SKD lengkap dengan
                        pembahasan detail.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPayPackage({})}
                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5"
                      >
                        <Sparkle size={14} weight="fill" />
                        Upgrade ke PRO Mulai Rp 1.000
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. SECTION: RIWAYAT TRANSAKSI */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
                      Riwayat Transaksi ({transactions.length})
                    </h2>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[11px]">
                      <button
                        type="button"
                        onClick={() => setTxFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          txFilter === 'all'
                            ? 'bg-white text-[var(--foreground)] shadow-xs'
                            : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxFilter('paid')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          txFilter === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                            : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        Berhasil
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          txFilter === 'pending'
                            ? 'bg-amber-100 text-amber-800 shadow-xs'
                            : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxFilter('cancelled')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          txFilter === 'cancelled'
                            ? 'bg-slate-200 text-slate-800 shadow-xs'
                            : 'text-[var(--muted-foreground)]'
                        }`}
                      >
                        Batal / Gagal
                      </button>
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="card-modern p-8 text-center text-xs text-[var(--muted-foreground)]">
                      Tidak ada transaksi pada kategori ini.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className={`card-modern p-4 space-y-3 border-l-4 ${
                            tx.status === 'paid'
                              ? 'border-l-emerald-500'
                              : tx.status === 'pending'
                              ? 'border-l-amber-500'
                              : 'border-l-slate-300'
                          }`}
                        >
                          {/* Row 1: Header ID, Date, Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-[var(--foreground)]">
                                  Order #{tx.id}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    tx.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.status === 'pending'
                                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                                      : tx.status === 'cancelled'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-red-50 text-red-600'
                                  }`}
                                >
                                  {tx.status === 'paid' && 'Berhasil'}
                                  {tx.status === 'pending' && 'Menunggu Bayar'}
                                  {tx.status === 'cancelled' && 'Dibatalkan'}
                                  {tx.status === 'expired' && 'Kedaluwarsa'}
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                                Dibuat: {fmtDate(tx.createdAt)}
                              </div>
                            </div>

                            {/* Nominal */}
                            <div className="text-right">
                              <div className="text-base font-extrabold text-[var(--foreground)] font-mono">
                                Rp {tx.exactAmount.toLocaleString('id-ID')}
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)]">
                                Kode unik: +{tx.uniqueCode}
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Package Title */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{tx.packageTitle}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {tx.orderType === 'pro' ? 'Akses PRO' : 'Paket Satuan'}
                            </span>
                          </div>

                          {/* Row 3: Action Buttons based on status */}
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-xs flex-wrap gap-2">
                            {tx.status === 'pending' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(tx.id)}
                                    disabled={cancellingId === tx.id}
                                    className="text-red-500 hover:text-red-700 font-semibold text-[11px] hover:underline disabled:opacity-50"
                                  >
                                    {cancellingId === tx.id ? 'Membatalkan...' : 'Batalkan'}
                                  </button>
                                  <span className="text-slate-300">·</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCheckStatus(tx.id)}
                                    disabled={checkingId === tx.id}
                                    className="text-slate-600 hover:text-slate-900 font-semibold text-[11px] flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <ArrowClockwise size={12} className={checkingId === tx.id ? 'animate-spin' : ''} />
                                    Cek Status
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedPayPackage({
                                      id: tx.packageId || undefined,
                                      label: tx.packageTitle,
                                    })
                                  }
                                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold shadow-xs"
                                >
                                  Lanjutkan Bayar
                                  <ArrowRight size={13} weight="bold" />
                                </button>
                              </>
                            )}

                            {tx.status === 'paid' && (
                              <div className="text-[11px] text-emerald-700 flex items-center justify-between w-full">
                                <span>
                                  Lunas pada {tx.paidAt ? fmtDate(tx.paidAt) : 'Konfirmasi Otomatis'}
                                </span>
                                {tx.packageId ? (
                                  <Link
                                    href={`/simulasi/${tx.packageId}`}
                                    className="font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                                  >
                                    Buka Soal <ArrowRight size={12} />
                                  </Link>
                                ) : (
                                  <Link
                                    href="/simulasi"
                                    className="font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                                  >
                                    Buka Semua Tryout <ArrowRight size={12} />
                                  </Link>
                                )}
                              </div>
                            )}

                            {(tx.status === 'cancelled' || tx.status === 'expired') && (
                              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center justify-between w-full">
                                <span>Pesanan telah kedaluwarsa atau dibatalkan</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedPayPackage({
                                      id: tx.packageId || undefined,
                                      label: tx.packageTitle,
                                    })
                                  }
                                  className="font-bold text-[var(--primary)] hover:underline"
                                >
                                  Pesan Ulang
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Support Banner */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <WhatsappLogo size={18} className="text-emerald-600 shrink-0" weight="fill" />
                    <span>Pembayaran tidak otomatis masuk atau ada kendala kode unik?</span>
                  </div>
                  <a
                    href="https://wa.me/62859106831589?text=Halo%20Admin%20Lolos.in,%20saya%20butuh%20bantuan%20terkait%20transaksi%20paket."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Chat Admin WA →
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Pro Modal Popup jika user ingin bayar/lanjutkan transaksi */}
      {selectedPayPackage !== null && (
        <UpgradeProModal
          isOpen={true}
          onClose={() => {
            setSelectedPayPackage(null);
            loadBillingData();
          }}
          packageId={selectedPayPackage.id}
          triggerPackage={selectedPayPackage.label}
        />
      )}
    </div>
  );
}
