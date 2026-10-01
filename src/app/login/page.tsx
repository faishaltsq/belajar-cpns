'use client';

import React, { useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Envelope, Lock, ArrowRight, ShieldCheck, Eye, EyeSlash,
  ChartLineUp, Trophy, Brain, SpinnerGap, User, CheckCircle
} from '@phosphor-icons/react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('redirect') || '/simulasi/tryout-1';
  const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/simulasi/tryout-1';

  // step: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ];

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // DAFTAR → kirim OTP ke email
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mendaftar.');

        setStep('otp');
      } else {
        // LOGIN → langsung set cookie
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal masuk.');
        router.push(redirect);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) return setError('Masukkan 6 digit kode OTP.');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode OTP tidak valid.');
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: ChartLineUp, text: 'Simpan otomatis riwayat tryout & grafik progres' },
    { icon: Trophy, text: 'Bandingkan ranking dengan peserta nasional' },
    { icon: Brain, text: 'Akses penuh seluruh modul psikotes' },
  ];

  // ── STEP OTP ──────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <span className="font-bold text-xl text-[var(--foreground)]">
              Lolos<span style={{ color: 'var(--primary)' }}>.in</span>
            </span>
          </Link>

          <div className="card-modern p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-[var(--muted)] mb-3">
                <CheckCircle size={28} weight="duotone" style={{ color: 'var(--primary)' }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Verifikasi Email
              </h1>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Kode 6-digit dikirim ke <strong>{email}</strong>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Berlaku 10 menit. Cek folder Spam jika tidak masuk.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP Input boxes */}
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white outline-none transition"
                    style={{
                      borderColor: digit ? 'var(--primary)' : 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otpDigits.join('').length < 6}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {loading ? (
                  <><SpinnerGap size={16} weight="bold" className="animate-spin" /><span>Memverifikasi...</span></>
                ) : (
                  <><span>Verifikasi &amp; Masuk</span><ArrowRight size={16} weight="bold" /></>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              Email tidak masuk?{' '}
              <button
                type="button"
                onClick={() => { setStep('form'); setOtpDigits(['', '', '', '', '', '']); setError(''); }}
                className="text-[var(--foreground)] underline font-medium hover:opacity-80"
              >
                Kembali &amp; coba lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP FORM ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
          <span className="font-bold text-xl text-[var(--foreground)]">
            Lolos<span style={{ color: 'var(--primary)' }}>.in</span>
          </span>
        </Link>

        <div className="card-modern p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-[var(--muted)] text-[var(--foreground)] mb-3">
              <ShieldCheck size={28} weight="duotone" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Lolos.in'}
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Gunakan email &amp; password untuk menyimpan progres belajar
            </p>
          </div>

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
                <div className="relative">
                  <User size={16} className="text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="input-modern w-full !pl-10 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Envelope size={16} className="text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  className="input-modern w-full !pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Password{isRegister && <span className="text-[var(--muted-foreground)] font-normal"> (Min. 6 karakter)</span>}
              </label>
              <div className="relative">
                <Lock size={16} className="text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="input-modern w-full !pl-10 !pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2"
            >
              {loading ? (
                <><SpinnerGap size={16} weight="bold" className="animate-spin" /><span>Memproses...</span></>
              ) : (
                <><span>{isRegister ? 'Daftar & Kirim OTP' : 'Masuk Akun'}</span><ArrowRight size={16} weight="bold" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); setPassword(''); }}
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
