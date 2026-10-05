import { Question } from '@/lib/types';
import { getDb } from '@/lib/db';

// Helper: replace static figural image paths with DB data-URL overrides (from admin crop editor)
async function applyFiguralOverrides(questions: Question[]): Promise<Question[]> {
  const sql = getDb();
  if (!sql) return questions;
  const needsOverride = questions.some(
    (q) => typeof q.image === 'string' && q.image.includes('/images/questions/fig_')
  );
  if (!needsOverride) return questions;
  try {
    const rows = await sql`
      SELECT number, image FROM questions
      WHERE package_id = 'tryout-figural'
        AND image LIKE 'data:image/%'
    `;
    if (!rows || rows.length === 0) return questions;
    const overrideMap = new Map<string, string>();
    for (const r of rows) {
      const num = (r as { number: number }).number;
      let fname = '';
      if (num >= 1 && num <= 17)  fname = `fig_analogi_${String(num).padStart(2, '0')}.png`;
      if (num >= 18 && num <= 31) fname = `fig_ketidaksamaan_${String(num - 17).padStart(2, '0')}.png`;
      if (num >= 32 && num <= 46) fname = `fig_serial_${String(num - 31).padStart(2, '0')}.png`;
      if (fname) overrideMap.set(fname, (r as { image: string }).image);
    }
    if (overrideMap.size === 0) return questions;
    return questions.map((q) => {
      if (!q.image || !String(q.image).includes('/images/questions/fig_')) return q;
      const fname = String(q.image).split('/').pop()?.split('?')[0];
      const override = fname ? overrideMap.get(fname) : undefined;
      return override ? { ...q, image: override } : q;
    });
  } catch {
    return questions;
  }
}

