import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { checkKlikQrisStatus } from '@/lib/klikqris';
import { grantEntitlement, toEntitlementOrder } from '@/lib/grantEntitlement';

export async function POST(req: NextRequest) {
  try {
    // Manual payment sync. It used to answer any caller who guessed an order id
    // and echo the whole order row back — including user_id and user_email
    // (audit F4). Callers are the checkout poller and the billing page, both
    // signed in, so a session is required and the order must be theirs.
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const auth = await verifyToken(token);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // 1. Ambil order yang dimaksud — dibatasi ke milik pemanggil, sehingga
    // order milik akun lain tidak bisa disinkronkan maupun dibaca.
    const orders = await sql`
      SELECT id, user_id, user_email, package_id, order_type, base_amount, exact_amount, status, package_ids
      FROM payment_orders
      WHERE id = ${orderId}
        AND user_id = ${auth.userId}
      LIMIT 1
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Jika sudah lunas di DB, langsung return success
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, paid: true });
    }

    // 2. Hubungi API status KlikQRIS
    const qrisStatus = await checkKlikQrisStatus(`INV-${order.id}`);

    if (qrisStatus.success && qrisStatus.status === 'PAID') {
      // Atomic transition (audit F3): only the request that flips the row from
      // 'pending' to 'paid' grants entitlement, so concurrent callers cannot
      // double-grant.
      const transitioned = await sql`
        UPDATE payment_orders
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = ${order.id}
          AND status = 'pending'
        RETURNING id
      `;

      const grantOrder = toEntitlementOrder(order);
      if (transitioned.length > 0 && grantOrder) {
        await grantEntitlement(sql, grantOrder);
      }

      return NextResponse.json({
        success: true,
        paid: true,
        message: 'Pembayaran berhasil diverifikasi otomatis!',
      });
    }

    return NextResponse.json({
      success: true,
      paid: false,
      message: 'Pembayaran belum terdeteksi. Silakan tunggu beberapa detik setelah scan QRIS.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
