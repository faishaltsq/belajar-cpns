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
  DownloadSimple,
} from '@phosphor-icons/react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Label paket yang ingin diakses (misal: "Tryout 8") */
  triggerPackage?: string;
  /** ID paket (misal: "tryout-8") */
  packageId?: string;
}

interface QrisData {
  donationId: string;
  amount: number;
  amountRaw: number;
  qrString: string;
  qrDataUrl: string;
  packageId?: string;
  userEmail?: string;
}

export function UpgradeProModal({
  isOpen,
  onClose,
  triggerPackage,
  packageId,
}: UpgradeProModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'pro'>('pro');
  const [step, setStep] = useState<'info' | 'qris' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [qrisData, setQrisData] = useState<QrisData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetPackageId = selectedPlan === 'single' ? packageId : undefined;
  // Nominal testing Rp 1.000 (batas minimum QRIS nasional)
  const targetAmount = 1000;

  useEffect(() => {
    if (!isOpen) {
      setStep('info');
      setQrisData(null);
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

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, packageId, triggerPackage]);

  // Polling status saat user berada di step 'qris'
  useEffect(() => {
    if (step === 'qris' && qrisData?.donationId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          // 1. Cek status transaksi via API check
          const res = await fetch(`/api/saweria/check?donationId=${qrisData.donationId}`);
          const data = await res.json();
          if (data.paid) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStep('success');
            return;
          }

          // 2. Fallback cek user status langsung
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
  }, [step, qrisData?.donationId, targetPackageId]);

  // Generate QRIS langsung tanpa redirect
  const handleGenerateQris = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/saweria/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: targetAmount,
          packageId: selectedPlan === 'single' ? packageId : null,
          donorEmail: userEmail || 'user@lolos.in',
        }),
      });

      const data = await res.json();
      if (data.success && data.qrDataUrl) {
        setQrisData(data);
        setStep('qris');
      } else {
        setErrorMessage(data.error || 'Gagal membuat kode QRIS. Silakan coba kembali.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi bermasalah.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, packageId, userEmail, targetAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-5 bg-[var(--card)] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-13 h-13 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            {step === 'qris' ? (
              <QrCode size={26} weight="duotone" />
            ) : (
              <Crown size={26} weight="duotone" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {step === 'success'
              ? 'Pembayaran Berhasil! 🎉'
              : step === 'qris'
              ? 'Scan QRIS untuk Pembayaran'
              : triggerPackage
              ? `Buka Akses ${triggerPackage}`
              : 'Upgrade ke Lolos.in PRO'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {step === 'qris'
              ? 'Scan dengan aplikasi m-Banking atau E-Wallet apa saja'
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
                    onClick={() => setSelectedPlan('single')}
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
                      Rp 1.000
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Buka {triggerPackage || '1 paket'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('pro')}
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
                      Rp 1.000
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
                onClick={handleGenerateQris}
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner size={18} className="animate-spin" /> Menyiapkan Kode QRIS...
                  </>
                ) : (
                  <>
                    <QrCode size={18} weight="bold" />
                    Bayar Rp {targetAmount.toLocaleString('id-ID')} via QRIS
                    <ArrowRight size={14} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Tampilan Barcode QRIS Langsung di Web */}
        {step === 'qris' && qrisData && (
          <div className="space-y-4 text-center">
            {/* Box Barcode QRIS */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm inline-block mx-auto">
              {qrisData.qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrisData.qrDataUrl}
                  alt="QRIS Standar Pembayaran Nasional"
                  className="w-60 h-60 mx-auto rounded-xl object-contain"
                />
              ) : (
                <div className="w-60 h-60 flex items-center justify-center bg-slate-50 text-slate-400">
                  <Spinner size={32} className="animate-spin" />
                </div>
              )}
              <div className="mt-2.5 text-[11px] font-bold text-slate-700 tracking-wider">
                NMID: QRIS STANDAR NASIONAL
              </div>
            </div>

            {/* Tombol Unduh QR Image */}
            <div>
              <a
                href={qrisData.qrDataUrl}
                download={`QRIS-LolosIn-${qrisData.amountRaw}.png`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition"
              >
                <DownloadSimple size={14} weight="bold" />
                Unduh Gambar QRIS
              </a>
            </div>

            {/* Detail Total Nominal */}
            <div
              className="p-3 rounded-xl border text-center space-y-0.5"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <div className="text-[11px] text-[var(--muted-foreground)]">Total yang harus dibayar:</div>
              <div className="text-2xl font-black text-[var(--foreground)]">
                Rp {qrisData.amountRaw.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                <Check size={12} weight="bold" /> Verifikasi Otomatis Aktif
              </div>
            </div>

            {/* Panduan Cara Bayar */}
            <div className="text-left text-xs text-[var(--muted-foreground)] space-y-1.5 p-3 rounded-xl border border-dashed">
              <div className="font-semibold text-[var(--foreground)]">Cara Pembayaran:</div>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed text-[11px]">
                <li>Buka aplikasi <b>m-Banking</b> (BCA, Mandiri, BRI, BNI) atau <b>E-Wallet</b> (GoPay, DANA, OVO, ShopeePay).</li>
                <li>Pilih menu <b>Scan / Bayar QRIS</b>.</li>
                <li>Arahkan kamera ke kode QR di atas (atau pilih gambar dari galeri HP).</li>
                <li>Selesaikan pembayaran. Akses paket kamu akan <b>langsung terbuka otomatis</b>.</li>
              </ol>
            </div>

            {/* Waiting Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 font-medium py-1">
              <Spinner size={15} className="animate-spin" />
              Menunggu pembayaran terdeteksi otomatis...
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/saweria/check?donationId=${qrisData.donationId}`);
                    const data = await res.json();
                    if (data.paid) {
                      setStep('success');
                    } else {
                      alert('Pembayaran belum terdeteksi. Jika baru saja scan, tunggu beberapa detik lalu coba klik tombol ini lagi.');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="btn-secondary w-full py-2.5 text-xs font-semibold"
              >
                {loading ? 'Mengecek...' : 'Sudah Bayar? Cek Status Pembayaran'}
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
