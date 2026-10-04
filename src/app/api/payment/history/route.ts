import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Fetch user data
    const userRows = await sql`
      SELECT id, email, is_pro, pro_activated_at, unlocked_packages
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRows[0];
    const unlockedPkgIds: string[] = Array.isArray(user.unlocked_packages) ? user.unlocked_packages : [];

    // 2. Fetch package titles for display
    const pkgRows = await sql`SELECT id, title FROM packages`;
    const titleMap = new Map<string, string>();
    for (const p of pkgRows) titleMap.set(p.id, p.title);

    // 3. Query all transactions for this user
    const orderRows = await sql`
      SELECT
        id, order_type, package_id, base_amount, unique_code, exact_amount,
        status, created_at, expires_at, paid_at
      FROM payment_orders
      WHERE user_id = ${payload.userId}
         OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(${user.email || ''}))
      ORDER BY created_at DESC
    `;

    const now = new Date();
    const transactions = orderRows.map((r: any) => {
      let finalStatus = r.status;
      // Treat expired pending orders as 'expired'
      if (r.status === 'pending' && r.expires_at && new Date(r.expires_at) < now) {
        finalStatus = 'expired';
      }

      let packageTitle = 'Paket Member PRO (Akses Semua Tryout)';
      if (r.order_type === 'single' && r.package_id) {
        packageTitle = titleMap.get(r.package_id) || `Paket ${r.package_id}`;
      }

      return {
        id: r.id,
        orderType: r.order_type,
        packageId: r.package_id,
        packageTitle,
        baseAmount: Number(r.base_amount),
        uniqueCode: Number(r.unique_code),
        exactAmount: Number(r.exact_amount),
        status: finalStatus,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        paidAt: r.paid_at,
      };
    });

    const activePackages = unlockedPkgIds.map((pkgId) => ({
      packageId: pkgId,
      title: titleMap.get(pkgId) || `Paket ${pkgId}`,
    }));

    return NextResponse.json({
      success: true,
      isPro: Boolean(user.is_pro),
      proActivatedAt: user.pro_activated_at,
      activePackages,
      transactions,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
