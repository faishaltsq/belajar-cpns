import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { grantEntitlement, toEntitlementOrder } from '@/lib/grantEntitlement';

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
      SELECT id, user_id, user_email, package_id, order_type, exact_amount, status, signature, package_ids
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (orderRows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderRows[0];

    // Signature verification is unconditional (audit F1). A legacy order with
    // signature = NULL is rejected too — otherwise anyone who guesses the
    // sequential integer order id can claim it. Comparison is timing-safe and
    // never throws: lengths are checked first.
    const incomingSig = body.signature || body.data?.signature;
    if (!order.signature || !incomingSig) {
      console.warn(`[KlikQRIS Webhook] Missing signature for order #${orderId}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const expectedSig = Buffer.from(String(order.signature), 'utf-8');
    const providedSig = Buffer.from(String(incomingSig), 'utf-8');
    if (
      expectedSig.length !== providedSig.length ||
      !crypto.timingSafeEqual(expectedSig, providedSig)
    ) {
      console.warn(`[KlikQRIS Webhook] Signature mismatch for order #${orderId}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Amount check: reject underpayment. paidAmount === 0 means the gateway
    // did not report an amount, which is tolerated for backward compatibility.
    if (paidAmount > 0 && paidAmount < Number(order.exact_amount)) {
      console.warn(`[KlikQRIS Webhook] Underpaid order #${orderId}: ${paidAmount} < ${order.exact_amount}`);
      return NextResponse.json({ error: 'Underpaid amount' }, { status: 400 });
    }

    // 2. Idempotency: if already paid, return 200 immediately
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
    }

    // 3. Process payment if status is PAID / SUCCESS
    if (status === 'PAID' || status === 'SUCCESS') {
      // Atomic transition (audit F3): only the request that flips the row from
      // 'pending' to 'paid' grants entitlement, so concurrent webhook
      // deliveries cannot double-grant.
      const transitioned = await sql`
        UPDATE payment_orders
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = ${order.id}
          AND status = 'pending'
        RETURNING id
      `;

      if (transitioned.length === 0) {
        return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
      }

      const grantOrder = toEntitlementOrder(order);
      if (grantOrder) await grantEntitlement(sql, grantOrder);

      return NextResponse.json({
        success: true,
        message: 'Payment verified and access granted',
        orderId: order.id,
      }, { status: 200 });
    }

    if (status === 'EXPIRED') {
      // Guarded on 'pending', exactly like the PAID branch above. Without it a
      // late or replayed EXPIRED delivery flips an already-paid order back to
      // 'expired': the entitlement stays granted, but the history lies and the
      // next delivery of a PAID webhook passes the idempotency check and
      // grants the package a second time.
      const expired = await sql`
        UPDATE payment_orders
        SET status = 'expired'
        WHERE id = ${order.id}
          AND status = 'pending'
        RETURNING id
      `;
      if (expired.length === 0) {
        return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
      }
      return NextResponse.json({ success: true, message: 'Order marked expired' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: `Status ${status} acknowledged` }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Webhook internal error';
    console.error('KlikQRIS Webhook Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
