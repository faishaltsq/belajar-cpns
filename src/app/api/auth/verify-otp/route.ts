import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { createUser, getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email dan kode OTP wajib diisi.' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) throw new Error('Database not configured');

    // Cari OTP yang valid & belum kedaluwarsa
    const rows = await sql`
      SELECT * FROM email_otps 
      WHERE email = ${email.toLowerCase()} 
        AND otp = ${otp.trim()} 
        AND expires_at > now()
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Kode OTP salah atau sudah kedaluwarsa.' }, { status: 400 });
    }

    const pending = rows[0];

    // Buat user di DB
    const user = await createUser(
      pending.email,
      pending.temp_password_hash,
      pending.temp_name || 'Peserta CPNS'
    );

    // Hapus OTP yang sudah dipakai
    await sql`DELETE FROM email_otps WHERE email = ${email.toLowerCase()}`;

    // Buat JWT token dan set ke cookie (7 hari, httpOnly)
    const token = await createToken({ email: user.email, userId: user.id });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set('cpns_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/verify-otp]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
