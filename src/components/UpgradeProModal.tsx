'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Crown,
  QrCode,
  CheckCircle,
  XCircle,
  ArrowRight,
  Spinner,
  Check,
  Package,
} from '@phosphor-icons/react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Label paket yang ingin diakses (misal: "Tryout 8") */
  triggerPackage?: string;
  /** ID paket (misal: "tryout-8") */
  packageId?: string;
}

interface QrisResponse {
  donationId: string;
  amount: number;
  amountRaw: number;
  qrString: string;
  qrDataUrl: string;
  saweriaUsername: string;
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
  const [step, setStep] = useState<'info' | 'qris' | 'check' | 'success'>('info');
  const [loadingQris, setLoadingQris] = useState(false);
  const [qrisData, setQrisData] = useState<QrisResponse | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('info');
      setQrisData(null);
      setErrorMessage('');
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    if (packageId && triggerPackage) {
      setSelectedPlan('single');
    } else {
      setSelectedPlan('pro');
    }

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

  useEffect(() => {
    if (step === 'qris' && qrisData?.donationId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/saweria/check?donationId=${qrisData.donationId}`);
          const data = await res.json();
          if (data.paid) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStep('success');
          }
        } catch {
          // ignore error during poll
        }
      }, 3500);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [step, qrisData?.donationId]);

  const targetAmount = selectedPlan === 'single' ? 10000 : 49000;
  const targetPackageId = selectedPlan === 'single' ? packageId : undefined;

  async function handleGenerateQris() {
    setLoadingQris(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/saweria/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: targetAmount,
          packageId: targetPackageId,
          donorEmail: userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat QRIS pembayaran.');
      }

      if (data.fallback && data.saweriaUrl) {
        window.open(data.saweriaUrl, '_blank');
        setStep('check');
        return;
      }

      setQrisData(data);
      setStep('qris');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setErrorMessage(msg);
    } finally {
      setLoadingQris(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 space-y-5 bg-[var(--card)] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-13 h-13 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            <Crown size={26} weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {step === 'success'
              ? 'Pembayaran Berhasil! 🎉'
              : step === 'qris'
              ? 'Scan QRIS untuk Membayar'
              : triggerPackage
              ? `Buka Akses ${triggerPackage}`
              : 'Upgrade ke Lolos.in PRO'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {step === 'qris'
              ? 'Scan menggunakan aplikasi m-Banking atau E-Wallet apa saja'
              : 'Pilih paket yang sesuai dengan kebutuhan belajarmu'}
          </p>
        </div>

        {/* STEP 1: Pilih Paket & Info Harga Dinamis */}
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
                      Rp 10.000
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
                      HEMAT
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <Crown size={14} weight="fill" className="text-amber-500" />
                      PRO All-Access
                    </div>
                    <div className="text-base font-extrabold text-[var(--foreground)] mt-1">
                      Rp 49.000
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
                disabled={loadingQris}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
              >
                {loadingQris ? (
                  <>
                    <Spinner size={18} className="animate-spin" />
                    Membuat Kode QRIS...
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

        {/* STEP 2: Tampilan QRIS Dinamis */}
        {step === 'qris' && qrisData && (
          <div className="space-y-4 text-center">
            {/* Kartu QRIS */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm inline-block mx-auto">
              {qrisData.qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrisData.qrDataUrl}
                  alt="QRIS Saweria Lolos.in"
                  className="w-56 h-56 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-100 text-slate-400">
                  <Spinner size={32} className="animate-spin" />
                </div>
              )}
              <div className="mt-2 text-[11px] font-semibold text-slate-700 tracking-wider">
                NMID: QRIS STANDAR NASIONAL
              </div>
            </div>

            {/* Tombol Simpan QRIS Image */}
            <div>
              <a
                href={qrisData.qrDataUrl}
                download={`QRIS-LolosIn-${qrisData.amountRaw}.png`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition"
              >
                Unduh Gambar QRIS
              </a>
            </div>

            {/* Detail Nominal */}
            <div
              className="p-3 rounded-xl border text-center space-y-0.5"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <div className="text-[11px] text-[var(--muted-foreground)]">Total yang harus dibayar:</div>
              <div className="text-2xl font-black text-[var(--foreground)]">
                Rp {qrisData.amountRaw.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-amber-700 font-medium">
                *Termasuk kode unik verifikasi otomatis dari Saweria
              </div>
            </div>

            {/* Panduan Pembayaran */}
            <div className="text-left text-xs text-[var(--muted-foreground)] space-y-1.5 p-3 rounded-xl border border-dashed">
              <div className="font-semibold text-[var(--foreground)]">Cara Bayar:</div>
              <ol className="list-decimal list-inside space-y-0.5 leading-relaxed text-[11px]">
                <li>Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, DANA, OVO, ShopeePay).</li>
                <li>Pilih menu <b>Scan / Bayar QRIS</b>.</li>
                <li>Arahkan kamera ke kode QR di atas dan selesaikan pembayaran.</li>
                <li>Halaman ini akan <b>otomatis terbuka</b> setelah pembayaran diterima.</li>
              </ol>
            </div>

            {/* Waiting Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 font-medium py-1">
              <Spinner size={15} className="animate-spin" />
              Menunggu pembayaran terdeteksi otomatis...
            </div>

            {/* Manual Check / Back */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setLoadingQris(true);
                  try {
                    const res = await fetch(`/api/saweria/check?donationId=${qrisData.donationId}`);
                    const data = await res.json();
                    if (data.paid) setStep('success');
                    else alert('Pembayaran belum terdeteksi. Silakan tunggu beberapa detik lagi.');
                  } finally {
                    setLoadingQris(false);
                  }
                }}
                disabled={loadingQris}
                className="btn-secondary w-full py-2.5 text-xs font-semibold"
              >
                {loadingQris ? 'Mengecek...' : 'Sudah Bayar? Cek Status Manual'}
              </button>

              <button
                type="button"
                onClick={() => setStep('info')}
                className="text-xs text-[var(--muted-foreground)] hover:underline block mx-auto"
              >
                ← Ganti Nominal / Kembali
              </button>
            </div>
          </div>
        )}

        {/* STEP 2.5: Menunggu Verifikasi Pembayaran Halaman Saweria */}
        {step === 'check' && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <QrCode size={28} weight="duotone" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-[var(--foreground)]">
                Selesaikan di Halaman Saweria
              </h4>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Halaman pembayaran Saweria telah dibuka di tab baru. Pilih metode pembayaran QRIS/GoPay/OVO dan pastikan kolom pesan berisi email kamu.
              </p>
            </div>

            <div
              className="p-3 rounded-xl border text-xs flex items-center justify-between text-left"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="text-[10px] text-[var(--muted-foreground)]">Email akun:</div>
                <div className="font-mono font-bold text-[var(--foreground)]">{userEmail || 'Email kamu'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[var(--muted-foreground)]">Nominal:</div>
                <div className="font-extrabold text-[var(--foreground)]">
                  Rp {targetAmount.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setLoadingQris(true);
                  try {
                    const res = await fetch('/api/user/status');
                    const data = await res.json();
                    if (data.is_pro || (targetPackageId && data.unlocked_packages?.includes(targetPackageId))) {
                      setStep('success');
                    } else {
                      alert('Pembayaran belum terverifikasi oleh sistem. Jika baru saja scan, tunggu 1-2 menit agar webhook Saweria memprosesnya.');
                    }
                  } finally {
                    setLoadingQris(false);
                  }
                }}
                disabled={loadingQris}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {loadingQris ? (
                  <>
                    <Spinner size={16} className="animate-spin" /> Mengecek Status...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} weight="bold" />
                    Saya Sudah Selesai Bayar
                  </>
                )}
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
