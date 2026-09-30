import { NextResponse } from 'next/server';
import { hashPassword, createToken } from '@/lib/auth';
import { findUserByEmail, createUser } from '@/lib/db';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, name?.trim() || 'Peserta CPNS');
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
    if (error instanceof Error) console.error('[auth/register]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
