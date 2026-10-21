/**
 * Catalog counts, derived instead of typed.
 *
 * The marketing copy restated these numbers by hand and they disagreed with the
 * catalog: metadata claimed "37 paket tryout 110 butir" while three packages are
 * 30/46/82 butir, and the bottom CTA offered "6 paket tryout ... tanpa biaya"
 * while the catalog publishes 37 packages and exactly 3 are free. Every count
 * here is computed from `TRYOUT_LIST` / `FREE_PACKAGE_IDS`, so the copy follows
 * the catalog instead of being a second place that can rot.
 */
import { TRYOUT_LIST } from './tryoutCatalog';
import { FREE_PACKAGE_IDS } from './pricing';

/** Every published package (27 tryout + 10 drill). */
export const CATALOG_TOTAL = TRYOUT_LIST.length;

/** Packages built on the full 110-butir standard paper. */
export const STANDARD_110_TOTAL = TRYOUT_LIST.filter((p) => p.questionCount === 110).length;

/** Butir available across the whole catalog. */
export const CATALOG_QUESTION_TOTAL = TRYOUT_LIST.reduce((sum, p) => sum + p.questionCount, 0);

/** Packages a signed-out learner can open end to end. */
export const FREE_PACKAGE_TOTAL = FREE_PACKAGE_IDS.length;

const id = (n: number) => n.toLocaleString('id-ID');

/** "37 Paket Tryout CAT Standar BKN · 3.898 Soal · ..." */
export function catalogHeadline(detail: string): string {
  return `${CATALOG_TOTAL} Paket Tryout CAT Standar BKN · ${id(
    CATALOG_QUESTION_TOTAL
  )} Soal · ${detail}`;
}

/** "... 37 paket tryout (34 di antaranya 110 butir), skor otomatis ..." */
export function catalogMetaDescription(prefix: string, suffix: string): string {
  return `${prefix} ${CATALOG_TOTAL} paket tryout (${STANDARD_110_TOTAL} di antaranya 110 butir), ${suffix}`;
}
