import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isOrderEligibleForReminder, buildAbandonedReminderEmail } from '@/lib/abandonedReminder';
import { sendOtpEmail } from '@/lib/mailer';
import { BUNDLE_SIZE } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Authorize via CRON_SECRET or ADMIN_API_KEY
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Cari pesanan pending dalam rentang 1-24 jam terakhir
    const pendingOrders = await sql`
      SELECT id, user_email, package_id, order_type, exact_amount, status, created_at, last_reminded_at
      FROM payment_orders
      WHERE status = 'pending'
        AND user_email IS NOT NULL
        AND user_email != ''
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND created_at <= NOW() - INTERVAL '1 hour'
        AND last_reminded_at IS NULL
      LIMIT 10
    `;

    let sentCount = 0;

    for (const order of pendingOrders) {
      const createdAt = new Date(order.created_at);
      const isEligible = isOrderEligibleForReminder(
        createdAt,
        order.status,
        order.last_reminded_at ? new Date(order.last_reminded_at) : null
      );

      if (!isEligible) continue;

      const pkgLabel = order.order_type === 'pro' ? 'PRO All-Access'
        : order.order_type === 'bundle' ? `Paket Bundle ${BUNDLE_SIZE} Tryout`
        : (order.package_id || 'Paket Tryout');
      const emailContent = buildAbandonedReminderEmail(Number(order.id), Number(order.exact_amount), pkgLabel);

      const sendRes = await sendOtpEmail({
        to: order.user_email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (sendRes.success) {
        await sql`
          UPDATE payment_orders
          SET last_reminded_at = NOW()
          WHERE id = ${order.id}
        `;
        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      scanned: pendingOrders.length,
      remindersSent: sentCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
