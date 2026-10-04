import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) {
      return NextResponse.json({ is_pro: false, logged_in: false });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ is_pro: false, logged_in: false });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ is_pro: false, logged_in: false });
    }
    const rows = await sql`
      SELECT is_pro, pro_activated_at, email, unlocked_packages FROM users WHERE id = ${payload.userId} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ is_pro: false, logged_in: false, unlocked_packages: [] });
    }

    return NextResponse.json({
      logged_in: true,
      is_pro: rows[0].is_pro || false,
      pro_activated_at: rows[0].pro_activated_at,
      email: rows[0].email,
      unlocked_packages: Array.isArray(rows[0].unlocked_packages) ? rows[0].unlocked_packages : [],
    });
  } catch {
    return NextResponse.json({ is_pro: false, logged_in: false });
  }
}
