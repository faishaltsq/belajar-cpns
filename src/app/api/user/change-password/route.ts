import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function auth401() {
  return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const token = cookies().get('cpns_token')?.value;
  if (!token) return auth401();
  const payload = await verifyToken(token);
  if (!payload) return auth401();

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json();
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
  }

  const users = await sql`
    SELECT id, password_hash FROM users WHERE id = ${payload.userId} LIMIT 1
  `;
  if (!users.length) return auth401();

  const u = users[0];
  const isValid = await verifyPassword(currentPassword, u.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  await sql`
    UPDATE users SET password_hash = ${newHash} WHERE id = ${payload.userId}
  `;

  return NextResponse.json({ success: true, message: 'Password berhasil diperbarui' });
}