const STATIC_PACKAGES: Record<string, () => Promise<Question[]>> = {
  'tryout-1': () => import('@/data/sample_questions.json').then((m) => m.default as unknown as Question[]),
  'tryout-2': () => import('@/data/packages/tryout-2.json').then((m) => m.default as unknown as Question[]),
  'tryout-3': () => import('@/data/packages/tryout-3.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-4': () => import('@/data/packages/tryout-4.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-5': () => import('@/data/packages/tryout-5.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-6': () => import('@/data/packages/tryout-6.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-7': () => import('@/data/packages/tryout-7.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-8': () => import('@/data/packages/tryout-8.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-9': () => import('@/data/packages/tryout-9.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-10': () => import('@/data/packages/tryout-10.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-11': () => import('@/data/packages/tryout-11.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-12': () => import('@/data/packages/tryout-12.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-13': () => import('@/data/packages/tryout-13.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-14': () => import('@/data/packages/tryout-14.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-15': () => import('@/data/packages/tryout-15.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-16': () => import('@/data/packages/tryout-16.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-17': () => import('@/data/packages/tryout-17.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-mini': () => import('@/data/packages/tryout-mini.json').then((m) => m.default as unknown as Question[]).catch(() => []),
};

export async function loadPackage(id: string): Promise<Question[]> {
  // 1. Coba baca dari Database Neon terlebih dahulu (cocok untuk custom package yang baru di-generate)
  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT number as id, category, text, image, options,
               correct_answer as "correctAnswer", tkp_scores as "tkpScores",
               explanation, difficulty
        FROM questions
        WHERE package_id = ${id}
        ORDER BY number ASC
      `;
      if (rows && rows.length > 0) {
        // Normalize options: DB may store string[] or Option[] with no scores
        const normalized = (rows as Record<string, unknown>[]).map((row) => {
          const opts = row.options;
          const correctIdx = parseInt(String(row.correctAnswer ?? '-1'), 10);
          const LETTERS = ['A', 'B', 'C', 'D', 'E'];
          const hasCorrectIdx = !isNaN(correctIdx) && correctIdx >= 0;
          if (Array.isArray(opts) && opts.length > 0) {
            if (typeof opts[0] === 'string') {
              // string[] → Option[]
              row.options = (opts as string[]).map((text: string, i: number) => ({
                id: LETTERS[i] || String(i + 1),
                text: text || `Pilihan ${LETTERS[i] || i + 1}`,
                score: hasCorrectIdx ? (i === correctIdx ? 5 : 0) : 0,
              }));
            } else if (hasCorrectIdx) {
              // Option[] with correctAnswer — set score from index
              row.options = (opts as { id: string; text: string; score: number }[]).map((opt, i) => ({
                ...opt,
                score: i === correctIdx ? 5 : 0,
              }));
            }
            // else: Option[] without correctAnswer → preserve as-is
          }
          return row;
        });
        return await applyFiguralOverrides(normalized as unknown as Question[]);
      }
    } catch {
      // Fallback ke file lokal jika query gagal
    }
  }

  // 2. Fallback ke file JSON statis, lalu apply override gambar figural dari DB
  const loader = STATIC_PACKAGES[id];
  if (!loader) return [];
  try {
    const questions = await loader();
    return await applyFiguralOverrides(questions);
  } catch {
    return [];
  }
}

export const TRYOUT_LIST = [
  { id: 'tryout-mini', label: 'Tryout Mini', desc: 'Uji coba cepat 30 soal (10 TWK, 10 TIU, 10 TKP) + soal figural bergambar', badge: 'Coba Gratis' },
  { id: 'tryout-figural', label: 'Tryout Figural Khusus', desc: '46 soal penalaran figural bergambar: Analogi, Ketidaksamaan, dan Serial Pola resmi', badge: 'Spesial Bergambar' },
  { id: 'tryout-1', label: 'Tryout 1', desc: 'Paket soal perdana — TWK, TIU, TKP standar BKN', badge: null },
  { id: 'tryout-2', label: 'Tryout 2', desc: 'Fokus Pancasila, analogi verbal, dan TKP integritas', badge: null },
  { id: 'tryout-3', label: 'Tryout 3', desc: 'Soal UUD 1945, penalaran induktif, dan bela negara', badge: null },
  { id: 'tryout-4', label: 'Tryout 4', desc: 'Wawasan NKRI, sinonim/antonim, dan TKP orientasi', badge: null },
  { id: 'tryout-5', label: 'Tryout 5', desc: 'Sejarah Indonesia, kuantitatif, dan TKP adaptasi', badge: null },
  { id: 'tryout-6', label: 'Tryout 6', desc: 'Bhinneka Tunggal Ika, deduktif, dan kepemimpinan', badge: null },
  { id: 'tryout-7', label: 'Tryout 7', desc: 'Pilar Kebangsaan, silogisme, dan TKP jejaring kerja', badge: null },
  { id: 'tryout-8', label: 'Tryout 8', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-9', label: 'Tryout 9', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-10', label: 'Tryout 10', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-11', label: 'Tryout 11', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-12', label: 'Tryout 12', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-13', label: 'Tryout 13', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-14', label: 'Tryout 14', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-15', label: 'Tryout 15', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-16', label: 'Tryout 16', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-17', label: 'Tryout 17', desc: 'Standar CAT BKN — 110 soal resmi + 12 soal figural bergambar', badge: 'Baru' },
  { id: 'tryout-18', label: 'Tryout 18 (HOTS)', desc: 'Bank Soal HOTS — 110 soal TWK, TIU, TKP level Higher Order Thinking', badge: 'Bank Soal' },
  { id: 'tryout-19', label: 'Tryout 19 (HOTS)', desc: 'Bank Soal HOTS — 115 soal TWK & TIU level analisis dan evaluasi', badge: 'Bank Soal' },
  { id: 'tryout-20', label: 'Tryout 20 (HOTS)', desc: 'Bank Soal HOTS — 110 soal TWK & TIU referensi soal unggulan', badge: 'Bank Soal' },
  { id: 'tryout-21', label: 'Tryout 21 (HOTS)', desc: 'Bank Soal HOTS — 110 soal TWK & TIU referensi soal unggulan', badge: 'Bank Soal' },
  { id: 'tryout-22', label: 'Tryout 22 (HOTS)', desc: 'Bank Soal HOTS — 110 soal TWK & TIU referensi soal unggulan', badge: 'Bank Soal' },
  { id: 'tryout-23', label: 'Tryout 23 (HOTS)', desc: 'Bank Soal HOTS — 96 soal TWK & TIU referensi soal unggulan', badge: 'Bank Soal' },
  { id: 'tryout-24', label: 'Tryout 24 (HOTS)', desc: 'Bank Soal HOTS — 33 soal TWK level analisis mendalam', badge: 'Bank Soal' },
  { id: 'tryout-25', label: 'Tryout 25 (Latihan 1)', desc: 'Paket Latihan SKD 1 — 98 soal TWK, TIU, TKP terverifikasi kunci', badge: 'Latihan' },
  { id: 'tryout-26', label: 'Tryout 26 (Latihan 2)', desc: 'Paket Latihan SKD 2 — soal TWK, TIU, TKP terverifikasi kunci', badge: 'Latihan' },
  { id: 'tryout-27', label: 'Tryout 27 (Latihan 3)', desc: 'Paket Latihan SKD 3 — soal TWK, TIU, TKP terverifikasi kunci', badge: 'Latihan' },
  { id: 'tryout-28', label: 'Tryout 28 (Latihan 4)', desc: 'Paket Latihan SKD 4 — soal TWK, TIU, TKP terverifikasi kunci', badge: 'Latihan' },
  { id: 'tryout-29', label: 'Tryout 29 (Latihan 5)', desc: 'Paket Latihan SKD 5 — soal TWK, TIU, TKP terverifikasi kunci', badge: 'Latihan' },
];
