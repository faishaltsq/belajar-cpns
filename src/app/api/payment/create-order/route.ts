import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createKlikQrisTransaction } from '@/lib/klikqris';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderType = body.orderType === 'single' ? 'single' : 'pro';
    const packageId = body.packageId ? String(body.packageId).trim() : null;

    // Default price: PRO 49.000 (or custom env/testing), Single Tryout 15.000
    const baseAmount = Number(
      body.baseAmount ||
      (orderType === 'single'
        ? process.env.KLIKQRIS_TRYOUT_PRICE || process.env.SAWERIA_TRYOUT_PRICE || 15000
        : process.env.KLIKQRIS_PRO_PRICE || process.env.SAWERIA_PRO_PRICE || 49000)
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
        const keterangan = orderType === 'single'
          ? `Lolos.in - Akses ${packageId}`
          : 'Lolos.in - Upgrade Akun PRO';

        const klikQrisRes = await createKlikQrisTransaction({
          orderId: `INV-${order.id}`,
          amount: order.base_amount,
          keterangan,
        });

        return NextResponse.json({
          success: true,
          orderId: order.id,
          invoiceCode: `INV-${order.id}`,
          baseAmount: order.base_amount,
          uniqueCode: order.unique_code,
          exactAmount: order.exact_amount,
          packageId,
          orderType,
          userEmail,
          qrisUrl: klikQrisRes.qrisUrl,
          qrisImage: klikQrisRes.qrisImage,
          gateway: 'klikqris',
        });
      }
    }

    // 2. Cari kode unik nominal random (1–999) yang belum terpakai
    const usedCodesRows = await sql`
      SELECT unique_code FROM payment_orders
      WHERE base_amount = ${baseAmount}
        AND status = 'pending'
        AND expires_at > NOW()
    `;
    const usedCodes = new Set(usedCodesRows.map((r: Record<string, any>) => Number(r.unique_code)));

    let uniqueCode: number;
    let attempts = 0;
    do {
      uniqueCode = Math.floor(Math.random() * 999) + 1; // 1–999
      attempts++;
    } while (usedCodes.has(uniqueCode) && attempts < 100);

    const exactAmount = baseAmount + uniqueCode;

    // 3. Simpan order baru di database
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

    const orderId = inserted[0].id;
    const keterangan = orderType === 'single'
      ? `Lolos.in - Akses ${packageId}`
      : 'Lolos.in - Upgrade Akun PRO';

    // 4. Hubungi API KlikQRIS untuk generate dynamic QRIS
    const klikQrisRes = await createKlikQrisTransaction({
      orderId: `INV-${orderId}`,
      amount: baseAmount,
      keterangan,
    });

    // Update exact amount jika KlikQRIS mengembalikan total_amount dengan unique code server KlikQRIS
    if (klikQrisRes.totalAmount && klikQrisRes.totalAmount !== exactAmount) {
      await sql`
        UPDATE payment_orders
        SET exact_amount = ${klikQrisRes.totalAmount},
            unique_code = ${klikQrisRes.uniqueCode}
        WHERE id = ${orderId}
      `;
    }

    return NextResponse.json({
      success: true,
      orderId,
      invoiceCode: `INV-${orderId}`,
      baseAmount,
      uniqueCode: klikQrisRes.uniqueCode || uniqueCode,
      exactAmount: klikQrisRes.totalAmount || exactAmount,
      packageId,
      orderType,
      userEmail,
      qrisUrl: klikQrisRes.qrisUrl,
      qrisImage: klikQrisRes.qrisImage,
      gateway: 'klikqris',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create Order Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
