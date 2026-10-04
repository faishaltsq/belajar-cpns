import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // 1. Ambil order yang dimaksud
    const orders = await sql`
      SELECT id, user_id, user_email, package_id, order_type, base_amount, exact_amount, status
      FROM payment_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Jika sudah lunas, langsung return success
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, paid: true, order });
    }

    // 2. Cari transaksi Saweria dalam 15 menit terakhir yang cocok
    // Kriteria:
    // A. Pesan mengandung order ID (misal: "ID #3", "#3")
    // B. ATAU exact_amount persis sama
    // C. ATAU nominal dalam toleransi pajak QRIS [base_amount s.d. base_amount + 60] atau [exact_amount s.d. exact_amount + 60]
    const candidates = await sql`
      SELECT id, donation_id, amount, message, matched_user_id, created_at
      FROM saweria_transactions
      WHERE status = 'success'
        AND created_at > (NOW() - INTERVAL '30 minutes')
        AND (
          message ILIKE ${`%#${order.id}%`}
          OR amount = ${order.exact_amount}
          OR (amount >= ${order.base_amount} AND amount <= ${order.base_amount + 60})
          OR (amount >= ${order.exact_amount} AND amount <= ${order.exact_amount + 60})
        )
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (candidates.length > 0) {
      const tx = candidates[0];

      // Mark order as paid
      await sql`
        UPDATE payment_orders
        SET status = 'paid',
            paid_at = NOW(),
            saweria_donation_id = ${tx.donation_id}
        WHERE id = ${order.id}
      `;

      // Unlock user package or activate PRO
      const targetUserId = order.user_id;
      const targetUserEmail = order.user_email;

      if (targetUserId || targetUserEmail) {
        const userRows = targetUserId
          ? await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE id = ${targetUserId} LIMIT 1`
          : await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE LOWER(email) = ${targetUserEmail.toLowerCase()} LIMIT 1`;

        if (userRows.length > 0) {
          const u = userRows[0];
          const currentUnlocked: string[] = Array.isArray(u.unlocked_packages) ? u.unlocked_packages : [];

          if (order.order_type === 'single' && order.package_id) {
            if (!currentUnlocked.includes(order.package_id)) {
              currentUnlocked.push(order.package_id);
            }
            await sql`
              UPDATE users
              SET unlocked_packages = ${JSON.stringify(currentUnlocked)}::jsonb
              WHERE id = ${u.id}
            `;
          } else {
            await sql`
              UPDATE users
              SET is_pro = TRUE,
                  pro_activated_at = NOW(),
                  saweria_donation_id = ${tx.donation_id}
              WHERE id = ${u.id}
            `;
          }
        }
      }

      // Link transaction
      await sql`
        UPDATE saweria_transactions
        SET matched_user_id = ${order.user_id || null},
            matched_user_email = ${order.user_email || null},
            package_id = ${order.package_id || null}
        WHERE donation_id = ${tx.donation_id}
      `;

      return NextResponse.json({
        success: true,
        paid: true,
        message: 'Pembayaran berhasil diverifikasi otomatis!',
      });
    }

    return NextResponse.json({
      success: true,
      paid: false,
      message: 'Pembayaran belum terdeteksi. Silakan tunggu 1-2 menit setelah scan QRIS.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
