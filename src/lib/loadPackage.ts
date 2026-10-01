import { Question } from '@/lib/types';
import { getDb } from '@/lib/db';

const STATIC_PACKAGES: Record<string, () => Promise<Question[]>> = {
  'tryout-1': () => import('@/data/sample_questions.json').then((m) => m.default as unknown as Question[]),
  'tryout-2': () => import('@/data/packages/tryout-2.json').then((m) => m.default as unknown as Question[]),
  'tryout-3': () => import('@/data/packages/tryout-3.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-4': () => import('@/data/packages/tryout-4.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-5': () => import('@/data/packages/tryout-5.json').then((m) => m.default as unknown as Question[]).catch(() => []),
  'tryout-6': () => import('@/data/packages/tryout-6.json').then((m) => m.default as unknown as Question[]).catch(() => []),
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
        return rows as unknown as Question[];
      }
    } catch {
      // Fallback ke file lokal jika query gagal
    }
  }

  // 2. Fallback ke file JSON statis
  const loader = STATIC_PACKAGES[id];
  if (!loader) return [];
  try {
    return await loader();
  } catch {
    return [];
  }
}

export const TRYOUT_LIST = [
  { id: 'tryout-mini', label: 'Tryout Mini', desc: 'Uji coba cepat 30 soal (10 TWK, 10 TIU, 10 TKP) + soal figural bergambar', badge: 'Coba Gratis' },
  { id: 'tryout-figural', label: 'Tryout Figural Khusus', desc: '46 soal penalaran figural bergambar: Analogi, Ketidaksamaan, dan Serial Pola resmi', badge: 'Spesial Bergambar' },
  { id: 'tryout-1', label: 'Tryout 1', desc: 'Paket soal perdana — TWK, TIU, TKP standar BKN', badge: 'Populer' },
  { id: 'tryout-2', label: 'Tryout 2', desc: 'Fokus Pancasila, analogi verbal, dan TKP integritas', badge: null },
  { id: 'tryout-3', label: 'Tryout 3', desc: 'Soal UUD 1945, penalaran induktif, dan bela negara', badge: null },
  { id: 'tryout-4', label: 'Tryout 4', desc: 'Wawasan NKRI, sinonim/antonim, dan TKP orientasi', badge: null },
  { id: 'tryout-5', label: 'Tryout 5', desc: 'Sejarah Indonesia, kuantitatif, dan TKP adaptasi', badge: null },
  { id: 'tryout-6', label: 'Tryout 6', desc: 'Bhinneka Tunggal Ika, deduktif, dan kepemimpinan', badge: null },
];
