'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Smartphone, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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

      router.push('/simulasi/tryout-1');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm group-hover:bg-blue-500 transition">
            C
          </div>
          <span className="font-bold text-lg text-zinc-100">CPNSMaster</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-500 mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRegister ? 'Daftar Akun Baru' : 'Masuk ke CPNSMaster'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Nomor HP &amp; PIN 6-digit — tanpa verifikasi SMS berbayar
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nomor Handphone
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  required
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-xs font-medium text-zinc-300 mb-1.5">
                PIN Keamanan (6 Digit)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500 transition font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition mt-2"
            >
              <span>{loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk Akun'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); setPin(''); }}
              className="text-blue-400 hover:underline font-medium"
            >
              {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Dengan masuk, Anda menyetujui penggunaan data sesuai kebijakan privasi platform ini.
        </p>
      </div>
    </div>
  );
}
