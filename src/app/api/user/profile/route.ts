import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function auth401() {
  return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
}

export async function GET() {
  const token = cookies().get('cpns_token')?.value;
  if (!token) return auth401();
  const payload = await verifyToken(token);
  if (!payload) return auth401();

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const users = await sql`
    SELECT id, email, phone, name, is_pro, pro_activated_at, created_at,
           target_instansi, target_formasi
    FROM users WHERE id = ${payload.userId} LIMIT 1
  `;
  if (!users.length) return auth401();
  const u = users[0];

  // Exam stats
  const stats = await sql`
    SELECT
      COUNT(*)::int AS total_exams,
      COALESCE(ROUND(AVG(total_score)), 0)::int AS avg_score,
      COALESCE(MAX(total_score), 0)::int AS highest_score,
      COALESCE(SUM(CASE WHEN is_passed THEN 1 ELSE 0 END), 0)::int AS pass_count
    FROM exam_results
    WHERE user_id = ${payload.userId}
  `;
  const s = stats[0] || { total_exams: 0, avg_score: 0, highest_score: 0, pass_count: 0 };

  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      isPro: Boolean(u.is_pro),
      proActivatedAt: u.pro_activated_at,
      createdAt: u.created_at,
      targetInstansi: u.target_instansi,
      targetFormasi: u.target_formasi,
    },
    stats: {
      totalExams: s.total_exams,
      avgScore: s.avg_score,
      highestScore: s.highest_score,
      passCount: s.pass_count,
      passRate: s.total_exams > 0
        ? Math.round((s.pass_count / s.total_exams) * 100)
        : 0,
    },
  });
}

export async function PUT(req: NextRequest) {
  const token = cookies().get('cpns_token')?.value;
  if (!token) return auth401();
  const payload = await verifyToken(token);
  if (!payload) return auth401();

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json();
  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const targetInstansi = (body.targetInstansi ?? '').trim().slice(0, 100);
  const targetFormasi = (body.targetFormasi ?? '').trim().slice(0, 100);

  if (name.length < 2) {
    return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE users
    SET name = ${name},
        phone = ${phone || null},
        target_instansi = ${targetInstansi || null},
        target_formasi = ${targetFormasi || null}
    WHERE id = ${payload.userId}
    RETURNING id, email, phone, name, target_instansi, target_formasi
  `;

  if (!rows.length) return auth401();

  return NextResponse.json({ success: true, user: rows[0] });
}
