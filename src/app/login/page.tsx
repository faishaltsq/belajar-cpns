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
          <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center font-bold text-white text-sm group-hover:bg-purple-400 transition"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.9)' }}>
            C
          </div>
          <span className="font-bold text-lg text-slate-800">CPNSMaster</span>
        </Link>

        <div className="clay-card p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-purple-100 text-purple-500 mb-3">
              <ShieldCheck size={32} weight="duotone" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke CPNSMaster'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Nomor HP &amp; PIN 6-digit — tanpa verifikasi SMS berbayar
            </p>
          </div>

          {/* Benefits showcase */}
          <div className="mb-6 space-y-2.5">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-600 clay-card-flat rounded-xl px-4 py-2.5">
                <Icon size={20} weight="duotone" className="text-purple-500 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="clay-input w-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-slate-600 mb-1.5">
                Nomor Handphone
              </label>
              <div className="relative">
                <Phone size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  required
                  autoComplete="tel"
                  className="clay-input w-full pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-xs font-medium text-slate-600 mb-1.5">
                PIN Keamanan (6 Digit)
              </label>
              <div className="relative">
                <Lock size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" weight="duotone" />
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
                  className="clay-input w-full pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition mt-2 clay-button"
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

          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); setPin(''); }}
              className="text-purple-500 hover:underline font-medium"
            >
              {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
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
