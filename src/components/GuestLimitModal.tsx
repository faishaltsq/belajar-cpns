'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LockKey,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkle,
} from '@phosphor-icons/react';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose?: () => void;
  featureName?: string;
  title?: string;
  description?: string;
  redirectUrl?: string;
}

export function GuestLimitModal({
  isOpen,
  onClose,
  featureName = 'Fitur Belajar',
  title,
  description,
  redirectUrl,
}: GuestLimitModalProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const resolvedRedirect = redirectUrl || pathname || '/';
  const loginUrl = `/login?redirect=${encodeURIComponent(resolvedRedirect)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="card-modern max-w-md w-full p-6 text-center space-y-5 relative bg-[var(--card)] shadow-2xl border border-gray-100">
        {/* Tombol Close jika onClose disediakan */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="Tutup"
          >
            <XCircle size={22} weight="bold" />
          </button>
        )}

        {/* Icon Header */}
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
          style={{ background: '#c96442' }}
        >
          <LockKey size={28} weight="fill" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 inline-block">
            {featureName}
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            {title || `Buka Akses Penuh ${featureName}`}
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            {description ||
              `Kamu telah mencoba fitur ini. Masuk atau buat akun gratis dalam 30 detik untuk membuka seluruh fitur, menyimpan riwayat, dan melacak progres belajarmu.`}
          </p>
        </div>

        {/* Value Prop Benefits */}
        <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-left space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800">
            <Sparkle size={15} weight="fill" className="text-orange-600" />
            <span>Kenapa Harus Buat Akun?</span>
          </div>
          <ul className="text-[11px] text-gray-600 space-y-1 pl-5 list-disc">
            <li>Akses semua topik latihan kilat &amp; bank soal lengkap</li>
            <li>Progres roadmap 30 hari &amp; streak tersimpan permanen</li>
            <li>Riwayat skor, evaluasi kelemahan, dan flashcard terisolasi</li>
            <li>100% Gratis dan daftar hanya butuh hitungan detik</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={loginUrl}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 shadow-sm transition hover:opacity-90"
            style={{ background: '#c96442' }}
          >
            <span>Daftar / Masuk Akun Gratis</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition"
            >
              Nanti Saja
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
