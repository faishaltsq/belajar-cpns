export type OrderType = 'single' | 'bundle' | 'pro';

/**
 * Server-authoritative price table. The client never supplies an amount —
 * create-order reads only this table, so a posted `baseAmount` can no longer
 * set what the buyer pays.
 *
 * Env overrides exist so price can change without a redeploy, but a missing
 * or malformed value falls back to the literal below rather than to zero.
 */
export const PRICE_TABLE: Record<OrderType, number> = {
  single: readPrice('KLIKQRIS_TRYOUT_PRICE', 5000),
  bundle: readPrice('KLIKQRIS_BUNDLE_PRICE', 18000),
  pro: readPrice('KLIKQRIS_PRO_PRICE', 59000),
};

function readPrice(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function priceFor(orderType: OrderType): number {
  return PRICE_TABLE[orderType];
}

export function isOrderType(v: unknown): v is OrderType {
  return v === 'single' || v === 'bundle' || v === 'pro';
}

/** How many packages a single bundle purchase unlocks. */
export const BUNDLE_SIZE = 5;

/** Kept in sync with FREE_IDS in src/app/simulasi/page.tsx:60. */
export const FREE_PACKAGE_IDS = ['tryout-mini', 'tryout-1', 'tryout-2'] as const;

export type BundleValidation =
  | { ok: true; ids: string[] }
  | { ok: false; reason: string };

/**
 * A bundle must be exactly BUNDLE_SIZE distinct, paid, not-yet-owned packages.
 * Rejecting owned packages up front prevents charging for access the user
 * already has.
 */
export function validateBundlePackageIds(
  ids: unknown,
  unlocked: readonly string[],
  freeIds: ReadonlySet<string>
): BundleValidation {
  if (!Array.isArray(ids)) return { ok: false, reason: 'packageIds harus berupa array.' };
  if (ids.length !== BUNDLE_SIZE) {
    return { ok: false, reason: `Bundle harus tepat ${BUNDLE_SIZE} paket.` };
  }

  const cleaned = ids.map((v) => String(v).trim()).filter(Boolean);
  if (cleaned.length !== BUNDLE_SIZE) {
    return { ok: false, reason: 'Terdapat packageId kosong pada pilihanmu.' };
  }
  if (new Set(cleaned).size !== cleaned.length) {
    return { ok: false, reason: 'Terdapat paket duplikat pada pilihanmu.' };
  }

  for (const id of cleaned) {
    if (freeIds.has(id)) {
      return { ok: false, reason: `Paket ${id} sudah gratis, tidak perlu dibeli.` };
    }
  }
  for (const id of cleaned) {
    if (unlocked.includes(id)) {
      return { ok: false, reason: `Paket ${id} sudah terbuka untuk akunmu.` };
    }
  }

  return { ok: true, ids: cleaned };
}
