import { NextResponse } from 'next/server';
import { PRICE_TABLE, BUNDLE_SIZE } from '@/lib/pricing';

/**
 * Public price list for the client. The amounts stay server-authoritative:
 * `create-order` charges from `PRICE_TABLE`, never from a posted number, and
 * this route is the only way the UI can show the same figures — typing "Rp
 * 59.000" into JSX is what made the displayed price drift from the real one
 * whenever an env override changed it (BUG_REPORT P2-14).
 */

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export async function GET() {
  return NextResponse.json(
    {
      single: PRICE_TABLE.single,
      bundle: PRICE_TABLE.bundle,
      pro: PRICE_TABLE.pro,
      bundleSize: BUNDLE_SIZE,
      labels: {
        single: rupiah(PRICE_TABLE.single),
        bundle: rupiah(PRICE_TABLE.bundle),
        pro: rupiah(PRICE_TABLE.pro),
        singleOfBundle: rupiah(PRICE_TABLE.single * BUNDLE_SIZE),
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } }
  );
}
