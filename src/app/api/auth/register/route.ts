import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { findUserByEmail, getDb } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { escapeHtml } from '@/lib/sanitize';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`register:${ip}`, 5, 300);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pendaftaran. Coba lagi dalam ${rl.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const { email, password, name } = await req.json();

    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);

    const sql = getDb();
    if (!sql) throw new Error('Database not configured');

    const otp = generateOTP();
    // Hash unconditionally so response timing does not depend on account existence.
    const passwordHash = await hashPassword(password);
    const isDev = process.env.NODE_ENV !== 'production';

    // The verify link must live on the same domain the mail claims to come from.
    // A link pointing at *.vercel.app while the From: says lolosin.com is a
    // classic phishing signature and pushes the mail toward spam.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lolosin.com';

    let result: { success: boolean; error?: string };

    if (existing) {
      // Account already exists: identical response shape, notice sent by email.
      // Never touch email_otps here — an attacker must not be able to invalidate
      // a pending legit registration's OTP or mint one for the existing account.
      result = await sendOtpEmail({
        to: email,
        subject: 'Akun Lolos.in Kamu Sudah Terdaftar',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #eee;border-radius:16px">
            <h2 style="color:#c96442;margin-bottom:8px;font-size:24px">Lolos.in</h2>
            <p style="color:#333;margin-bottom:16px;font-size:15px">Halo <strong>${escapeHtml(name?.trim() || 'Peserta')}</strong>,</p>
            <p style="color:#555;margin-bottom:24px;font-size:14px;line-height:1.5">
              Email ini sudah terdaftar di Lolos.in. Kalau kamu memang ingin masuk, silakan login seperti biasa.
              Kalau lupa password, gunakan fitur pemulihan di halaman login.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${appUrl}/login" style="display:inline-block;background:#c96442;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px">
                Buka Halaman Login
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#aaa;font-size:11px">Jika kamu tidak merasa mendaftar di Lolos.in, abaikan email ini.</p>
          </div>
        `,
      });
    } else {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await sql`DELETE FROM email_otps WHERE email = ${email.toLowerCase()}`;
      await sql`
        INSERT INTO email_otps (email, otp, temp_password_hash, temp_name, expires_at)
        VALUES (${email.toLowerCase()}, ${otp}, ${passwordHash}, ${name?.trim() || 'Peserta CPNS'}, ${expiresAt.toISOString()})
      `;

      const verifyLink = `${appUrl}/api/auth/verify-link?email=${encodeURIComponent(email.toLowerCase())}&otp=${otp}`;

      const safeName = escapeHtml(name?.trim() || 'Peserta');

      const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #eee;border-radius:16px">
        <h2 style="color:#c96442;margin-bottom:8px;font-size:24px">Lolos.in</h2>
        <p style="color:#333;margin-bottom:16px;font-size:15px">Halo <strong>${safeName}</strong>,</p>
        <p style="color:#555;margin-bottom:24px;font-size:14px;line-height:1.5">
          Terima kasih telah mendaftar. Klik tombol di bawah ini untuk langsung memverifikasi akun dan masuk ke platform:
        </p>

        <!-- Tombol Verifikasi Sekali Klik -->
        <div style="text-align:center;margin:28px 0">
          <a href="${verifyLink}" style="display:inline-block;background:#c96442;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;box-shadow:0 2px 8px rgba(201,100,66,0.3)">
            ✓ Verifikasi & Masuk Sekarang
          </a>
        </div>

        <p style="color:#777;font-size:13px;text-align:center;margin:16px 0">
          Atau masukkan kode berikut secara manual di halaman verifikasi:
        </p>

        <!-- Kode OTP Manual -->
        <div style="background:#faf9f5;border:2px dashed #c96442;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c96442">${otp}</span>
        </div>

        <p style="color:#888;font-size:12px;line-height:1.4">
          • Link dan kode ini berlaku selama <strong>10 menit</strong>.<br>
          • Jika tombol di atas tidak dapat diklik, salin tautan berikut ke browser:<br>
          <a href="${verifyLink}" style="color:#c96442;word-break:break-all;font-size:11px">${verifyLink}</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#aaa;font-size:11px">Jika kamu tidak merasa mendaftar di Lolos.in, abaikan email ini.</p>
      </div>
    `;

      result = await sendOtpEmail({
        to: email,
        subject: `Kode Verifikasi Lolos.in: ${otp}`,
        html,
      });
    }

    if (!result.success) {
      console.warn('[auth/register] Email gagal terkirim:', result.error);
      if (isDev) {
        return NextResponse.json({
          success: true,
          requireOtp: true,
          email: email.toLowerCase(),
          devOtp: otp,
          notice: 'Mode Pengujian: Gunakan kode OTP ' + otp,
        });
      }
      return NextResponse.json(
        {
          error: 'Layanan email verifikasi sedang mengalami kendala. Silakan coba beberapa saat lagi atau hubungi bantuan.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      requireOtp: true,
      email: email.toLowerCase(),
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/register]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
