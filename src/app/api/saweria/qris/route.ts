import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createSaweriaQris } from '@/lib/saweria';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let amount = Number(body.amount);
    const packageId = body.packageId ? String(body.packageId).trim() : null;
    const customUsername = body.saweriaUsername ? String(body.saweriaUsername).trim() : undefined;

    // Default price: Rp 1.000 untuk testing (batas minimum QRIS nasional)
    if (!amount || isNaN(amount) || amount < 1000) {
      amount = 1000;
    }

    // Identifikasi user dari cookie atau body
    let userId: string | null = null;
    let userEmail: string = (body.donorEmail || '').trim().toLowerCase();

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

    // Jika user logged in tetapi userEmail belum ada, ambil dari DB
    const sql = getDb();
    if (sql && userId && !userEmail) {
      const urows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
      if (urows.length > 0 && urows[0].email) {
        userEmail = urows[0].email.toLowerCase();
      }
    }

    const donorName = body.donorName || (userEmail ? userEmail.split('@')[0] : 'Sobat CPNS');
    const msg = packageId 
      ? `Akses ${packageId} [${userEmail || 'user'}]`
      : `Upgrade PRO [${userEmail || 'user'}]`;

    // Generate QRIS resmi
    const qris = await createSaweriaQris({
      saweriaUsername: customUsername,
      amount,
      message: msg,
      donorName,
      donorEmail: userEmail || 'user@lolos.in',
    });

    // Simpan pending transaksi ke DB
    if (sql) {
      await sql`
        INSERT INTO saweria_transactions (
          donation_id, donator_name, donator_email, amount, message,
          matched_user_id, matched_user_email, status, qr_string, package_id, raw_payload
        ) VALUES (
          ${qris.id}, ${donorName}, ${userEmail || null}, ${qris.amountRaw}, ${msg},
          ${userId}, ${userEmail || null}, 'pending', ${qris.qrString}, ${packageId},
          ${JSON.stringify({ created_via: 'api_qris', ...qris })}
        )
        ON CONFLICT (donation_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          status = 'pending',
          updated_at = NOW()
      `;

      // Simpan juga ke payment_orders jika belum ada
      try {
        await sql`
          INSERT INTO payment_orders (
            user_id, user_email, package_id, order_type,
            base_amount, unique_code, exact_amount, status, saweria_donation_id
          ) VALUES (
            ${userId}, ${userEmail || null}, ${packageId}, ${packageId ? 'single' : 'pro'},
            ${amount}, 0, ${qris.amountRaw}, 'pending', ${qris.id}
          )
        `;
      } catch {
        // ignore duplicate
      }
    }

    return NextResponse.json({
      success: true,
      donationId: qris.id,
      amount: qris.amount,
      amountRaw: qris.amountRaw,
      qrString: qris.qrString,
      qrDataUrl: qris.qrDataUrl,
      isSynthesized: qris.id.startsWith('saweria-qris-'),
      packageId,
      userEmail,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Saweria QRIS Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
