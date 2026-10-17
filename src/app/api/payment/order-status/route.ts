import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawOrderId = req.nextUrl.searchParams.get('orderId');
    const rawExactAmount = req.nextUrl.searchParams.get('exactAmount');

    if (!rawOrderId && !rawExactAmount) {
      return NextResponse.json({ error: 'orderId or exactAmount required' }, { status: 400 });
    }

    let numericOrderId: number | null = null;
    if (rawOrderId) {
      const parsed = Number(rawOrderId);
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Invalid orderId format' }, { status: 400 });
      }
      numericOrderId = parsed;
    }

    let numericAmount: number | null = null;
    if (rawExactAmount) {
      const parsed = Number(rawExactAmount);
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'Invalid exactAmount format' }, { status: 400 });
      }
      numericAmount = parsed;
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const rows = numericOrderId
      ? await sql`
          SELECT id, user_id, package_id, order_type, exact_amount, status, paid_at
          FROM payment_orders
          WHERE id = ${numericOrderId}
          LIMIT 1
        `
      : await sql`
          SELECT id, user_id, package_id, order_type, exact_amount, status, paid_at
          FROM payment_orders
          WHERE exact_amount = ${numericAmount} AND user_id = ${payload.userId}
          ORDER BY created_at DESC
          LIMIT 1
        `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = rows[0];

    // Order milik user lain tidak boleh terlihat. Order lama tanpa user_id
    // (legacy) tetap bisa dibaca oleh caller yang terautentikasi.
    if (order.user_id && order.user_id !== payload.userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isPaid = order.status === 'paid';

    return NextResponse.json({
      orderId: order.id,
      exactAmount: order.exact_amount,
      orderType: order.order_type,
      packageId: order.package_id,
      status: order.status,
      paid: isPaid,
      paidAt: order.paid_at,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
