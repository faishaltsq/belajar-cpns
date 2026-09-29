import { NextResponse } from 'next/server';
import { validatePhoneAndPin } from '@/lib/phone';
import { hashPin, createToken } from '@/lib/auth';
import { findUserByPhone, createUser } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { phone, pin, name } = await req.json();
    const validation = validatePhoneAndPin(phone, pin);
    if (!validation.isValid || !validation.phone) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const existing = await findUserByPhone(validation.phone);
    if (existing) {
      return NextResponse.json({ error: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 409 });
    }
    const pinHash = await hashPin(pin);
    const user = await createUser(validation.phone, pinHash, name || 'Peserta CPNS');
    const token = await createToken({ phone: user.phone, userId: user.id });
    const response = NextResponse.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
    response.cookies.set('cpns_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/register]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
