'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Trophy,
  ClockCounterClockwise,
  CheckCircle,
  Crown,
  ArrowRight,
  Lock,
  Eye,
  EyeSlash,
  SignOut,
  FloppyDisk,
  Spinner,
  CheckFat,
  XCircle,
} from '@phosphor-icons/react';
import { useUser } from '@/lib/useUser';

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  isPro: boolean;
  proActivatedAt: string | null;
  createdAt: string;
  targetInstansi: string | null;
  targetFormasi: string | null;
}

interface Stats {
  totalExams: number;
  avgScore: number;
  highestScore: number;
  passCount: number;
  passRate: number;
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
        type === 'ok'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {type === 'ok' ? <CheckFat size={16} weight="fill" /> : <XCircle size={16} weight="fill" />}
      {msg}
    </div>
  );
}

export default function ProfilPage() {
  const { user: sessionUser, loading: sessionLoading, logout } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [targetInstansi, setTargetInstansi] = useState('');
  const [targetFormasi, setTargetFormasi] = useState('');
  const [saving, setSaving] = useState(false);

  // Password states
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      router.replace('/login');
      return;
    }
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile(d.user);
          setStats(d.stats);
          setName(d.user.name ?? '');
          setPhone(d.user.phone ?? '');
          setTargetInstansi(d.user.targetInstansi ?? '');
          setTargetFormasi(d.user.targetFormasi ?? '');
        }
      })
      .finally(() => setPageLoading(false));
  }, [sessionUser, sessionLoading, router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Nama minimal 2 karakter', 'err');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone, targetInstansi, targetFormasi }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || 'Gagal menyimpan', 'err'); return; }
      showToast('Profil berhasil disimpan!', 'ok');
      setProfile((p) => p ? { ...p, name: name.trim(), phone, targetInstansi, targetFormasi } : p);
      window.dispatchEvent(new Event('auth-change'));
    } catch {
      showToast('Terjadi kesalahan jaringan', 'err');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast('Konfirmasi password tidak cocok', 'err'); return; }
    if (newPw.length < 6) { showToast('Password baru minimal 6 karakter', 'err'); return; }
    setChangingPw(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || 'Gagal mengubah password', 'err'); return; }
      showToast('Password berhasil diperbarui!', 'ok');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      showToast('Terjadi kesalahan jaringan', 'err');
    } finally {
      setChangingPw(false);
    }
  }

  function getInitials(n: string) {
    return n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return '—'; }
  }

  if (sessionLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-7 h-7 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8">
      <div className="max-w-2xl w-full space-y-5">

        {/* ── HEADER CARD ── */}
        <div className="card-modern p-5">
          <div className="flex items-center gap-4">
            {/* Avatar initials */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white text-xl font-bold shadow-sm"
              style={{ background: 'linear-gradient(135deg, var(--primary), #e07b52)' }}
            >
              {profile?.name ? getInitials(profile.name) : <User size={28} weight="bold" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[var(--foreground)] truncate">
                  {profile?.name || '—'}
                </h1>
                {profile?.isPro ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    <Crown size={10} weight="fill" /> PRO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Akun Gratis
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--muted-foreground)] truncate">{profile?.email}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Bergabung sejak {profile?.createdAt ? fmtDate(profile.createdAt) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── STATISTIK ── */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
            Statistik Belajar
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Tryout', value: stats?.totalExams ?? 0, icon: <ClockCounterClockwise size={18} weight="duotone" className="text-[var(--primary)]" /> },
              { label: 'Rata-rata Skor', value: stats?.avgScore ?? 0, icon: <Trophy size={18} weight="duotone" className="text-amber-500" /> },
              { label: 'Tingkat Lulus', value: `${stats?.passRate ?? 0}%`, icon: <CheckCircle size={18} weight="duotone" className="text-emerald-600" /> },
            ].map((s) => (
              <div key={s.label} className="card-modern p-4 text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-[var(--foreground)]">{s.value}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          {(stats?.totalExams ?? 0) > 0 && (
            <div className="text-center">
              <Link
                href="/riwayat"
                className="inline-flex items-center gap-1 text-xs text-[var(--primary)] font-semibold hover:underline"
              >
                Lihat Riwayat Lengkap <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
          )}
        </div>

        {/* ── PASSING GRADE TRACKER ── */}
        {(stats?.totalExams ?? 0) > 0 && (
          <div className="card-modern p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--foreground)]">Target Lulus SKD</h2>
              <span className="text-[10px] text-[var(--muted-foreground)]">Passing Grade Resmi BKN 2024</span>
            </div>
            {[
              { label: 'TWK', passing: 65, maxScore: 150 },
              { label: 'TIU', passing: 80, maxScore: 175 },
              { label: 'TKP', passing: 166, maxScore: 225 },
            ].map(({ label, passing, maxScore }) => {
              // Estimasi skor per sub-tes dari rata-rata (proporsional dari stats.avgScore/550)
              const ratio = maxScore / 550;
              const estimatedScore = Math.round((stats?.avgScore ?? 0) * ratio);
              const highest = Math.round((stats?.highestScore ?? 0) * ratio);
              const pct = Math.min((highest / maxScore) * 100, 100);
              const passingPct = (passing / maxScore) * 100;
              const isPassed = highest >= passing;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[var(--foreground)]">{label}</span>
                    <span className={isPassed ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                      {highest} / {passing} (passing)
                    </span>
                  </div>
                  <div className="relative rounded-full h-2" style={{ background: 'var(--muted)' }}>
                    {/* Passing grade marker */}
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-slate-400 z-10 rounded-full"
                      style={{ left: `${passingPct}%` }}
                    />
                    {/* Progress bar */}
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isPassed ? '#059669' : '#c96442',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-[var(--muted-foreground)] pt-1">
              Estimasi berdasarkan skor tertinggi tryout kamu. Skor aktual tiap sub-tes terlihat di detail hasil tryout.
            </p>
          </div>
        )}

        {/* ── FORM PROFIL ── */}
        <div className="card-modern p-5 space-y-4">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Informasi Akun</h2>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            {/* Nama */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            {/* Email — read only */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--muted-foreground)] cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Terverifikasi
                </span>
              </div>
            </div>

            {/* Nomor WA */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Nomor WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            {/* Target Instansi */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Target Instansi</label>
              <input
                type="text"
                value={targetInstansi}
                onChange={(e) => setTargetInstansi(e.target.value)}
                placeholder="Cth: Kementerian Keuangan, Kejaksaan Agung"
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            {/* Target Formasi */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Target Formasi / Jabatan</label>
              <input
                type="text"
                value={targetFormasi}
                onChange={(e) => setTargetFormasi(e.target.value)}
                placeholder="Cth: Analis Kebijakan Pertama, Pranata Komputer"
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {saving ? (
                <Spinner size={16} className="animate-spin" />
              ) : (
                <FloppyDisk size={16} weight="bold" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* ── GANTI PASSWORD ── */}
        <div className="card-modern p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)]">Ubah Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {/* Current password */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Password Saat Ini</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  {showCurrentPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Password Baru</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  {showNewPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Ulangi password baru"
                className={`w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${
                  confirmPw && confirmPw !== newPw ? 'border-red-300' : 'border-[var(--border)]'
                }`}
              />
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
            </div>

            <button
              type="submit"
              disabled={changingPw || !currentPw || !newPw || !confirmPw}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {changingPw ? (
                <Spinner size={16} className="animate-spin" />
              ) : (
                <Lock size={16} weight="bold" />
              )}
              {changingPw ? 'Memproses...' : 'Ubah Password'}
            </button>
          </form>
        </div>

        {/* ── KELUAR ── */}
        <div className="card-modern p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Keluar dari Akun</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Sesi aktif akan dihapus dari perangkat ini.</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <SignOut size={16} weight="bold" />
              Keluar
            </button>
          </div>
        </div>

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
