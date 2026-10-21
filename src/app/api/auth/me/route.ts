import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('cpns_token')?.value;
  const store = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

  // This is a session probe, not a protected resource: the navbar asks it on
  // every page for every visitor. Answering "not logged in" with 401 made the
  // browser log a 401 console error on every page load for every guest.
  if (!token) {
    return NextResponse.json({ user: null }, { headers: store });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    // Same answer as a missing token — the client treats both as "logged out".
    return NextResponse.json({ user: null, session_expired: true }, { headers: store });
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
      headers: store,
    }
  );
}
