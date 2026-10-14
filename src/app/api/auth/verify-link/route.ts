import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createToken } from '@/lib/auth';
import { createUser, getDb } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// GET /api/auth/verify-link?email=...&otp=...
// Dipakai dari link "Verifikasi Akun" di email OTP
// Setelah OTP valid: buat user, set cookie JWT, redirect ke /
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`verify-otp:${ip}`, 5, 300);
    if (!rl.success) {
      const url = new URL('/login', req.nextUrl.origin);
      url.searchParams.set('error', 'Terlalu banyak percobaan. Coba lagi nanti.');
      return NextResponse.redirect(url);
    }

    const email = req.nextUrl.searchParams.get('email') ?? '';
    const otp = req.nextUrl.searchParams.get('otp') ?? '';

    const origin = req.nextUrl.origin;

    if (!email || !otp) {
      return NextResponse.redirect(new URL('/login?error=Link+verifikasi+tidak+valid.', origin));
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.redirect(new URL('/login?error=Kesalahan+server.+Coba+lagi.', origin));
    }

    const rows = await sql`
      SELECT * FROM email_otps
      WHERE email = ${email.toLowerCase()}
        AND otp   = ${otp.trim()}
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(
        new URL('/login?error=Link+verifikasi+sudah+kedaluwarsa+atau+tidak+valid.', origin)
      );
    }

    const pending = rows[0];

    // Buat user di DB (tangani race condition jika link diklik dua kali)
    let user;
    try {
      user = await createUser(
        pending.email,
        pending.temp_password_hash,
        pending.temp_name || 'Peserta CPNS'
      );
    } catch {
      // User mungkin sudah dibuat (klik link dua kali) — cari dari DB
      const existing = await sql`SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
      if (existing.length === 0) {
        return NextResponse.redirect(
          new URL('/login?error=Gagal+membuat+akun.+Hubungi+bantuan.', origin)
        );
      }
      user = existing[0];
    }

    // Hapus OTP yang sudah dipakai
    await sql`DELETE FROM email_otps WHERE email = ${email.toLowerCase()}`;

    // Buat JWT token
    const token = await createToken({ email: user.email, userId: user.id });

    // Redirect ke halaman utama dengan cookie aktif
    const response = NextResponse.redirect(new URL('/', origin));

    response.cookies.set('cpns_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/verify-link]', error.message);
    return NextResponse.redirect(
      new URL('/login?error=Terjadi+kesalahan+server.', new URL(req.url).origin)
    );
  }
}
