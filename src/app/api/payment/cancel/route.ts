import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body.orderId);
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Verify order ownership and current status
    const rows = await sql`
      SELECT id, user_id, user_email, status
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const order = rows[0];
    const isOwner =
      order.user_id === payload.userId ||
      (order.user_email &&
        payload.email &&
        order.user_email.toLowerCase() === payload.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Pesanan dengan status ${order.status} tidak dapat dibatalkan.` },
        { status: 400 }
      );
    }

    // Set status = cancelled and expire immediately so unique code is freed
    await sql`
      UPDATE payment_orders
      SET status = 'cancelled',
          expires_at = NOW()
      WHERE id = ${orderId}
    `;

    return NextResponse.json({ success: true, message: 'Pesanan berhasil dibatalkan.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
