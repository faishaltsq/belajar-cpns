import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { findUserByEmail, getDb } from '@/lib/db';
import { Resend } from 'resend';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 409 });
    }

    const sql = getDb();
    if (!sql) throw new Error('Database not configured');

    const otp = generateOTP();
    const passwordHash = await hashPassword(password);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Hapus OTP lama untuk email ini, simpan yang baru
    await sql`DELETE FROM email_otps WHERE email = ${email.toLowerCase()}`;
    await sql`
      INSERT INTO email_otps (email, otp, temp_password_hash, temp_name, expires_at)
      VALUES (${email.toLowerCase()}, ${otp}, ${passwordHash}, ${name?.trim() || 'Peserta CPNS'}, ${expiresAt.toISOString()})
    `;

    // Kirim email OTP via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'Lolos.in <onboarding@resend.dev>',
          to: email,
          subject: `Kode Verifikasi Lolos.in: ${otp}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#c96442;margin-bottom:8px">Lolos.in</h2>
              <p style="color:#333;margin-bottom:16px">Halo <strong>${name || 'Peserta'}</strong>,</p>
              <p style="color:#555;margin-bottom:16px">Gunakan kode berikut untuk menyelesaikan pendaftaran akun Lolos.in:</p>
              <div style="background:#faf9f5;border:2px solid #c96442;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#c96442">${otp}</span>
              </div>
              <p style="color:#888;font-size:12px">Kode berlaku selama <strong>10 menit</strong>. Jangan bagikan ke siapapun.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
              <p style="color:#aaa;font-size:11px">Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
            </div>
          `,
        });
      } catch (err: unknown) {
        if (err instanceof Error) console.error('[auth/register] Gagal kirim email:', err.message);
      }
    } else {
      console.warn('[auth/register] RESEND_API_KEY belum di-set, email tidak terkirim.');
    }

    return NextResponse.json({
      success: true,
      requireOtp: true,
      email: email.toLowerCase(),
    });
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/register]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
