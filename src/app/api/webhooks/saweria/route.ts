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

    // 2. Ambang batas harga dinamis (bisa disetel via environment variable)
    const PRO_THRESHOLD = Number(process.env.SAWERIA_PRO_PRICE || 40000);
    const TRYOUT_THRESHOLD = Number(process.env.SAWERIA_TRYOUT_PRICE || 8000);

    // 3. Ekstrak target user email:
    // Cek apakah ada email di dalam teks pesan (user tulis "upgrade user@email.com" atau "[user@email.com]")
    let targetEmail = '';
    const emailInMessage = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailInMessage) {
      targetEmail = emailInMessage[0].toLowerCase();
    } else if (donatorEmail && donatorEmail.includes('@')) {
      targetEmail = donatorEmail;
    }

    // Ekstrak paket spesifik dari pesan (misal "Akses tryout-8", "tryout-10")
    const packageMatch = message.match(/\b(tryout-[a-zA-Z0-9_-]+)\b/i);
    let targetPackageId: string | null = packageMatch ? packageMatch[1].toLowerCase() : null;

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // 4. Cek apakah ada transaksi pending sebelumnya di database
    const existingTx = await sql`
      SELECT id, status, package_id, matched_user_id, matched_user_email
      FROM saweria_transactions
      WHERE donation_id = ${donationId}
      LIMIT 1
    `;

    if (existingTx.length > 0 && existingTx[0].status === 'success') {
      return NextResponse.json({ message: 'Already processed', donationId }, { status: 200 });
    }

    let matchedUserId: string | null = existingTx.length > 0 ? existingTx[0].matched_user_id : null;
    if (existingTx.length > 0 && existingTx[0].package_id) {
      targetPackageId = existingTx[0].package_id;
    }
    if (existingTx.length > 0 && existingTx[0].matched_user_email && !targetEmail) {
      targetEmail = existingTx[0].matched_user_email;
    }

    // 5. Cari user di DB jika belum ada matchedUserId
    let upgradedPro = false;
    let unlockedPackage = false;

    if (targetEmail || matchedUserId) {
      const userRows = matchedUserId
        ? await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE id = ${matchedUserId} LIMIT 1`
        : await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE LOWER(email) = ${targetEmail} LIMIT 1`;

      if (userRows.length > 0) {
        const u = userRows[0];
        matchedUserId = u.id;
        const currentUnlocked: string[] = Array.isArray(u.unlocked_packages) ? u.unlocked_packages : [];

        // Aturan Penyesuaian Harga:
        // A. Jika nominal >= PRO_THRESHOLD (Rp 40k+), atau pesan menyatakan "PRO": Buka SEMUA (PRO)
        if (amount >= PRO_THRESHOLD || message.toLowerCase().includes('pro')) {
          await sql`
            UPDATE users
            SET is_pro = TRUE,
                pro_activated_at = NOW(),
                saweria_donation_id = ${donationId}
            WHERE id = ${u.id}
          `;
          upgradedPro = true;
        }
        // B. Jika nominal >= TRYOUT_THRESHOLD (Rp 8k+) dan ada target paket: Buka paket tryout tersebut
        else if (targetPackageId && amount >= TRYOUT_THRESHOLD) {
          if (!currentUnlocked.includes(targetPackageId)) {
            currentUnlocked.push(targetPackageId);
          }
          await sql`
            UPDATE users
            SET unlocked_packages = ${JSON.stringify(currentUnlocked)}::jsonb
            WHERE id = ${u.id}
          `;
          unlockedPackage = true;
        }
      }
    }

    // 6. Simpan atau perbarui log transaksi
    if (existingTx.length > 0) {
      await sql`
        UPDATE saweria_transactions
        SET status = 'success',
            amount = ${amount},
            message = ${message},
            matched_user_id = ${matchedUserId},
            matched_user_email = ${targetEmail || null},
            package_id = ${targetPackageId},
            raw_payload = ${JSON.stringify(body)},
            updated_at = NOW()
        WHERE donation_id = ${donationId}
      `;
    } else {
      await sql`
        INSERT INTO saweria_transactions (
          donation_id, donator_name, donator_email, amount, message,
          matched_user_id, matched_user_email, status, package_id, raw_payload
        ) VALUES (
          ${donationId}, ${donatorName}, ${donatorEmail}, ${amount}, ${message},
          ${matchedUserId}, ${targetEmail || null}, 'success', ${targetPackageId}, ${JSON.stringify(body)}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      donationId,
      amount,
      targetEmail,
      matched: !!matchedUserId,
      upgradedPro,
      unlockedPackage,
      targetPackageId,
      message: upgradedPro
        ? `Akun ${targetEmail} berhasil di-upgrade ke PRO All-Access!`
        : unlockedPackage
        ? `Paket ${targetPackageId} berhasil di-unlock untuk ${targetEmail}!`
        : `Donasi tercatat (Rp ${amount.toLocaleString('id-ID')}).`,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Saweria Webhook Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
