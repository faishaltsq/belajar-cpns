import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('cpns_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
  return NextResponse.json({ user: payload });
}
