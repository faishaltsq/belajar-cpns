import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { loadPackage } from '@/lib/loadPackage';
import { toReviewQuestion } from '@/lib/questionPayload';

export const dynamic = 'force-dynamic';

/**
 * Post-exam review payload: the full question including the answer key and the
 * explanation. Gated on the caller owning the submitted result — a result id
 * alone is not enough, since it is guessable (`<packageId>-<timestamp>`) and
 * gets shared in URLs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get('cpns_token')?.value;
  const payload = token ? await verifyToken(token) : null;
  const callerId = payload?.userId ?? null;

  let rows;
  try {
    rows = await sql`
      SELECT user_id, package_id
      FROM exam_results
      WHERE id = ${params.id}
      LIMIT 1
    `;
  } catch {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  }

  const owner = rows[0].user_id as string | null;
  // Anonymous results are readable by anyone holding the id (the exam itself is
  // free and the id is only in that browser's sessionStorage). Once a result
  // belongs to an account, only that account may read it.
  if (owner && owner !== callerId) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  }

  const questions = await loadPackage(rows[0].package_id as string);
  if (!questions.length) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  return NextResponse.json(
    { questions: questions.map((q) => toReviewQuestion(q)) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
