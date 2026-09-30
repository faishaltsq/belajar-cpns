'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, Lock, ArrowRight, ShieldCheck, Eye, EyeSlash, ChartLineUp, Trophy, Brain, SpinnerGap } from '@phosphor-icons/react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('redirect') || '/simulasi/tryout-1';
  const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/simulasi/tryout-1';
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, name: name || undefined }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan. Silakan coba lagi.');
      }

      router.push(redirect);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: ChartLineUp, text: 'Simpan otomatis riwayat tryout & grafik progres' },
    { icon: Trophy, text: 'Bandingkan ranking dengan peserta nasional' },
    { icon: Brain, text: 'Akses penuh seluruh modul psikotes' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center font-bold text-[var(--primary-foreground)] text-sm transition">
            C
          </div>
          <span className="font-bold text-lg text-[var(--foreground)]">CPNSMaster</span>
        </Link>

        <div className="card-modern p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-[var(--muted)] text-[var(--foreground)] mb-3">
              <ShieldCheck size={28} weight="duotone" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke CPNSMaster'}
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Nomor HP &amp; PIN 6-digit — tanpa verifikasi SMS berbayar
            </p>
          </div>

          {/* Benefits showcase */}
          <div className="mb-6 space-y-2">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] card-subtle rounded-xl px-3.5 py-2.5">
                <Icon size={18} weight="duotone" className="text-[var(--foreground)] shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="input-modern w-full text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Nomor Handphone
              </label>
              <div className="relative">
                <Phone size={16} className="text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  required
                  autoComplete="tel"
                  className="input-modern w-full pl-10 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                PIN Keamanan (6 Digit)
              </label>
              <div className="relative">
                <Lock size={16} className="text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                <input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  className="input-modern w-full pl-10 pr-11 text-sm font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2"
            >
              {loading ? (
                <>
                  <SpinnerGap size={16} weight="bold" className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Daftar Sekarang' : 'Masuk Akun'}</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); setPin(''); }}
              className="text-[var(--foreground)] underline font-medium hover:opacity-80"
            >
              {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Dengan masuk, Anda menyetujui penggunaan data sesuai kebijakan privasi platform ini.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
