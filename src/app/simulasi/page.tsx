'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen, Timer, Target, ArrowRight, Lock, Crown,
  MagnifyingGlass, X, Gift, Certificate, ImageSquare, Brain, Barbell,
  ListBullets, Play
} from '@phosphor-icons/react';
import { TRYOUT_LIST, SECTION_META, type TryoutSection, type PkgItem } from '@/lib/loadPackage';
import { UpgradeProModal } from '@/components/UpgradeProModal';
import { useUser } from '@/lib/useUser';
import { scopedKey } from '@/lib/userStorage';

const SECTION_ORDER: TryoutSection[] = ['starter', 'standard', 'special', 'hots', 'drill'];

const SECTION_ICON: Record<TryoutSection, typeof Gift> = {
  starter: Gift,
  standard: Certificate,
  special: ImageSquare,
  hots: Brain,
  drill: Barbell,
};

const TAB_FILTERS: { key: TryoutSection | 'all'; label: string; Icon: typeof ListBullets }[] = [
  { key: 'all', label: 'Semua', Icon: ListBullets },
  { key: 'starter', label: 'Gratis', Icon: Gift },
  { key: 'standard', label: 'Standar BKN', Icon: Certificate },
  { key: 'special', label: 'Figural', Icon: ImageSquare },
  { key: 'hots', label: 'HOTS', Icon: Brain },
  { key: 'drill', label: 'Latihan', Icon: Barbell },
];

