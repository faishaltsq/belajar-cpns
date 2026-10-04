'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  baseAmount: number;
  uniqueCode: number;
  exactAmount: number;
  saweriaUsername: string;
}

export function UpgradeProModal({
  isOpen,
  onClose,
  triggerPackage,
  packageId,
}: UpgradeProModalProps) {
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
  }, [isOpen, packageId, triggerPackage, fetchOrder]);

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

  function openOfficialQris() {
    if (!orderInfo) return;
    const msg = selectedPlan === 'single'
      ? `Akses ${packageId} [ID #${orderInfo.orderId}]`
      : `Upgrade PRO [ID #${orderInfo.orderId}]`;
    const url = `https://saweria.co/${orderInfo.saweriaUsername || 'faishaltsq'}?amount=${orderInfo.exactAmount}&message=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function handleProceedToPay() {
    openOfficialQris();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-5 bg-[var(--card)] max-h-[92vh] overflow-y-auto">
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

        {/* STEP 2: Instruksi Pembayaran dengan Nominal Unik */}
        {step === 'pay' && orderInfo && (
          <div className="space-y-4 text-center">
            {/* Box Nominal Unik */}
            <div
              className="p-4 rounded-2xl border text-center space-y-2"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <div className="text-xs text-[var(--muted-foreground)]">Nominal Pembayaran (Tepat):</div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-3xl font-black text-[var(--foreground)] tracking-tight">
                  Rp {orderInfo.exactAmount.toLocaleString('id-ID')}
                </div>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="p-1.5 rounded-lg border hover:bg-[var(--card)] text-[var(--primary)] transition"
                  title="Salin nominal"
                >
                  <Copy size={16} />
                </button>
              </div>
              {copied && <div className="text-emerald-600 text-xs font-semibold">Nominal disalin!</div>}

              {/* Badge Kode Unik */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                <span>Kode Identifikasi ID: <b>+{orderInfo.uniqueCode}</b></span>
              </div>
            </div>

            {/* Panduan Pembayaran White-Label */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                💡 PANDUAN PEMBAYARAN:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
                <li>Klik tombol <b>&quot;Buka Barcode QRIS Resmi&quot;</b> di bawah untuk menampilkan kode QR aktif.</li>
                <li>Scan kode QR dengan <b>m-Banking</b> (BCA, Mandiri, BRI, BNI) atau <b>E-Wallet</b> (GoPay, DANA, OVO, ShopeePay).</li>
                <li>Pastikan nominal transfer adalah <b>Rp {orderInfo.exactAmount.toLocaleString('id-ID')}</b> (digit <b>+{orderInfo.uniqueCode}</b> adalah pengenal unik pesananmu).</li>
                <li>Setelah transfer berhasil, halaman ini akan <b>otomatis mendeteksi dan langsung aktif</b>!</li>
              </ol>
            </div>

            {/* Waiting Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 font-medium py-1">
              <Spinner size={16} className="animate-spin" />
              Menunggu pembayaran terkonfirmasi otomatis...
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={openOfficialQris}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
              >
                <QrCode size={18} weight="bold" />
                Buka Barcode QRIS Resmi
                <ArrowRight size={14} weight="bold" />
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    // 1. Cek status normal
                    const res = await fetch(`/api/payment/order-status?orderId=${orderInfo.orderId}`);
                    const data = await res.json();
                    if (data.paid) {
                      setStep('success');
                      return;
                    }

                    // 2. Sinkronisasi aktif dengan transaksi terbaru
                    const sres = await fetch('/api/payment/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: orderInfo.orderId }),
                    });
                    const sdata = await sres.json();
                    if (sdata.paid) {
                      setStep('success');
                    } else {
                      alert('Pembayaran belum terdeteksi. Jika baru saja menyelesaikan scan QRIS, mohon tunggu beberapa detik lalu klik tombol ini lagi.');
                    }
                  } catch {
                    alert('Gagal mengecek status. Silakan coba sesaat lagi.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn-secondary w-full py-2.5 text-xs font-semibold"
              >
                {loading ? 'Mengecek...' : 'Sudah Bayar? Cek Status Sekarang'}
              </button>

              <button
                type="button"
                onClick={() => setStep('info')}
                className="text-xs text-[var(--muted-foreground)] hover:underline block mx-auto pt-1"
              >
                ← Kembali ke Pilihan Paket
              </button>
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
