import { NextResponse } from 'next/server';
import { validatePhoneAndPin } from '@/lib/phone';
import { verifyPin, createToken } from '@/lib/auth';
import { findUserByPhone } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();
    const validation = validatePhoneAndPin(phone, pin);
    if (!validation.isValid || !validation.phone) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const user = await findUserByPhone(validation.phone);
    if (!user) {
      return NextResponse.json({ error: 'Nomor HP belum terdaftar. Silakan daftar terlebih dahulu.' }, { status: 404 });
    }
    const valid = await verifyPin(pin, user.pin_hash);
    if (!valid) {
      return NextResponse.json({ error: 'PIN salah. Periksa kembali PIN Anda.' }, { status: 401 });
    }
    const token = await createToken({ phone: user.phone, userId: user.id });
    const response = NextResponse.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name } });
    response.cookies.set('cpns_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth/login]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
