'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/useUser';
import {
  Crown,
  QrCode,
  CheckCircle,
  XCircle,
  ArrowRight,
  Spinner,
  Check,
  Package,
  Copy,
} from '@phosphor-icons/react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Label paket yang ingin diakses (misal: "Tryout 8") */
  triggerPackage?: string;
  /** ID paket (misal: "tryout-8") */
  packageId?: string;
}

interface OrderInfo {
  orderId: number;
  invoiceCode?: string;
  baseAmount: number;
  uniqueCode: number;
  exactAmount: number;
  qrisUrl?: string;
  qrisImage?: string;
  gateway?: string;
}

export function UpgradeProModal({
  isOpen,
  onClose,
  triggerPackage,
  packageId,
}: UpgradeProModalProps) {
  const { user, loading: userLoading } = useUser();
  const pathname = usePathname();

  const [selectedPlan, setSelectedPlan] = useState<'single' | 'pro'>('pro');
  const [step, setStep] = useState<'info' | 'pay' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetPackageId = selectedPlan === 'single' ? packageId : undefined;

  // Function to create or fetch pending order with unique code
  const fetchOrder = useCallback(async (plan: 'single' | 'pro') => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: plan,
          packageId: plan === 'single' ? packageId : null,
          baseAmount: 1000, // Testing nominal Rp 1.000
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderInfo(data);
      } else {
        setErrorMessage(data.error || 'Gagal menyiapkan pesanan pembayaran.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi bermasalah.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (!isOpen) {
      setStep('info');
      setOrderInfo(null);
      setErrorMessage('');
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    // Jika belum login, jangan buat order — tampilkan auth gate
    if (!user && !userLoading) return;

    const initialPlan = packageId && triggerPackage ? 'single' : 'pro';
    setSelectedPlan(initialPlan);

    fetch('/api/user/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.email) setUserEmail(d.email);
      })
      .catch(() => null);

    fetchOrder(initialPlan);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, packageId, triggerPackage, fetchOrder, user, userLoading]);

  // Polling status saat user berada di step 'pay'
  useEffect(() => {
    if (step === 'pay' && orderInfo?.orderId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          // 1. Cek via order-status
          const res = await fetch(`/api/payment/order-status?orderId=${orderInfo.orderId}`);
          const data = await res.json();
          if (data.paid) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStep('success');
            return;
          }

          // 2. Fallback cek via user status
          const ures = await fetch('/api/user/status');
          const udata = await ures.json();
          if (
            udata.is_pro ||
            (targetPackageId && udata.unlocked_packages?.includes(targetPackageId))
          ) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStep('success');
          }
        } catch {
          // ignore network glitch
        }
      }, 2500);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [step, orderInfo?.orderId, targetPackageId]);

  function handleSelectPlan(plan: 'single' | 'pro') {
    setSelectedPlan(plan);
    fetchOrder(plan);
  }


  function handleProceedToPay() {
    setStep('pay');
  }

  function copyAmount() {
    if (orderInfo?.exactAmount) {
      navigator.clipboard.writeText(String(orderInfo.exactAmount));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!isOpen) return null;

  // Auth Gate: Tampilkan popup ajakan login jika user belum login
  if (!user && !userLoading) {
    const loginUrl = `/login?redirect=${encodeURIComponent(pathname || '/simulasi')}`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
        <div className="card-modern max-w-md w-full p-6 text-center space-y-5 relative bg-[var(--card)]">
          {/* Tombol tutup */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <XCircle size={22} weight="bold" />
          </button>

          {/* Ikon */}
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
            style={{ background: '#c96442' }}
          >
            <Crown size={28} weight="fill" />
          </div>

          {/* Judul & deskripsi */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-gray-800">
              Masuk atau Buat Akun Dulu
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
              Akses PRO dan paket tryout akan terikat permanen ke akun kamu.
              Silakan login atau daftar gratis sebelum melanjutkan pembayaran.
            </p>
          </div>

          {/* Info keuntungan */}
          <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-800">
              <CheckCircle size={15} weight="fill" className="text-orange-600" />
              <span>Keuntungan Akun Terdaftar:</span>
            </div>
            <ul className="text-[11px] text-gray-600 space-y-1 pl-5 list-disc">
              <li>Akses tryout tidak hilang jika ganti browser / HP</li>
              <li>Progress roadmap &amp; analisa kelemahan tersimpan aman</li>
              <li>Status PRO aktif otomatis setelah QRIS terverifikasi</li>
            </ul>
          </div>

          {/* Tombol aksi */}
          <div className="flex flex-col gap-2 pt-1">
            <Link
              href={loginUrl}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 shadow-sm transition hover:opacity-90"
              style={{ background: '#c96442' }}
            >
              <span>Masuk / Daftar Akun</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-5 bg-[var(--card)] max-h-[92vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-13 h-13 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            {step === 'pay' ? (
              <QrCode size={26} weight="duotone" />
            ) : (
              <Crown size={26} weight="duotone" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {step === 'success'
              ? 'Pembayaran Berhasil! 🎉'
              : step === 'pay'
              ? 'Selesaikan Pembayaran QRIS'
              : triggerPackage
              ? `Buka Akses ${triggerPackage}`
              : 'Upgrade ke Lolos.in PRO'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {step === 'pay'
              ? 'Bayar sesuai nominal kode unik agar sistem mendeteksi otomatis'
              : 'Pilih paket yang sesuai dengan kebutuhan belajarmu'}
          </p>
        </div>

        {/* STEP 1: Pilih Paket & Info */}
        {step === 'info' && (
          <div className="space-y-4">
            {packageId && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                  PILIH JENIS AKSES:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan('single')}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPlan === 'single'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--foreground)]">
                      <Package size={14} weight="duotone" />
                      Paket Ini Saja
                    </div>
                    <div className="text-base font-extrabold text-[var(--foreground)] mt-1">
                      Rp {orderInfo?.exactAmount && selectedPlan === 'single' ? orderInfo.exactAmount.toLocaleString('id-ID') : '1.000'}
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Buka {triggerPackage || '1 paket'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPlan('pro')}
                    className={`p-3 rounded-xl border text-left transition relative overflow-hidden ${
                      selectedPlan === 'pro'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                      AKSES PENUH
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <Crown size={14} weight="fill" className="text-amber-500" />
                      PRO All-Access
                    </div>
                    <div className="text-base font-extrabold text-[var(--foreground)] mt-1">
                      Rp {orderInfo?.exactAmount && selectedPlan === 'pro' ? orderInfo.exactAmount.toLocaleString('id-ID') : '1.000'}
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Semua Tryout 1–17
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Benefit Box */}
            <div
              className="p-3.5 rounded-xl border text-xs space-y-1.5"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <div className="font-semibold text-[var(--foreground)] mb-1">
                {selectedPlan === 'pro' ? 'Keuntungan PRO All-Access:' : 'Keuntungan Paket Satuan:'}
              </div>
              {selectedPlan === 'pro' ? (
                <>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Buka seluruh 19 paket tryout (110 soal standar CAT BKN)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    120+ soal figural bergambar resmi & rotasi matriks
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Bank Soal 300+ & fitur drill subkategori lengkap
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Akses aktif selamanya sampai kamu lulus CPNS 🎯
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Akses penuh untuk {triggerPackage || 'paket ini'}
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    110 Soal standar CAT BKN lengkap dengan pembahasan resmi
                  </div>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Check size={14} className="text-emerald-600 shrink-0" weight="bold" />
                    Analitik skor dan leaderboard nasional
                  </div>
                </>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <XCircle size={16} className="shrink-0" weight="fill" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Akun Pengguna Terdaftar */}
            {userEmail && (
              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center justify-between px-1">
                <span>Akun pembeli:</span>
                <span className="font-mono font-medium text-[var(--foreground)]">{userEmail}</span>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleProceedToPay}
                disabled={loading || !orderInfo}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner size={18} className="animate-spin" /> Menyiapkan Pesanan...
                  </>
                ) : (
                  <>
                    <QrCode size={18} weight="bold" />
                    Bayar Rp {orderInfo?.exactAmount?.toLocaleString('id-ID') || '1.000'} via QRIS
                    <ArrowRight size={14} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: QR Code + Instruksi Pembayaran */}
        {step === 'pay' && orderInfo && (
          <div className="space-y-4 text-center">
            {/* Box Nominal & Kode Unik */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-2">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                Nominal Pembayaran (Wajib Persis):
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-amber-950 font-mono tracking-tight">
                  Rp {orderInfo.exactAmount.toLocaleString('id-ID')}
                </span>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-bold transition flex items-center gap-1 active:scale-95"
                  title="Salin nominal"
                >
                  <Copy size={14} weight="bold" />
                  {copied ? 'Disalin!' : 'Salin'}
                </button>
              </div>
              <div className="text-[11px] text-amber-800 flex items-center justify-center gap-1">
                <span>Termasuk kode unik verifikasi:</span>
                <span className="font-bold font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950">+{orderInfo.uniqueCode}</span>
              </div>
            </div>

            {/* QR Code QRIS Dinamis */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orderInfo.qrisImage || orderInfo.qrisUrl || ''}
                  alt={`QRIS Pembayaran INV-${orderInfo.orderId}`}
                  width={220}
                  height={220}
                  className="rounded-lg object-contain mx-auto"
                />
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-snug max-w-[280px]">
                📱 Scan QRIS di atas menggunakan m-Banking (BCA, Mandiri, BRI, BNI, BSI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay).
              </p>
            </div>

            {/* Panduan Pembayaran QRIS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-800 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>📋 Petunjuk Pembayaran:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-700">
                <li>Buka aplikasi <b>m-Banking</b> atau <b>E-Wallet</b> favoritmu.</li>
                <li>Pilih menu <b>Scan QRIS / Bayar</b>.</li>
                <li>Arahkan kamera ke kode QRIS di atas (atau screenshot jika di HP).</li>
                <li>Pastikan total tagihan persis <b className="text-amber-900 font-mono">Rp {orderInfo.exactAmount.toLocaleString('id-ID')}</b>.</li>
                <li>Konfirmasi pembayaran — akun kamu akan aktif otomatis secara instan!</li>
              </ol>
            </div>

            {/* Waiting Spinner */}
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 font-medium pt-1">
              <Spinner size={14} className="animate-spin" />
              <span>Menunggu konfirmasi pembayaran...</span>
            </div>

            {/* Tombol Cek Manual & Kontak Admin */}
            <div className="space-y-2 pt-1 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/payment/order-status?orderId=${orderInfo.orderId}`);
                    const data = await res.json();
                    if (data.paid) { setStep('success'); return; }

                    const sres = await fetch('/api/payment/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: orderInfo.orderId }),
                    });
                    const sdata = await sres.json();
                    if (sdata.paid) {
                      setStep('success');
                    } else {
                      alert('Pembayaran belum terdeteksi. Pastikan kamu sudah transfer nominal yang persis sama, lalu coba lagi 10-15 detik kemudian.');
                    }
                  } catch {
                    alert('Gagal mengecek status. Silakan coba sesaat lagi.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn-secondary w-full py-2 text-xs font-semibold"
              >
                {loading ? 'Mengecek...' : 'Sudah Bayar? Cek Status Sekarang'}
              </button>

              <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--muted-foreground)]">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="hover:underline"
                >
                  ← Ganti Paket
                </button>

                <a
                  href={`https://wa.me/62859106831589?text=${encodeURIComponent(`Halo Admin Lolos.in, saya ada kendala pembayaran pesanan ID #${orderInfo.orderId} nominal Rp ${orderInfo.exactAmount}. Mohon bantuannya.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 hover:underline"
                >
                  <span>Kendala? Chat Admin WA</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Sukses */}
        {step === 'success' && (
          <div className="space-y-4 text-center py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={36} weight="fill" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[var(--foreground)]">
                Akses Berhasil Diaktifkan!
              </h4>
              <p className="text-xs text-[var(--muted-foreground)]">
                Terima kasih atas dukungannya. Paket tryout kamu sudah terbuka dan siap dikerjakan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold"
            >
              Mulai Ujian Sekarang
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        )}

        {step !== 'success' && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] block mx-auto pt-1"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}
