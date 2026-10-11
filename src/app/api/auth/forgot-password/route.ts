import { NextResponse } from 'next/server';
import { getDb, findUserByEmail } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`forgot-password:${ip}`, 5, 900);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan reset password. Coba lagi dalam ${rl.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      // Jangan ungkap bahwa email tidak terdaftar (security)
      return NextResponse.json({ success: true, message: 'Jika email terdaftar, kode OTP sudah dikirim.' });
    }

    const sql = getDb();
    if (!sql) throw new Error('Database not configured');

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Hapus OTP lama untuk email ini, simpan yang baru
    await sql`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;
    await sql`
      INSERT INTO password_resets (email, otp, expires_at)
      VALUES (${normalizedEmail}, ${otp}, ${expiresAt.toISOString()})
    `;

    // Kirim email OTP
    const result = await sendOtpEmail({
      to: normalizedEmail,
      subject: 'Kode Reset Password — Lolos.in',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px; background: #faf9f5; border-radius: 16px; border: 1px solid #e8e4dc;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #1a1a1a;">Reset Password</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #6b6b6b;">Masukkan kode OTP berikut di halaman reset password Lolos.in. Kode berlaku 10 menit.</p>
          <div style="background: #fff; border: 2px solid #c96442; border-radius: 12px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #c96442;">
            ${otp}
          </div>
          <p style="margin: 16px 0 0; font-size: 12px; color: #999;">Jika kamu tidak merasa meminta reset password, abaikan email ini.</p>
        </div>
      `,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    if (!result.success) {
      console.warn('[forgot-password] Email gagal terkirim:', result.error);
      if (isDev) {
        return NextResponse.json({
          success: true,
          message: 'Mode Pengujian: Kode OTP ' + otp,
          devOtp: otp,
        });
      }
      return NextResponse.json(
        { error: 'Gagal mengirim email reset password. Pastikan email aktif atau hubungi layanan bantuan.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kode OTP sudah dikirim ke email.',
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (err: unknown) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
