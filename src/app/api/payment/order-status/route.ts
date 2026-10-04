import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId');
    const exactAmount = req.nextUrl.searchParams.get('exactAmount');

    if (!orderId && !exactAmount) {
      return NextResponse.json({ error: 'orderId or exactAmount required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const rows = orderId
      ? await sql`
          SELECT id, user_id, user_email, package_id, order_type, exact_amount, status, paid_at
          FROM payment_orders
          WHERE id = ${orderId}
          LIMIT 1
        `
      : await sql`
          SELECT id, user_id, user_email, package_id, order_type, exact_amount, status, paid_at
          FROM payment_orders
          WHERE exact_amount = ${Number(exactAmount)}
          ORDER BY created_at DESC
          LIMIT 1
        `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = rows[0];
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
