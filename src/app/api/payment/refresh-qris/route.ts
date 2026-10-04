import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { makeDynamicQris, DEFAULT_BASE_QRIS } from '@/lib/saweria';
import QRCode from 'qrcode';

const SAWERIA_USERNAME = process.env.SAWERIA_USERNAME || 'faishaltsq';
const BASE_QRIS = process.env.QRIS_BASE_STRING || DEFAULT_BASE_QRIS;

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const sql = getDb();
    if (!sql) return NextResponse.json({ error: 'db not configured' }, { status: 500 });

    const rows = await sql`
      SELECT id, exact_amount, order_type, package_id, user_email, status
      FROM payment_orders WHERE id = ${Number(orderId)} LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: 'order not found' }, { status: 404 });

    const order = rows[0];
    if (order.status !== 'pending') return NextResponse.json({ error: 'order not pending' }, { status: 400 });

    const msg = order.order_type === 'single'
      ? `Akses ${order.package_id} [ID #${order.id}]`
      : `Upgrade PRO [ID #${order.id}]`;

    const paymentUrl = `https://saweria.co/${SAWERIA_USERNAME}?amount=${order.exact_amount}&message=${encodeURIComponent(msg)}`;

    const qrisString = makeDynamicQris(BASE_QRIS, order.exact_amount);
    const qrDataUrl = await QRCode.toDataURL(qrisString, {
      width: 300, margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    });
    return NextResponse.json({ qrDataUrl, paymentUrl, qrisMode: true, refreshedAt: Date.now() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
