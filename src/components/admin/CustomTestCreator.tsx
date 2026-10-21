'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MagicWand,
  ListChecks,
  Clock,
  ImageSquare,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  ArrowSquareOut,
} from '@phosphor-icons/react';

/**
 * Shape of the POST /api/admin/generate-custom response. The route reports the
 * composition it actually wrote, which can be smaller than requested when a
 * category pool runs dry — so the success panel always renders these numbers,
 * never the ones the admin typed.
 */
interface GeneratedPackage {
  success: boolean;
  packageId: string;
  title: string;
  totalQuestions: number;
  twk: number;
  tiu: number;
  tkp: number;
  withImages: number;
  durationMinutes: number;
  savedTo: string;
}

/** Same charset /api/admin/packages accepts, so the result stays editable there. */
const PACKAGE_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

const MAX_PER_CATEGORY = 200;

/** Empty, negative or non-numeric input counts as zero rather than NaN. */
function parseCount(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 menit';
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}

function CountField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={MAX_PER_CATEGORY}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-modern w-full text-sm text-center font-bold"
      />
      <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{hint}</p>
    </div>
  );
}

export default function CustomTestCreator({
  adminPin,
  onPackageCreated,
}: {
  adminPin: string;
  /** Lets the dashboard refresh its package list once a new package exists. */
  onPackageCreated?: () => void;
}) {
  const [title, setTitle] = useState('Tryout Custom');
  const [packageId, setPackageId] = useState('tryout-custom');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [twkCount, setTwkCount] = useState('10');
  const [tiuCount, setTiuCount] = useState('10');
  const [tkpCount, setTkpCount] = useState('10');
  const [includeImages, setIncludeImages] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<GeneratedPackage | null>(null);

  const composition = useMemo(() => {
    const twk = parseCount(twkCount);
    const tiu = parseCount(tiuCount);
    const tkp = parseCount(tkpCount);
    const minutes = parseCount(durationMinutes);
    return {
      twk,
      tiu,
      tkp,
      minutes,
      total: twk + tiu + tkp,
      seconds: minutes * 60,
    };
  }, [twkCount, tiuCount, tkpCount, durationMinutes]);

  const share = (count: number) =>
    composition.total > 0 ? (count / composition.total) * 100 : 0;

  /** Only the cases the route would otherwise accept and silently mis-handle. */
  function validate(): string {
    if (!title.trim()) return 'Judul paket wajib diisi.';
    if (!PACKAGE_ID_PATTERN.test(packageId.trim())) {
      return 'ID paket hanya boleh huruf kecil, angka, dan tanda hubung (contoh: tryout-custom-1).';
    }
    if (composition.total === 0) {
      return 'Jumlah soal masih nol — isi minimal satu butir pada TWK, TIU, atau TKP.';
    }
    if (composition.minutes === 0) {
      return 'Durasi ujian harus lebih dari 0 menit.';
    }
    if (composition.minutes > 300) {
      return 'Durasi maksimal 300 menit dalam satu paket.';
    }
    if (composition.twk > MAX_PER_CATEGORY || composition.tiu > MAX_PER_CATEGORY || composition.tkp > MAX_PER_CATEGORY) {
      return `Maksimal ${MAX_PER_CATEGORY} butir per kategori dalam satu paket.`;
    }
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const message = validate();
    if (message) {
      setError(message);
      setCreated(null);
      return;
    }

    setSubmitting(true);
    setError('');
    setCreated(null);

    try {
      const res = await fetch('/api/admin/generate-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          packageId: packageId.trim(),
          title: title.trim(),
          twkCount: composition.twk,
          tiuCount: composition.tiu,
          tkpCount: composition.tkp,
          includeImages,
          durationMinutes: composition.minutes,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        // Surface what the route said; it already explains a dead database or a
        // SQL failure far better than a generic message could.
        const serverMessage =
          typeof data?.error === 'string' && data.error
            ? data.error
            : `Server menolak permintaan (HTTP ${res.status}).`;
        setError(
          res.status === 401
            ? `PIN admin tidak diterima (server: ${serverMessage}). Muat ulang halaman lalu masuk kembali.`
            : serverMessage
        );
        return;
      }

      setCreated(data as GeneratedPackage);
      onPackageCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Gagal menghubungi server: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="card-modern p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <MagicWand size={22} className="text-[var(--primary)]" />
            Custom Test Maker
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Rakit paket tryout dari bank soal yang sudah ada. Server mengambil butir acak per
            kategori, menomori ulang, lalu menyimpan paket ke database.
          </p>
        </div>
        <span className="badge-pill badge-neutral text-[10px] self-end sm:self-auto">ADMIN</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7">
          <div className="card-modern p-6 space-y-5">
            <div className="flex items-center gap-1.5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <ListChecks size={15} className="text-[var(--primary)]" />
              <h3 className="font-semibold text-xs text-[var(--foreground)]">Identitas Paket</h3>
            </div>

            <fieldset disabled={submitting} className="space-y-4 min-w-0">
              <div>
                <label
                  htmlFor="custom-title"
                  className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
                >
                  Judul Paket
                </label>
                <input
                  id="custom-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Tryout Custom Latihan Mandiri"
                  className="input-modern w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="custom-package-id"
                    className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
                  >
                    ID Paket
                  </label>
                  <input
                    id="custom-package-id"
                    type="text"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    placeholder="tryout-custom"
                    className="input-modern w-full text-xs font-mono"
                  />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    Dipakai di URL /simulasi/[id].{' '}
                    <span className="text-amber-700 font-medium">
                      ID yang sudah ada akan ditimpa beserta seluruh soalnya.
                    </span>
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="custom-duration"
                    className="block text-xs font-medium text-[var(--muted-foreground)] mb-1"
                  >
                    Durasi (menit)
                  </label>
                  <input
                    id="custom-duration"
                    type="number"
                    min={1}
                    max={300}
                    step={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="input-modern w-full text-xs text-center font-bold"
                  />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    Disimpan sebagai duration_sec ({composition.seconds} detik).
                  </p>
                </div>
              </div>

              <div className="pt-2 pb-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5 pt-3 mb-3">
                  <ListChecks size={15} className="text-[var(--primary)]" />
                  <h3 className="font-semibold text-xs text-[var(--foreground)]">Komposisi Butir Soal</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CountField
                    id="custom-twk"
                    label="TWK"
                    hint="Wawasan kebangsaan"
                    value={twkCount}
                    onChange={setTwkCount}
                  />
                  <CountField
                    id="custom-tiu"
                    label="TIU"
                    hint="Penalaran & kuantitatif"
                    value={tiuCount}
                    onChange={setTiuCount}
                  />
                  <CountField
                    id="custom-tkp"
                    label="TKP"
                    hint="Skala 1–5 per opsi"
                    value={tkpCount}
                    onChange={setTkpCount}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer select-none card-subtle p-3 rounded-lg">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 accent-[var(--primary)]"
                />
                <span className="text-xs">
                  <span className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                    <ImageSquare size={14} className="text-[var(--muted-foreground)]" />
                    Sertakan soal figural bergambar (TIU)
                  </span>
                  <span className="block text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                    Sekitar 30% butir TIU diambil dari bank soal bergambar, sisanya dari TIU teks.
                  </span>
                </span>
              </label>
            </fieldset>

            {error && (
              <div
                role="alert"
                className="text-xs p-3 rounded-xl flex items-start gap-2 bg-red-50 text-red-800 border border-red-200"
              >
                <Warning size={16} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <ArrowsClockwise size={14} className="animate-spin" />
                  Menyusun &amp; menyimpan paket...
                </>
              ) : (
                <>
                  <MagicWand size={15} />
                  Generate &amp; Publikasikan Test
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right: Live Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-modern p-6 space-y-4">
            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-[var(--primary)]" />
              <h3 className="font-semibold text-xs text-[var(--foreground)]">Pratinjau Komposisi</h3>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold leading-none text-[var(--foreground)]">
                  {composition.total}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-1">butir soal</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {formatDuration(composition.minutes)}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  {composition.seconds} detik
                </p>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[var(--muted)]">
              <div style={{ width: `${share(composition.twk)}%`, backgroundColor: 'var(--primary)' }} />
              <div style={{ width: `${share(composition.tiu)}%`, backgroundColor: '#9c87f5' }} />
              <div style={{ width: `${share(composition.tkp)}%`, backgroundColor: '#b4b2a7' }} />
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: 'TWK', count: composition.twk, color: 'var(--primary)' },
                { label: 'TIU', count: composition.tiu, color: '#9c87f5' },
                { label: 'TKP', count: composition.tkp, color: '#b4b2a7' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.label}
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {row.count} butir
                    <span className="text-[10px] font-normal text-[var(--muted-foreground)] ml-1.5">
                      {Math.round(share(row.count))}%
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="card-subtle p-3 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
              {includeImages && composition.tiu > 0 ? (
                <p>
                  TIU akan memuat sekitar {Math.floor(composition.tiu * 0.3)} butir bergambar,
                  sisanya TIU teks.
                </p>
              ) : (
                <p>Soal figural tidak disertakan — seluruh TIU diambil dari bank teks.</p>
              )}
              <p className="mt-1.5">
                Bila stok suatu kategori kurang, server memakai butir yang tersedia sehingga
                paket bisa lebih kecil dari komposisi ini.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success */}
      {created && (
        <div className="card-modern p-6 space-y-4 border-2 border-[var(--primary)]">
          <div className="flex items-start gap-3">
            <CheckCircle size={22} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Paket berhasil dibuat</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {created.title} tersimpan{' '}
                {created.savedTo === 'database' ? 'di database' : `di ${created.savedTo}`} dan bisa
                dibuka lewat tautan di bawah.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total soal', value: String(created.totalQuestions) },
              { label: 'TWK / TIU / TKP', value: `${created.twk} / ${created.tiu} / ${created.tkp}` },
              { label: 'Bergambar', value: String(created.withImages) },
              { label: 'Durasi', value: formatDuration(created.durationMinutes) },
            ].map((stat) => (
              <div key={stat.label} className="card-subtle p-3">
                <p className="text-[10px] text-[var(--muted-foreground)]">{stat.label}</p>
                <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/simulasi/${created.packageId}`}
              target="_blank"
              className="btn-primary text-xs py-2 px-4"
            >
              <ArrowSquareOut size={14} />
              Buka Simulasi
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setError('');
              }}
              className="btn-secondary text-xs py-2 px-3"
            >
              Buat Paket Lain
            </button>
            <span className="text-[10px] font-mono text-[var(--muted-foreground)] break-all">
              {created.packageId}
            </span>
          </div>

          <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
            Paket custom ikut muncul di katalog /simulasi dan diperlakukan sebagai paket berbayar —
            tautan di atas baru terbuka untuk akun yang punya akses PRO atau sudah membeli paket ini.
          </p>
        </div>
      )}
    </div>
  );
}
