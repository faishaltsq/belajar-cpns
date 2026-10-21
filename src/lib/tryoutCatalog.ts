/**
 * The catalog: which packages exist, what they cost in time and butir, and how
 * they are grouped on /simulasi.
 *
 * Split out of loadPackage.ts so that copy, metadata and the catalog pages can
 * read TRYOUT_LIST without dragging in the question loader — which pulls
 * `getDb()` and `@neondatabase/serverless` — into a client bundle. Nothing here
 * touches the database or the filesystem; it is static data plus derivations.
 */

export type TryoutSection = 'starter' | 'standard' | 'special' | 'hots' | 'drill';

export interface PkgItem {
  id: string;
  label: string;
  desc: string;
  badge: string | null;
  section: TryoutSection;
  questionCount: number;
  durationMin: number;
}

export const SECTION_META: Record<TryoutSection, { title: string; iconName: string }> = {
  starter:  { title: 'Uji Coba & Gratis',              iconName: 'Gift' },
  standard: { title: 'Standar CAT BKN',                 iconName: 'Certificate' },
  special:  { title: 'Spesialisasi & Bergambar',         iconName: 'ImageSquare' },
  hots:     { title: 'Tantangan HOTS',                   iconName: 'Brain' },
  drill:    { title: 'Latihan Intensif Mandiri',         iconName: 'Barbell' },
};

export const TRYOUT_LIST: PkgItem[] = [
  // ── starter ──
  { id: 'tryout-mini', label: 'Tryout Mini', desc: 'Uji coba cepat 30 soal (10 TWK, 10 TIU, 10 TKP) + soal figural bergambar', badge: null, section: 'starter', questionCount: 30, durationMin: 30 },
  { id: 'tryout-1', label: 'Tryout 1', desc: 'Paket soal perdana — TWK, TIU, TKP standar BKN', badge: null, section: 'starter', questionCount: 110, durationMin: 100 },
  { id: 'tryout-2', label: 'Tryout 2', desc: 'Fokus Pancasila, analogi verbal, dan TKP integritas', badge: null, section: 'starter', questionCount: 110, durationMin: 100 },
  // ── standard ──
  { id: 'tryout-3', label: 'Tryout 3', desc: 'Soal UUD 1945, penalaran induktif, dan bela negara', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-4', label: 'Tryout 4', desc: 'Wawasan NKRI, sinonim/antonim, dan TKP orientasi', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-5', label: 'Tryout 5', desc: 'Sejarah Indonesia, kuantitatif, dan TKP adaptasi', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-6', label: 'Tryout 6', desc: 'Bhinneka Tunggal Ika, deduktif, dan kepemimpinan', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-7', label: 'Tryout 7', desc: 'Pilar Kebangsaan, silogisme, dan TKP jejaring kerja', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  // ── special (100% figural bergambar — murni soal bergambar) ──
  { id: 'tryout-figural', label: 'Tryout Figural Khusus I', desc: '46 butir soal murni figural bergambar: Analogi, Ketidaksamaan, dan Serial Pola BKN', badge: 'Bergambar', section: 'special', questionCount: 46, durationMin: 45 },
  { id: 'tryout-figural-2', label: 'Tryout Figural Khusus II', desc: '82 butir soal murni figural: Serial Pola, Persamaan Gambar, Jaring-jaring Ruang 3D, & Rotasi', badge: 'Terbaru', section: 'special', questionCount: 82, durationMin: 80 },
  // ── standard (110 soal CAT BKN — bukan murni figural) ──
  { id: 'tryout-8', label: 'Tryout 8', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-9', label: 'Tryout 9', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-10', label: 'Tryout 10', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-11', label: 'Tryout 11', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-12', label: 'Tryout 12', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-13', label: 'Tryout 13', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-14', label: 'Tryout 14', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-15', label: 'Tryout 15', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-16', label: 'Tryout 16', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  { id: 'tryout-17', label: 'Tryout 17', desc: 'Standar CAT BKN — 30 TWK, 35 TIU, 45 TKP', badge: null, section: 'standard', questionCount: 110, durationMin: 100 },
  // ── hots ──
  { id: 'tryout-18', label: 'Tryout 18 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-19', label: 'Tryout 19 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-20', label: 'Tryout 20 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-21', label: 'Tryout 21 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-22', label: 'Tryout 22 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-23', label: 'Tryout 23 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  { id: 'tryout-24', label: 'Tryout 24 (HOTS)', desc: 'Standar CAT BKN — 110 soal HOTS (30 TWK, 35 TIU, 45 TKP)', badge: 'HOTS', section: 'hots', questionCount: 110, durationMin: 100 },
  // ── drill ──
  { id: 'tryout-25', label: 'Tryout 25 (Latihan 1)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-26', label: 'Tryout 26 (Latihan 2)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-27', label: 'Tryout 27 (Latihan 3)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-28', label: 'Tryout 28 (Latihan 4)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-29', label: 'Tryout 29 (Latihan 5)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-30', label: 'Tryout 30 (Latihan 6)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-31', label: 'Tryout 31 (Latihan 7)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-32', label: 'Tryout 32 (Latihan 8)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-33', label: 'Tryout 33 (Latihan 9)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
  { id: 'tryout-34', label: 'Tryout 34 (Latihan 10)', desc: 'Standar CAT BKN — 110 soal (30 TWK, 35 TIU, 45 TKP)', badge: 'Latihan', section: 'drill', questionCount: 110, durationMin: 100 },
];

/** Total paket tryout yang tersedia di platform (dinamis dari TRYOUT_LIST) */
export const TOTAL_TRYOUT_PACKAGES = TRYOUT_LIST.length;

/** Total paket standar berformat CAT BKN 110 soal (tryout-1 s.d. tryout-34) */
export const TOTAL_STANDARD_PACKAGES = TRYOUT_LIST.filter(p => p.questionCount === 110).length;

/** Label rentang tryout standar untuk teks UI (misal: "Tryout 1–34") */
export const TRYOUT_STANDARD_RANGE = (() => {
  const std = TRYOUT_LIST.filter(p => /^tryout-\d+$/.test(p.id))
    .map(p => parseInt(p.id.replace('tryout-', ''), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  if (std.length === 0) return 'Semua Tryout';
  return `Tryout ${std[0]}–${std[std.length - 1]}`;
})();
