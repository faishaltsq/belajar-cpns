'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Timer, Target, ArrowRight, Lock, Crown } from '@phosphor-icons/react';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { UpgradeProModal } from '@/components/UpgradeProModal';

type PkgItem = { id: string; label: string; desc: string; badge: string | null };

export default function SimulasiPage() {
  const [packages, setPackages] = useState<PkgItem[]>(TRYOUT_LIST);
  const [isPro, setIsPro] = useState(false);
  const [unlockedPackages, setUnlockedPackages] = useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState('');
  const [upgradePackageId, setUpgradePackageId] = useState<string | undefined>(undefined);

  // Paket yang gratis (tidak terkunci)
  const FREE_IDS = new Set(['tryout-mini', 'tryout-1', 'tryout-2']);

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.json())
      .then(d => { if (d.packages?.length) setPackages(d.packages); })
      .catch(() => null);
    // Cek status PRO & unlocked packages
    fetch('/api/user/status')
      .then(r => r.json())
      .then(d => {
        setIsPro(d.is_pro || false);
        if (Array.isArray(d.unlocked_packages)) {
          setUnlockedPackages(d.unlocked_packages);
        }
      })
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Info Card */}
        <div className="card-modern p-6 sm:p-8 mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-1">Simulasi CAT CPNS</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Format Computer Assisted Test (CAT) sesuai standar BKN — 110 soal, 100 menit.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card-subtle p-4 text-center">
              <BookOpen size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">110</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Soal / Paket</div>
            </div>
            <div className="card-subtle p-4 text-center">
              <Timer size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">100</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Menit</div>
            </div>
            <div className="card-subtle p-4 text-center">
              <Target size={20} className="mx-auto mb-1.5 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-2xl font-bold text-[var(--foreground)]">311</div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Passing Grade</div>
            </div>
          </div>

          <div className="card-subtle p-4">
            <h3 className="font-semibold text-xs mb-2.5 text-[var(--foreground)]">Passing Grade per Kategori</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TWK (30 soal)</span>
                <span className="font-medium text-[var(--foreground)]">65 / 150</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TIU (35 soal)</span>
                <span className="font-medium text-[var(--foreground)]">80 / 175</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TKP (45 soal)</span>
                <span className="font-medium text-[var(--foreground)]">166 / 225</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paket Tryout List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Pilih Paket Tryout</h2>
          {!isPro && (
            <button
              onClick={() => { setUpgradeTrigger('Akses Semua Paket'); setUpgradeOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
            >
              <Crown size={14} weight="fill" className="text-amber-500" />
              Upgrade PRO Rp 49rb
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {packages.map((pkg) => {
            const isLocked = !isPro && !FREE_IDS.has(pkg.id) && !unlockedPackages.includes(pkg.id);

            if (isLocked) {
              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setUpgradeTrigger(pkg.label);
                    setUpgradePackageId(pkg.id);
                    setUpgradeOpen(true);
                  }}
                  className="card-modern p-5 group block cursor-pointer opacity-85 hover:opacity-100 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                      {pkg.label}
                    </h3>
                    <span className="badge-pill text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                      <Lock size={10} weight="bold" />
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">{pkg.desc}</p>
                  <div className="flex items-center text-xs font-semibold text-amber-700">
                    Buka Akses (QRIS Saweria)
                    <ArrowRight size={13} weight="bold" className="ml-1" />
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={pkg.id}
                href={`/simulasi/${pkg.id}`}
                className="card-modern p-5 group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[var(--foreground)] group-hover:opacity-70 transition-opacity">
                    {pkg.label}
                  </h3>
                  {pkg.badge && (
                    <span className="badge-pill text-[10px] badge-neutral">
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mb-3 leading-relaxed">{pkg.desc}</p>
                <div className="flex items-center text-xs font-medium text-[var(--foreground)] group-hover:gap-2 transition-all">
                  Mulai Tryout
                  <ArrowRight size={13} weight="bold" className="ml-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Modal Upgrade */}
        <UpgradeProModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          triggerPackage={upgradeTrigger}
          packageId={upgradePackageId}
        />
      </div>
    </div>
  );
}
