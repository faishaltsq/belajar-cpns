import { useEffect, useState } from 'react';

/**
 * Prices for the UI, read from GET /api/pricing — the same table
 * `create-order` charges from. Typed amounts in JSX were the defect: an env
 * override moved the real price while the label kept showing the old number
 * (BUG_REPORT P2-14).
 *
 * Until the fetch answers, `labels` holds the current defaults so the buttons
 * are never blank; nothing is charged from them — the server decides the
 * amount at order time regardless of what is rendered here.
 */

export interface Prices {
  single: number;
  bundle: number;
  pro: number;
  bundleSize: number;
  labels: { single: string; bundle: string; pro: string; singleOfBundle: string };
}

const DEFAULT_PRICES: Prices = {
  single: 5000,
  bundle: 18000,
  pro: 59000,
  bundleSize: 5,
  labels: {
    single: 'Rp 5.000',
    bundle: 'Rp 18.000',
    pro: 'Rp 59.000',
    singleOfBundle: 'Rp 25.000',
  },
};

export function usePrices(): Prices {
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);

  useEffect(() => {
    let alive = true;
    fetch('/api/pricing')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (alive && body?.labels?.pro) setPrices(body as Prices);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return prices;
}

/** Derived figures, so no per-paket price or discount % is ever typed by hand. */
export function priceBreakdown(prices: Prices) {
  const perPaket = Math.round(prices.bundle / prices.bundleSize);
  const allSingle = prices.single * prices.bundleSize;
  const hematPct = allSingle > 0 ? Math.round((1 - prices.bundle / allSingle) * 100) : 0;
  return {
    perPaket: `Rp ${perPaket.toLocaleString('id-ID')}`,
    hematPct,
  };
}
