import { NextRequest, NextResponse } from 'next/server';
import { loadPackage } from '@/lib/loadPackage';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sql = getDb();
  let debugSource = 'none';
  if (sql) {
    try {
      const check = await sql`SELECT count(*)::int as c FROM questions WHERE package_id = ${params.id}`;
      debugSource = `db_count_${check[0]?.c}`;
    } catch (e: any) {
      debugSource = `db_error_${e?.message?.slice(0, 30)}`;
    }
  } else {
    debugSource = 'no_sql_client';
  }

  const questions = await loadPackage(params.id);

  if (!questions.length) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  // Fetch package settings from DB
  let meta = { duration_sec: 6000, randomize_questions: false, randomize_options: false };
  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT duration_sec, randomize_questions, randomize_options
        FROM packages WHERE id = ${params.id}
      `;
      if (rows?.[0]) {
        meta = {
          duration_sec: rows[0].duration_sec ?? 6000,
          randomize_questions: Boolean(rows[0].randomize_questions),
          randomize_options: Boolean(rows[0].randomize_options),
        };
      }
    } catch {}
  }

  return NextResponse.json(
    { questions, meta, _debug: { source: debugSource, q18_image: questions.find((q: any) => q.id === 18)?.image?.toString().slice(0, 60) || 'not_found' } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
