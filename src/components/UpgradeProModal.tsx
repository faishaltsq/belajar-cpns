'use client';

import { useEffect, useState } from 'react';
import { Crown, QrCode, CheckCircle, XCircle, ArrowRight, Spinner, Copy } from '@phosphor-icons/react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Judul paket yang ingin diakses (misal: "Tryout 8") */
  triggerPackage?: string;
}

const SAWERIA_URL = 'https://saweria.co/lolosin';
const PRO_PRICE = 49000;

export function UpgradeProModal({ isOpen, onClose, triggerPackage }: UpgradeProModalProps) {
  const [step, setStep] = useState<'info' | 'check'>('info');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'upgraded' | 'not_yet'>('idle');
  const [userEmail, setUserEmail] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) { setStep('info'); setStatus('idle'); }
    // Fetch email dari /api/user/status
    fetch('/api/user/status')
      .then(r => r.json())
      .then(d => { if (d.email) setUserEmail(d.email); })
      .catch(() => null);
  }, [isOpen]);

  async function checkStatus() {
    setChecking(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/user/status');
      const data = await res.json();
      if (data.is_pro) {
        setStatus('upgraded');
      } else {
        setStatus('not_yet');
      }
    } catch {
      setStatus('not_yet');
    } finally {
      setChecking(false);
    }
  }

  function copyEmail() {
    if (userEmail) {
      navigator.clipboard.writeText(userEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function openSaweria() {
    const msg = userEmail ? `upgrade ${userEmail}` : 'upgrade';
    window.open(`${SAWERIA_URL}?amount=${PRO_PRICE}&message=${encodeURIComponent(msg)}`, '_blank');
    setStep('check');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card-modern max-w-md w-full p-6 space-y-5 bg-[var(--card)]">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-100 text-amber-600">
            <Crown size={28} weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {triggerPackage ? `${triggerPackage} — Khusus Member PRO` : 'Upgrade ke PRO'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Akses semua paket tryout + bank soal seumur hidup (berlaku sampai lulus CPNS 🎯)
          </p>
        </div>

        {/* Benefits */}
        {step === 'info' && (
          <ul className="space-y-2 text-sm">
            {[
              '✅ Semua Tryout 1–17 (110 soal per paket)',
              '✅ Bank soal 300+ soal figural bergambar',
              '✅ Drill soal per subkategori TWK/TIU/TKP',
              '✅ Analitik skor + diagnostic report',
              '✅ Akses selamanya, sekali bayar',
            ].map(b => (
              <li key={b} className="flex items-start gap-2 text-[var(--foreground)]">
                <span className="text-xs leading-5">{b}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Price */}
        {step === 'info' && (
          <div
            className="rounded-xl p-4 text-center border"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
          >
            <div className="text-3xl font-bold text-[var(--foreground)]">Rp 49.000</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Bayar sekali via QRIS / e-wallet di Saweria</div>
          </div>
        )}

        {/* Email hint */}
        {step === 'info' && userEmail && (
          <div
            className="rounded-xl p-3 border text-xs flex items-center gap-2"
            style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
          >
            <QrCode size={16} className="shrink-0 text-[var(--muted-foreground)]" />
            <span className="flex-1 text-[var(--muted-foreground)]">
              Saat checkout Saweria, isi kolom <b>Pesan</b> dengan email kamu:
            </span>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1 font-mono text-[var(--primary)] font-semibold hover:underline shrink-0"
            >
              {userEmail.length > 20 ? userEmail.substring(0, 20) + '...' : userEmail}
              <Copy size={12} />
            </button>
            {copied && <span className="text-emerald-600 text-[10px]">Disalin!</span>}
          </div>
        )}

        {/* Step: Cek Status */}
        {step === 'check' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)] text-center">
              Sudah selesai bayar di Saweria? Klik tombol di bawah untuk verifikasi.
            </p>

            {status === 'upgraded' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle size={20} className="text-emerald-600 shrink-0" weight="fill" />
                <div>
                  <div className="text-sm font-bold text-emerald-800">Akun PRO Aktif! 🎉</div>
                  <div className="text-xs text-emerald-700">Semua paket tryout sudah terbuka. Selamat belajar!</div>
                </div>
              </div>
            )}

            {status === 'not_yet' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <XCircle size={20} className="text-amber-600 shrink-0" weight="fill" />
                <div>
                  <div className="text-sm font-bold text-amber-800">Belum terdeteksi</div>
                  <div className="text-xs text-amber-700">
                    Pastikan isi kolom Pesan di Saweria dengan email akun kamu. Tunggu 1–2 menit lalu cek lagi.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={checkStatus}
              disabled={checking || status === 'upgraded'}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {checking
                ? <><Spinner size={16} className="animate-spin" /> Mengecek...</>
                : status === 'upgraded'
                ? <><CheckCircle size={16} weight="fill" /> Sudah PRO!</>
                : 'Cek Status Upgrade'
              }
            </button>

            <button
              onClick={() => setStep('info')}
              className="btn-secondary w-full py-2 text-xs"
            >
              ← Kembali ke Info
            </button>
          </div>
        )}

        {/* CTA */}
        {step === 'info' && (
          <div className="space-y-2">
            <button
              onClick={openSaweria}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold"
            >
              <QrCode size={18} weight="bold" />
              Bayar Sekarang via Saweria
              <ArrowRight size={14} weight="bold" />
            </button>
            <button onClick={onClose} className="btn-secondary w-full py-2.5 text-xs">
              Nanti Saja
            </button>
          </div>
        )}

        {status === 'upgraded' && (
          <button
            onClick={() => { onClose(); window.location.reload(); }}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <ArrowRight size={14} weight="bold" /> Lanjut ke Tryout
          </button>
        )}
      </div>
    </div>
  );
}
