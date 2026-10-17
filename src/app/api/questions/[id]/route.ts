import { NextRequest, NextResponse } from 'next/server';
import { loadPackage } from '@/lib/loadPackage';
import { getDb } from '@/lib/db';
import { toPublicQuestions } from '@/lib/questionPayload';

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
    // Scores, the correct answer, and the explanation are stripped: this
    // endpoint is unauthenticated and CDN-cached, so anything in the body is
    // public. The key is served by /api/results/[id]/review to the owner of a
    // submitted result, and one question at a time by /api/drill/check.
    { questions: toPublicQuestions(questions), meta },
    {
      headers: {
        // 20–120 KB of public question data per package: let the CDN absorb
        // repeat loads for 5 minutes; browser revalidates (max-age=0).
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
