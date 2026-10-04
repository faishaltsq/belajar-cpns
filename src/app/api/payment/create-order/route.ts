import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderType = body.orderType === 'single' ? 'single' : 'pro';
    const packageId = body.packageId ? String(body.packageId).trim() : null;

    // Nominal dasar (testing default Rp 1.000, atau sesuai env)
    const baseAmount = Number(
      body.baseAmount ||
      (orderType === 'single'
        ? process.env.SAWERIA_TRYOUT_PRICE || 1000
        : process.env.SAWERIA_PRO_PRICE || 1000)
    );

    // Ambil identitas user dari cookie token
    let userId: string | null = null;
    let userEmail: string = (body.userEmail || '').trim().toLowerCase();

    const token = cookies().get('cpns_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        userId = payload.userId;
        if (!userEmail && payload.email) {
          userEmail = payload.email.toLowerCase();
        }
      }
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    if (userId && !userEmail) {
      const u = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
      if (u.length > 0 && u[0].email) {
        userEmail = u[0].email.toLowerCase();
      }
    }

    // 1. Cek apakah user sudah punya order pending yang aktif untuk tipe paket ini dalam masa berlaku
    if (userId || userEmail) {
      let existing: Record<string, any>[] = [];
      if (userId) {
        existing = packageId
          ? await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at
              FROM payment_orders
              WHERE user_id = ${userId} 
                AND order_type = ${orderType} 
                AND package_id = ${packageId}
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `
          : await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at
              FROM payment_orders
              WHERE user_id = ${userId} 
                AND order_type = ${orderType} 
                AND package_id IS NULL
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `;
      } else if (userEmail) {
        existing = packageId
          ? await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at
              FROM payment_orders
              WHERE LOWER(user_email) = ${userEmail} 
                AND order_type = ${orderType} 
                AND package_id = ${packageId}
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `
          : await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at
              FROM payment_orders
              WHERE LOWER(user_email) = ${userEmail} 
                AND order_type = ${orderType} 
                AND package_id IS NULL
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `;
      }

      if (existing.length > 0) {
        const order = existing[0];
        return NextResponse.json({
          success: true,
          orderId: order.id,
          baseAmount: order.base_amount,
          uniqueCode: order.unique_code,
          exactAmount: order.exact_amount,
          packageId,
          orderType,
          userEmail,
          saweriaUsername: process.env.SAWERIA_USERNAME || 'faishaltsq',
        });
      }
    }

    // 2. Cari kode unik nominal yang belum terpakai (1 s.d. 499)
    const usedCodesRows = await sql`
      SELECT unique_code FROM payment_orders
      WHERE base_amount = ${baseAmount}
        AND status = 'pending'
        AND expires_at > NOW()
    `;
    const usedCodes = new Set(usedCodesRows.map((r: Record<string, any>) => Number(r.unique_code)));

    let uniqueCode = 1;
    while (usedCodes.has(uniqueCode) && uniqueCode < 500) {
      uniqueCode++;
    }

    const exactAmount = baseAmount + uniqueCode;

    // 3. Simpan order baru
    const inserted = await sql`
      INSERT INTO payment_orders (
        user_id, user_email, package_id, order_type,
        base_amount, unique_code, exact_amount, status
      ) VALUES (
        ${userId}, ${userEmail || null}, ${packageId}, ${orderType},
        ${baseAmount}, ${uniqueCode}, ${exactAmount}, 'pending'
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      orderId: inserted[0].id,
      baseAmount,
      uniqueCode,
      exactAmount,
      packageId,
      orderType,
      userEmail,
      saweriaUsername: process.env.SAWERIA_USERNAME || 'faishaltsq',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create Order Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
