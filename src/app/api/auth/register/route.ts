import { NextResponse } from 'next/server';
import { validatePhoneAndPin } from '@/lib/phone';
import { hashPin, createToken } from '@/lib/auth';

// ponytail: in-memory Map resets on cold start; replace with DB (Prisma/Supabase) when persistence needed
const localUsers = new Map<string, { id: string; phone: string; pinHash: string; name: string }>();

export async function POST(req: Request) {
  try {
    const { phone, pin, name } = await req.json();
    const validation = validatePhoneAndPin(phone, pin);
    if (!validation.isValid || !validation.phone) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    if (localUsers.has(validation.phone)) {
      return NextResponse.json({ error: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 409 });
    }
    const pinHash = await hashPin(pin);
    const userId = `usr_${crypto.randomUUID()}`;
    localUsers.set(validation.phone, { id: userId, phone: validation.phone, pinHash, name: name || 'Peserta CPNS' });
    const token = await createToken({ phone: validation.phone, userId });
    const response = NextResponse.json({ success: true, user: { id: userId, phone: validation.phone, name: name || 'Peserta CPNS' } });
    response.cookies.set('cpns_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) console.error('[auth]', error.message);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
