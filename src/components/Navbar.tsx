'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOut, User, List, X, WarningCircle } from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';
import { useState } from 'react';
import { ReportIssueModal } from './ReportIssueModal';
import Logo from './Logo';

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/simulasi', label: 'Simulasi CAT' },
  { href: '/drill', label: 'Latihan Kilat' },
  { href: '/flashcard', label: 'Flashcard' },
  { href: '/journey', label: 'Roadmap' },
  { href: '/psikotes', label: 'Tes Psikotes' },
  { href: '/riwayat', label: 'Riwayat' },
];

export default function Navbar() {
  const { user, loading, logout } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Sembunyikan Navbar HANYA saat pengerjaan ujian aktif, bukan di halaman hasil
  const isActiveExam = Boolean(pathname?.startsWith('/simulasi/') && !pathname?.startsWith('/simulasi/hasil'));
  if (isActiveExam) return null;

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : null;

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(250, 249, 245, 0.92)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(61, 57, 41, 0.04)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth */}
        {!loading && (
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/profil"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname === '/profil'
                      ? 'ring-2 ring-[var(--primary)]/30'
                      : 'hover:opacity-80'
                  }`}
                  style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--primary)' }}
                  >
                    {initials || <User size={10} weight="fill" />}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name ?? user.phone ?? 'Pengguna'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: 'var(--muted-foreground)',
                    boxShadow: '0 0 0 1px var(--border)'
                  }}
                >
                  <SignOut size={14} />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Masuk
                </Link>
                <Link
                  href="/simulasi"
                  className="btn-primary text-sm px-4 py-1.5"
                >
                  Mulai Gratis
                </Link>
              </>
            )}
          </div>
        )}

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 rounded-lg"
          style={{ color: 'var(--muted-foreground)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="sm:hidden px-4 pb-4 pt-2 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              setReportModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left text-amber-700 hover:bg-[var(--muted)] rounded-lg"
          >
            <WarningCircle size={16} weight="bold" /> Laporkan Bug / Bantuan
          </button>
          <div className="h-px my-1" style={{ background: 'var(--border)' }} />
          {user ? (
            <>
              <Link
                href="/profil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                <User size={14} /> Profil Saya
              </Link>
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <SignOut size={14} /> Keluar
            </button>
            </>
          ) : (
            <Link
              href="/simulasi"
              onClick={() => setMobileOpen(false)}
              className="btn-primary text-sm text-center"
            >
              Mulai Gratis
            </Link>
          )}
        </div>
      )}

      <ReportIssueModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </header>
  );
}
