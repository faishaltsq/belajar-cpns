'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignOut, User } from '@phosphor-icons/react';

interface MePayload {
  phone?: string;
  name?: string;
}

export default function Navbar() {
  const [user, setUser] = useState<MePayload | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .finally(() => setChecked(true));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  }

  return (
    <div className="px-4">
      <nav className="clay-card-flat mx-auto max-w-6xl my-4 px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-2xl bg-purple-500 flex items-center justify-center font-bold text-white text-sm"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.9)' }}
          >
            C
          </div>
          <span className="font-bold text-lg text-slate-800">CPNSMaster</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden sm:flex items-center gap-6 text-sm text-slate-600 font-medium">
          <Link href="/" className="hover:text-purple-600 transition">Beranda</Link>
          <Link href="/simulasi" className="hover:text-purple-600 transition">Simulasi CAT</Link>
          <Link href="/psikotes" className="hover:text-purple-600 transition">Tes Psikotes</Link>
        </div>

        {/* Auth area */}
        {checked && (
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:flex items-center gap-1 text-sm text-slate-600 px-3 py-1.5 clay-card-flat rounded-xl">
                  <User size={14} weight="fill" className="text-purple-500" />
                  {user.name ?? user.phone ?? 'Pengguna'}
                </span>
                <button
                  onClick={logout}
                  className="clay-button text-sm bg-white/60 text-slate-600 hover:text-red-500 px-3 py-1.5 flex items-center gap-1"
                >
                  <SignOut size={14} weight="bold" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 transition">
                  Masuk
                </Link>
                <Link
                  href="/simulasi/tryout-1"
                  className="clay-button text-sm bg-purple-500 hover:bg-purple-400 text-white px-4 py-1.5"
                >
                  Mulai Gratis
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
