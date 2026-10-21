import { Question } from '@/lib/types';
import { getDb } from '@/lib/db';

// Helper: replace static figural image paths with DB data-URL overrides (from admin crop editor)
export function normalizeQuestionScores(questions: Question[]): Question[] {
  return questions.map((q) => {
    if (q.category === 'TKP' && Array.isArray(q.options) && q.options.length === 5) {
      const scores = q.options.map((o) => (typeof o.score === 'number' ? o.score : 0));
      const isClean = scores.slice().sort((a, b) => a - b).join(',') === '1,2,3,4,5';
      if (!isClean) {
        // Deterministically rank options preserving original relative weight
        const sortedIndices = [0, 1, 2, 3, 4].sort((i, j) => {
          const diff = scores[i] - scores[j];
          return diff !== 0 ? diff : i - j;
        });
        const newOptions = q.options.map((o) => ({ ...o }));
        sortedIndices.forEach((origIdx, rankIdx) => {
          newOptions[origIdx].score = rankIdx + 1; // 1 to 5
        });
        return { ...q, options: newOptions };
      }
    }
    return q;
  });
}

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
  'tryout-18': () => import('@/data/packages/tryout-18.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-19': () => import('@/data/packages/tryout-19.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-20': () => import('@/data/packages/tryout-20.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-21': () => import('@/data/packages/tryout-21.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-22': () => import('@/data/packages/tryout-22.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-23': () => import('@/data/packages/tryout-23.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-24': () => import('@/data/packages/tryout-24.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-25': () => import('@/data/packages/tryout-25.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-26': () => import('@/data/packages/tryout-26.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-27': () => import('@/data/packages/tryout-27.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-28': () => import('@/data/packages/tryout-28.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-29': () => import('@/data/packages/tryout-29.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-30': () => import('@/data/packages/tryout-30.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-31': () => import('@/data/packages/tryout-31.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-32': () => import('@/data/packages/tryout-32.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-33': () => import('@/data/packages/tryout-33.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-34': () => import('@/data/packages/tryout-34.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-mini': () => import('@/data/packages/tryout-mini.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-figural': () => import('@/data/packages/tryout-figural.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-figural-2': () => import('@/data/packages/tryout-figural-2.json').then((m) => m.default as unknown as Question[]).catch(() => []),
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
        return normalizeQuestionScores(await applyFiguralOverrides(normalized as unknown as Question[]));
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
    return normalizeQuestionScores(await applyFiguralOverrides(questions));
  } catch {
    return [];
  }
}


// Catalog metadata (TRYOUT_LIST, SECTION_META, section ranges) lives in
// ./tryoutCatalog — pure data with no database import. Re-exported here so
// existing `from '@/lib/loadPackage'` imports keep working.
export * from './tryoutCatalog';
