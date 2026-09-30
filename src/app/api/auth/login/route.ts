import { NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Email belum terdaftar. Silakan daftar terlebih dahulu.' }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Password salah. Periksa kembali.' }, { status: 401 });
    }

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
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/login]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
