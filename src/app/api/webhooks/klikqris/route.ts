import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface KlikQrisWebhookPayload {
  order_id?: string;
  status?: string;
  amount?: number;
  total_amount?: number;
  payment_date?: string;
  signature?: string;
  data?: {
    order_id?: string;
    status?: string;
    amount_paid?: number;
    payment_date?: string;
    signature?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: KlikQrisWebhookPayload = await req.json().catch(() => ({}));

    // Extract fields from either flat format or nested data format
    const rawOrderId = body.order_id || body.data?.order_id || '';
    const status = (body.status || body.data?.status || '').toUpperCase();
    const paidAmount = Number(body.total_amount || body.amount || body.data?.amount_paid || 0);

    if (!rawOrderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Extract numeric ID from INV-123 or raw numeric ID
    const match = String(rawOrderId).match(/\d+/);
    const orderId = match ? Number(match[0]) : null;

    if (!orderId) {
      return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Query order — include signature for verification
    const orderRows = await sql`
      SELECT id, user_id, user_email, package_id, order_type, exact_amount, status, signature
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (orderRows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRows[0];

    // Signature verification (double security check dari KlikQRIS)
    const incomingSig = body.signature || body.data?.signature;
    if (order.signature && incomingSig && order.signature !== incomingSig) {
      console.warn(`[KlikQRIS Webhook] Signature mismatch for order #${orderId}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 2. Idempotency: if already paid, return 200 immediately
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
    }

    // 3. Process payment if status is PAID / SUCCESS
    if (status === 'PAID' || status === 'SUCCESS') {
      // Update order to paid
      await sql`
        UPDATE payment_orders
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = ${order.id}
      `;

      // Update user access
      if (order.user_id) {
        if (order.order_type === 'pro') {
          await sql`
            UPDATE users
            SET is_pro = true,
                pro_activated_at = NOW()
            WHERE id = ${order.user_id}
          `;
        } else if (order.order_type === 'single' && order.package_id) {
          const userRows = await sql`SELECT unlocked_packages FROM users WHERE id = ${order.user_id} LIMIT 1`;
          if (userRows.length > 0) {
            const current: string[] = Array.isArray(userRows[0].unlocked_packages) ? userRows[0].unlocked_packages : [];
            if (!current.includes(order.package_id)) {
              current.push(order.package_id);
              await sql`
                UPDATE users
                SET unlocked_packages = ${JSON.stringify(current)}::jsonb
                WHERE id = ${order.user_id}
              `;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and access granted',
        orderId: order.id,
      }, { status: 200 });
    }

    if (status === 'EXPIRED') {
      await sql`
        UPDATE payment_orders
        SET status = 'expired'
        WHERE id = ${order.id}
      `;
      return NextResponse.json({ success: true, message: 'Order marked expired' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: `Status ${status} acknowledged` }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Webhook internal error';
    console.error('KlikQRIS Webhook Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