function badgeClasses(badge: string | null): string {
  if (!badge) return '';
  switch (badge) {
    case 'Coba Gratis': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'HOTS': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Bergambar': case 'Baru': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Latihan': return 'bg-slate-50 text-slate-600 border-slate-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export default function SimulasiPage() {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [packages, setPackages] = useState<PkgItem[]>(TRYOUT_LIST);
  const [isPro, setIsPro] = useState(false);
  const [unlockedPackages, setUnlockedPackages] = useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState('');
  const [upgradePackageId, setUpgradePackageId] = useState<string | undefined>(undefined);
  const [activeDrafts, setActiveDrafts] = useState<Record<string, { count: number }>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TryoutSection | 'all'>('all');

  const FREE_IDS = new Set(['tryout-mini', 'tryout-1', 'tryout-2']);

  // Deteksi draft aktif untuk setiap paket
  useEffect(() => {
    try {
      const draftsMap: Record<string, { count: number }> = {};
      packages.forEach(pkg => {
        const answersKey = scopedKey(`exam_answers_${pkg.id}`, userId);
        const modeKey = scopedKey(`exam_mode_${pkg.id}`, userId);
        const savedMode = localStorage.getItem(modeKey);
        // Hanya mode practice (atau legacy tanpa mode) yang bisa dilanjutkan
        if (savedMode === 'official') return;

        const raw = localStorage.getItem(answersKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
          if (count > 0) {
            draftsMap[pkg.id] = { count };
          }
        }
      });
      setActiveDrafts(draftsMap);
    } catch {}
  }, [packages, userId]);

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.json())
      .then(d => { if (d.packages?.length) setPackages(d.packages); })
      .catch(() => null);
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

  const filtered = useMemo(() => {
    let list = packages.map(p => ({ ...p, section: p.section || ('standard' as TryoutSection) }));
    if (activeTab !== 'all') list = list.filter(p => p.section === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    }
    return list;
  }, [packages, activeTab, searchQuery]);

  const grouped = useMemo(() => {
    const map: Partial<Record<TryoutSection, PkgItem[]>> = {};
    for (const pkg of filtered) {
      if (!map[pkg.section]) map[pkg.section] = [];
      map[pkg.section]!.push(pkg);
    }
    return map;
  }, [filtered]);

  const isSearching = searchQuery.trim().length > 0 || activeTab !== 'all';

  function renderCard(pkg: PkgItem) {
    const isLocked = !isPro && !FREE_IDS.has(pkg.id) && !unlockedPackages.includes(pkg.id);

    const infoPill = (
      <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
        <BookOpen size={12} weight="duotone" />
        {pkg.questionCount || 110} Soal
        <span className="opacity-40">·</span>
        <Timer size={12} weight="duotone" />
        {pkg.durationMin || 100} Mnt
      </span>
    );

    if (isLocked) {
      return (
        <div
          key={pkg.id}
          onClick={() => {
            setUpgradeTrigger(pkg.label);
            setUpgradePackageId(pkg.id);
            setUpgradeOpen(true);
          }}
          className="card-modern p-4 sm:p-5 group block cursor-pointer opacity-85 hover:opacity-100 relative overflow-hidden transition"
        >
          <div className="flex items-start justify-between mb-1.5">
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-1.5">
              {pkg.label}
            </h3>
            <span className="badge-pill text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1 shrink-0">
              <Lock size={10} weight="bold" />
              PRO
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-2.5 leading-relaxed line-clamp-2">{pkg.desc}</p>
          <div className="flex items-center justify-between">
            {infoPill}
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              Buka Akses
              <ArrowRight size={12} weight="bold" />
            </span>
          </div>
        </div>
      );
    }

    const hasDraft = !!activeDrafts[pkg.id];
    const draftCount = activeDrafts[pkg.id]?.count ?? 0;

    return (
      <Link
        key={pkg.id}
        href={`/simulasi/${pkg.id}`}
        className="card-modern p-4 sm:p-5 group block transition"
      >
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-semibold text-sm text-[var(--foreground)] group-hover:opacity-70 transition-opacity">
            {pkg.label}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {FREE_IDS.has(pkg.id) && (
              <span className="badge-pill text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Gratis
              </span>
            )}
            {hasDraft && (
              <span className="badge-pill text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Draft: {draftCount} Soal
              </span>
            )}
            {pkg.badge && (
              <span className={`badge-pill text-[10px] font-semibold border ${badgeClasses(pkg.badge)}`}>
                {pkg.badge}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-2.5 leading-relaxed line-clamp-2">{pkg.desc}</p>
        <div className="flex items-center justify-between">
          {infoPill}
          {hasDraft ? (
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1 group-hover:gap-2 transition-all">
              <Play size={12} weight="fill" />
              Lanjutkan Simulasi
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--foreground)] flex items-center gap-1 group-hover:gap-2 transition-all">
              Mulai Tryout
              <ArrowRight size={12} weight="bold" />
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Info Card */}
        <div className="card-modern p-5 sm:p-8 mb-8">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] mb-1">Simulasi CAT CPNS</h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mb-5 sm:mb-6">
            Format Computer Assisted Test (CAT) sesuai standar BKN — 110 soal, 100 menit.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
            <div className="card-subtle p-3 sm:p-4 text-center">
              <BookOpen size={18} className="mx-auto mb-1 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-lg sm:text-2xl font-bold text-[var(--foreground)]">110</div>
              <div className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] mt-0.5">Soal / Paket</div>
            </div>
            <div className="card-subtle p-3 sm:p-4 text-center">
              <Timer size={18} className="mx-auto mb-1 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-lg sm:text-2xl font-bold text-[var(--foreground)]">100</div>
              <div className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] mt-0.5">Menit</div>
            </div>
            <div className="card-subtle p-3 sm:p-4 text-center">
              <Target size={18} className="mx-auto mb-1 text-[var(--muted-foreground)]" weight="duotone" />
              <div className="text-lg sm:text-2xl font-bold text-[var(--foreground)]">311</div>
              <div className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] mt-0.5">Passing Grade</div>
            </div>
          </div>

          <div className="card-subtle p-3 sm:p-4">
            <h3 className="font-semibold text-xs mb-2 text-[var(--foreground)]">Passing Grade per Kategori</h3>
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

        {/* Search + Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau materi tryout..."
                className="input-modern w-full !pl-9 !pr-8 text-sm py-2"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  title="Hapus pencarian"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
            {!isPro && (
              <button
                onClick={() => { setUpgradeTrigger('Akses Semua Paket'); setUpgradeOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition whitespace-nowrap shrink-0"
              >
                <Crown size={14} weight="fill" className="text-amber-500" />
                <span className="hidden sm:inline">Upgrade PRO</span>
                <span className="sm:hidden">PRO</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {TAB_FILTERS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition shrink-0 ${
                  activeTab === key
                    ? 'bg-[var(--foreground)] text-[var(--background)] border-transparent font-semibold'
                    : 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]'
                }`}
              >
                <Icon size={14} weight={activeTab === key ? 'fill' : 'duotone'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count & Reset */}
        {isSearching && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              Menampilkan {filtered.length} paket
            </span>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="text-xs text-amber-700 font-medium hover:underline"
            >
              Reset filter
            </button>
          </div>
        )}

        {/* Package Grid */}
        {filtered.length === 0 ? (
          <div className="card-modern p-8 text-center">
            <MagnifyingGlass size={32} weight="duotone" className="mx-auto mb-3 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">Paket tidak ditemukan</p>
            <p className="text-xs text-[var(--muted-foreground)]">Coba gunakan kata kunci lain atau pilih tab kategori berbeda.</p>
          </div>
        ) : isSearching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(renderCard)}
          </div>
        ) : (
          <div className="space-y-8">
            {SECTION_ORDER.map(section => {
              const items = grouped[section];
              if (!items?.length) return null;
              const meta = SECTION_META[section];
              const SectionIcon = SECTION_ICON[section];
              return (
                <div key={section}>
                  <div className="flex items-center gap-2 mb-3">
                    <SectionIcon size={18} weight="duotone" className="text-[var(--foreground)]" />
                    <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">{meta.title}</h2>
                    <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full font-medium">
                      {items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(renderCard)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
