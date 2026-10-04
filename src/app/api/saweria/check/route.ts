import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkSaweriaQrisStatus } from '@/lib/saweria';

export async function POST(req: NextRequest) {
  return handleCheck(req);
}

export async function GET(req: NextRequest) {
  return handleCheck(req);
}

async function handleCheck(req: NextRequest) {
  try {
    let donationId = req.nextUrl.searchParams.get('donationId') || req.nextUrl.searchParams.get('id');

    if (!donationId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      donationId = body.donationId || body.id;
    }

    if (!donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    // 1. Cek record transaksi di DB
    const txRows = await sql`
      SELECT id, donation_id, status, amount, message, matched_user_id, matched_user_email, package_id
      FROM saweria_transactions
      WHERE donation_id = ${donationId}
      LIMIT 1
    `;

    const tx = txRows.length > 0 ? txRows[0] : null;

    // Jika sudah tercatat success di DB
    if (tx && tx.status === 'success') {
      return NextResponse.json({
        paid: true,
        alreadyProcessed: true,
        packageId: tx.package_id,
        userEmail: tx.matched_user_email,
        message: 'Pembayaran sudah dikonfirmasi.',
      });
    }

    // 2. Cek status ke Saweria API
    const check = await checkSaweriaQrisStatus(donationId);

    if (!check.paid) {
      return NextResponse.json({
        paid: false,
        donationId,
        message: 'Menunggu pembayaran QRIS...',
      });
    }

    // 3. Pembayaran telah selesai! Aktifkan akses di DB
    const targetUserId = tx?.matched_user_id;
    const targetEmail = tx?.matched_user_email;
    const packageId = tx?.package_id;
    const amount = Number(tx?.amount || 0);

    let isPro = false;
    let unlockedPackages: string[] = [];

    if (targetUserId || targetEmail) {
      // Ambil data user
      const userRows = targetUserId 
        ? await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE id = ${targetUserId} LIMIT 1`
        : await sql`SELECT id, email, is_pro, unlocked_packages FROM users WHERE LOWER(email) = ${targetEmail.toLowerCase()} LIMIT 1`;

      if (userRows.length > 0) {
        const u = userRows[0];
        const existingUnlocked: string[] = Array.isArray(u.unlocked_packages) ? u.unlocked_packages : [];

        // Aturan: Jika tanpa packageId tertentu, atau amount >= 40.000, berikan PRO All-Access
        const isUpgradePro = !packageId || amount >= 40000;

        if (isUpgradePro) {
          isPro = true;
          await sql`
            UPDATE users
            SET is_pro = TRUE,
                pro_activated_at = NOW(),
                saweria_donation_id = ${donationId}
            WHERE id = ${u.id}
          `;
        } else if (packageId) {
          if (!existingUnlocked.includes(packageId)) {
            existingUnlocked.push(packageId);
          }
          unlockedPackages = existingUnlocked;
          await sql`
            UPDATE users
            SET unlocked_packages = ${JSON.stringify(existingUnlocked)}::jsonb
            WHERE id = ${u.id}
          `;
        }
      }
    }

    // Update status transaksi di DB
    await sql`
      UPDATE saweria_transactions
      SET status = 'success',
          updated_at = NOW()
      WHERE donation_id = ${donationId}
    `;

    return NextResponse.json({
      paid: true,
      donationId,
      isPro,
      packageId,
      unlockedPackages,
      message: 'Pembayaran berhasil diverifikasi! Akses telah aktif.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
