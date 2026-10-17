import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createKlikQrisTransaction } from '@/lib/klikqris';
import {
  priceFor,
  isOrderType,
  validateBundlePackageIds,
  FREE_PACKAGE_IDS,
  BUNDLE_SIZE,
} from '@/lib/pricing';

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
    const userId = payload.userId;

    const body = await req.json().catch(() => ({}));
    // orderType is validated, never coerced. An unknown value is rejected so a
    // caller cannot ride a typo into a higher-privilege tier.
    const orderType = isOrderType(body.orderType) ? body.orderType : null;
    if (!orderType) {
      return NextResponse.json(
        { error: 'INVALID_ORDERTYPE', message: 'orderType harus salah satu dari: single, bundle, pro.' },
        { status: 400 }
      );
    }
    const packageId = body.packageId ? String(body.packageId).trim() : null;

    // Bundle shape is validated before any database round trip so malformed
    // input never reaches the guard or creates a row. Ownership is checked
    // further down, once the user's unlocked list is loaded.
    let bundleIds: string[] | null = null;
    if (orderType === 'bundle') {
      const check = validateBundlePackageIds(
        body.packageIds,
        [],
        new Set<string>(FREE_PACKAGE_IDS)
      );
      if (!check.ok) {
        return NextResponse.json(
          { error: 'INVALID_BUNDLE', message: check.reason },
          { status: 400 }
        );
      }
      bundleIds = check.ids;
    }

    // A bundle must not store package_id = NULL: the pending-order dedupe query
    // matches on package_id, so NULL rows would never be found and every click
    // would open a new order.
    const effectivePackageId = orderType === 'bundle' ? 'bundle' : packageId;

    // Price comes from the server table only. body.baseAmount is deliberately
    // not read — clients must not be able to set what they pay.
    const baseAmount = priceFor(orderType);

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // 0. Guard: tolak jika user sudah Pro atau sudah unlock paket ini.
    // Email diambil dari tabel users — body.userEmail tidak pernah dipercaya.
    let userEmail: string | null = null;
    {
      const userRows = await sql`
        SELECT is_pro, unlocked_packages, email FROM users WHERE id = ${userId} LIMIT 1
      `;
      if (userRows.length > 0) {
        const { is_pro, unlocked_packages, email } = userRows[0];
        userEmail = email ? String(email).toLowerCase() : null;
        const unlockedArr: string[] = Array.isArray(unlocked_packages) ? unlocked_packages : [];

        // Jika user sudah Pro, semua paket sudah terbuka, dilarang beli lagi
        if (is_pro) {
          return NextResponse.json(
            { error: 'ALREADY_PRO', message: 'Akun kamu sudah berstatus PRO. Semua paket tryout sudah terbuka.' },
            { status: 409 }
          );
        }

        // Jika paket satuan spesifik sudah terbuka
        if (orderType === 'single' && packageId && unlockedArr.includes(packageId)) {
          return NextResponse.json(
            { error: 'ALREADY_UNLOCKED', message: `Paket ${packageId} sudah terbuka untuk akunmu.` },
            { status: 409 }
          );
        }

        // Sebagian isi bundle sudah dimiliki — jangan kenakan Rp 18.000 untuk
        // akses yang sudah ada.
        if (orderType === 'bundle' && bundleIds) {
          const already = bundleIds.find((id) => unlockedArr.includes(id));
          if (already) {
            return NextResponse.json(
              { error: 'ALREADY_UNLOCKED', message: `Paket ${already} sudah terbuka untuk akunmu.` },
              { status: 409 }
            );
          }
        }
      }
    }

    // 1. Cek apakah user sudah punya order pending yang aktif untuk tipe paket ini dalam masa berlaku
    {
      let existing: Record<string, any>[] = [];
      existing = effectivePackageId
          ? await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at, qris_url, qris_image, package_ids
              FROM payment_orders
              WHERE user_id = ${userId} 
                AND order_type = ${orderType} 
                AND package_id = ${effectivePackageId}
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `
          : await sql`
              SELECT id, exact_amount, unique_code, base_amount, status, expires_at, qris_url, qris_image, package_ids
              FROM payment_orders
              WHERE user_id = ${userId} 
                AND order_type = ${orderType} 
                AND package_id IS NULL
                AND status = 'pending'
                AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1
            `;

      if (existing.length > 0) {
        const order = existing[0];

        // Jika order lama sudah punya QRIS tersimpan (base64 real), langsung pakai — skip re-call KlikQRIS
        // Tolak sandbox dummy URL (storage/sandbox) agar order baru di-generate ulang
        const hasRealQris = order.qris_image?.startsWith('data:image') || 
          (order.qris_url && !order.qris_url.includes('/sandbox/'));
        if (hasRealQris) {
          // Pilihan bundle bisa berubah antar-klik (nominal bundle flat, QRIS tetap
          // valid): samakan package_ids tersimpan dengan pilihan terbaru supaya
          // webhook membuka tepat paket yang dipilih saat bayar.
          const finalBundleIds = bundleIds;
          if (orderType === 'bundle' && bundleIds) {
            const stored: string[] = Array.isArray(order.package_ids) ? order.package_ids : [];
            const same = stored.length === bundleIds.length && bundleIds.every((id) => stored.includes(id));
            if (!same) {
              await sql`
                UPDATE payment_orders
                SET package_ids = ${JSON.stringify(bundleIds)}::jsonb
                WHERE id = ${order.id}
              `;
            }
          }

          return NextResponse.json({
            success: true,
            orderId: order.id,
            invoiceCode: `INV-${order.id}`,
            baseAmount: order.base_amount,
            uniqueCode: order.unique_code,
            exactAmount: order.exact_amount,
            packageId: effectivePackageId,
            packageIds: finalBundleIds,
            orderType,
            userEmail,
            qrisUrl: order.qris_url || '',
            qrisImage: order.qris_image || '',
            gateway: 'klikqris',
          });
        }

        // Order pending ada tapi QRIS kosong (dibuat saat API key salah) — hapus & buat ulang
        await sql`DELETE FROM payment_orders WHERE id = ${order.id}`;
      }
    }

    // 2. Simpan order baru di database (unique_code & exact_amount diupdate setelah response KlikQRIS)
    const inserted = await sql`
      INSERT INTO payment_orders (
        user_id, user_email, package_id, order_type,
        base_amount, unique_code, exact_amount, status, package_ids
      ) VALUES (
        ${userId}, ${userEmail}, ${effectivePackageId}, ${orderType},
        ${baseAmount}, ${0}, ${baseAmount}, 'pending',
        ${bundleIds ? JSON.stringify(bundleIds) : null}::jsonb
      )
      RETURNING id
    `;

    const orderId = inserted[0].id;
    const keterangan = orderType === 'single'
      ? `Lolos.in - Akses ${packageId}`
      : orderType === 'bundle'
      ? `Lolos.in - Paket Bundle ${BUNDLE_SIZE} Tryout`
      : 'Lolos.in - Upgrade Akun PRO';

    // 4. Hubungi API KlikQRIS untuk generate dynamic QRIS
    // Kirim baseAmount murni — KlikQRIS yang akan mengenerate totalAmount dan kode uniknya sendiri
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lolosin.com';
    const klikQrisRes = await createKlikQrisTransaction({
      orderId: `INV-${orderId}`,
      amount: baseAmount,
      keterangan,
      callbackUrl: `${appUrl}/api/webhooks/klikqris`,
    });

    // Jika KlikQRIS gagal, rollback order & return error dengan pesan jelas
    if (!klikQrisRes.success) {
      await sql`DELETE FROM payment_orders WHERE id = ${orderId}`;
      console.error('[create-order] KlikQRIS gagal:', klikQrisRes.error);
      return NextResponse.json(
        { error: `Gagal generate QRIS: ${klikQrisRes.error || 'KlikQRIS tidak merespons'}` },
        { status: 502 }
      );
    }

    // Gunakan totalAmount dan uniqueCode resmi yang dihasilkan KlikQRIS
    const finalExactAmount = klikQrisRes.totalAmount || baseAmount;
    const finalUniqueCode = klikQrisRes.uniqueCode || (finalExactAmount - baseAmount);

    // Update exact amount & simpan signature + qrisUrl + qrisImage KlikQRIS
    await sql`
      UPDATE payment_orders
      SET exact_amount = ${finalExactAmount},
          unique_code = ${finalUniqueCode},
          signature = ${klikQrisRes.signature || null},
          qris_url = ${klikQrisRes.qrisUrl || null},
          qris_image = ${klikQrisRes.qrisImage || null}
      WHERE id = ${orderId}
    `;

    return NextResponse.json({
      success: true,
      orderId,
      invoiceCode: `INV-${orderId}`,
      baseAmount,
      uniqueCode: finalUniqueCode,
      exactAmount: finalExactAmount,
      packageId: effectivePackageId,
      packageIds: bundleIds,
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
