import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Nominal minimal untuk upgrade Pro (default Rp 49.000, toleransi Rp 45.000)
const MIN_AMOUNT_PRO = 45000;

interface SaweriaPayload {
  version?: string;
  id?: string;
  type?: string;
  amount_raw?: number;
  donator_name?: string;
  donator_email?: string;
  message?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validasi secret token di header atau query param (optional security)
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-saweria-secret');
    const expectedSecret = process.env.SAWERIA_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized secret' }, { status: 401 });
    }

    const body: SaweriaPayload = await req.json();

    const donationId = body.id || `saweria-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const amount = Number(body.amount_raw || 0);
    const donatorName = body.donator_name || 'Anonim';
    const donatorEmail = (body.donator_email || '').trim().toLowerCase();
    const message = (body.message || '').trim();

    // 2. Ekstrak target user email:
    // Cek apakah ada email di dalam teks pesan (user tulis "upgrade user@email.com")
    let targetEmail = '';
    const emailInMessage = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailInMessage) {
      targetEmail = emailInMessage[0].toLowerCase();
    } else if (donatorEmail && donatorEmail.includes('@')) {
      targetEmail = donatorEmail;
    }

    const sql = getDb();

    // Cek apakah donasi ini sudah pernah diproses (idempotency)
    const existing = await sql`
      SELECT id FROM saweria_transactions WHERE donation_id = ${donationId} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Already processed', donationId }, { status: 200 });
    }

    let matchedUserId: string | null = null;
    let upgraded = false;

    // 3. Jika nominal memenuhi syarat & email ditemukan, upgrade user
    if (targetEmail && amount >= MIN_AMOUNT_PRO) {
      const userRows = await sql`
        SELECT id, email, is_pro FROM users 
        WHERE LOWER(email) = ${targetEmail} 
        LIMIT 1
      `;

      if (userRows.length > 0) {
        matchedUserId = userRows[0].id;
        await sql`
          UPDATE users 
          SET is_pro = TRUE, 
              pro_activated_at = NOW(), 
              saweria_donation_id = ${donationId}
          WHERE id = ${matchedUserId}
        `;
        upgraded = true;
      }
    }

    // 4. Catat transaksi ke audit log
    await sql`
      INSERT INTO saweria_transactions (
        donation_id, donator_name, donator_email, amount, message, 
        matched_user_id, matched_user_email, raw_payload
      ) VALUES (
        ${donationId}, ${donatorName}, ${donatorEmail}, ${amount}, ${message},
        ${matchedUserId}, ${targetEmail || null}, ${JSON.stringify(body)}
      )
    `;

    return NextResponse.json({
      success: true,
      donationId,
      amount,
      targetEmail,
      matched: !!matchedUserId,
      upgraded,
      message: upgraded 
        ? `Akun ${targetEmail} berhasil di-upgrade ke PRO!`
        : `Donasi dicatat. Upgrade=${upgraded} (nominal min ${MIN_AMOUNT_PRO})`
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Saweria Webhook Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
