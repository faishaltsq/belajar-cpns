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
