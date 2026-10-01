import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('cpns_token')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Tidak terautentikasi' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Token tidak valid' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  }

  // Ambil detail nama & profil user dari database
  const dbUser = await findUserById(payload.userId);

  return NextResponse.json(
    {
      user: {
        id: payload.userId,
        email: payload.email,
        name: dbUser?.name || payload.email.split('@')[0],
        phone: dbUser?.phone || null,
      },
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}
