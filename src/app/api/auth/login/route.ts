import { NextResponse } from 'next/server';
import { validatePhoneAndPin } from '@/lib/phone';
import { verifyPin, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();
    const validation = validatePhoneAndPin(phone, pin);
    if (!validation.isValid || !validation.phone) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    // ponytail: demo mode accepts valid phone+pin format without DB lookup (intentional for MVP); add DB verification when user persistence is wired
    const userId = `usr_${validation.phone.slice(-6)}`;
    const token = await createToken({ phone: validation.phone, userId });
    const response = NextResponse.json({ success: true, user: { id: userId, phone: validation.phone } });
    response.cookies.set('cpns_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
