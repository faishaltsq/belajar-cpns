'use client';

import { useState, useEffect } from 'react';
import {
  WarningCircle,
  WhatsappLogo,
  EnvelopeSimple,
  X,
  PaperPlaneTilt,
  CheckCircle,
  Spinner,
} from '@phosphor-icons/react';
import { generateWhatsAppLink, generateMailtoLink, SUPPORT_EMAIL } from '@/lib/support';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  contextPage?: string;
}

const CATEGORIES = [
  'Bug Teknis & Error Sistem',
  'Soal / Kunci / Pembahasan Keliru',
  'Gambar Soal Figural Tidak Muncul',
  'Kendala Pembayaran / Akses PRO',
  'Akun, Login & Riwayat Ujian',
  'Saran & Masukan Lainnya',
];

export function ReportIssueModal({
  isOpen,
  onClose,
  defaultCategory,
  contextPage,
}: ReportIssueModalProps) {
  const [category, setCategory] = useState(defaultCategory || CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setErrorMsg('');
      setDescription('');
      return;
    }
    // Fetch logged in user email if available
    fetch('/api/user/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setUserEmail(data.email);
      })
      .catch(() => null);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = contextPage || (typeof window !== 'undefined' ? window.location.href : '');

  function handleOpenWhatsApp() {
    const waUrl = generateWhatsAppLink({
      category,
      description: description || 'Halo Admin, saya mengalami kendala pada aplikasi.',
      userEmail,
      pageUrl: currentUrl,
    });
    window.open(waUrl, '_blank');
  }

  function handleOpenEmail() {
    const mailUrl = generateMailtoLink({
      category,
      description: description || 'Deskripsi kendala...',
      userEmail,
      pageUrl: currentUrl,
    });
    window.location.href = mailUrl;
  }

  async function handleSubmitInApp(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Harap jelaskan kendala yang dialami.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          userEmail,
          pageUrl: currentUrl,
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setErrorMsg(data.error || 'Gagal mengirim laporan. Silakan gunakan opsi WhatsApp langsung.');
      }
    } catch {
      setErrorMsg('Koneksi internet bermasalah. Silakan hubungi langsung via WhatsApp.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-lg w-full p-4 sm:p-6 space-y-4 bg-[var(--card)] max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto relative rounded-t-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <WarningCircle size={24} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Laporkan Masalah / Bug</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Tim Lolos.in siap membantu menyelesaikan kendalamu secepatnya.
            </p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={32} weight="fill" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Laporan Berhasil Terkirim!</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Terima kasih atas laporanmu. Jika membutuhkan respon instan, kamu juga dapat langsung menghubungi WhatsApp Admin kami.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white flex items-center gap-1.5 shadow-sm"
              >
                <WhatsappLogo size={16} weight="fill" /> Hubungi WhatsApp
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 flex flex-col items-center justify-center gap-1 transition text-center"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700">
                  <WhatsappLogo size={16} weight="fill" className="text-[#25D366]" />
                  Chat WhatsApp
                </div>
                <span className="text-[10px] text-emerald-800">Admin: +62 859-1068-31589</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEmail}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--card)] text-[var(--foreground)] flex flex-col items-center justify-center gap-1 transition text-center"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <EnvelopeSimple size={16} weight="bold" className="text-[var(--primary)]" />
                  Kirim Email
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{SUPPORT_EMAIL}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-[var(--border)] w-full"></div>
              <span className="bg-[var(--card)] px-3 text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider absolute">
                Atau Kirim Formulir Langsung
              </span>
            </div>

            {/* In-app Form */}
            <form onSubmit={handleSubmitInApp} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  Kategori Kendala:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  Email / Kontak Kamu (opsional):
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="nama@email.com untuk kami kabari balik"
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  Jelaskan Masalah / Bug yang Terjadi: *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Saat membuka soal nomor 15, tampilan pilihan jawaban tidak muncul..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Spinner size={14} className="animate-spin" /> Mengirim Laporan...
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={14} weight="bold" /> Kirim Laporan Masalah
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
