import { NextRequest, NextResponse } from 'next/server';
import { loadPackage } from '@/lib/loadPackage';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    { questions, meta },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
