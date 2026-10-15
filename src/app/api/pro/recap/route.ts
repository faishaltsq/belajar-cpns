// src/app/api/pro/recap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { aggregateWrongAnswers, groupByCategory } from '@/lib/wrongAnswerRecap';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const token = cookies().get('cpns_token')?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const userRows = await sql`
      SELECT is_pro FROM users WHERE id = ${payload.userId} LIMIT 1
    `;
    if (userRows.length === 0 || !userRows[0].is_pro) {
      return NextResponse.json(
        { error: 'PRO_REQUIRED', message: 'Fitur ini hanya untuk akun PRO.' },
        { status: 403 }
      );
    }

    const [resultRows, questionRows] = await Promise.all([
      sql`
        SELECT package_id, answers
        FROM exam_results
        WHERE user_id = ${payload.userId}
          AND answers IS NOT NULL
          AND answers::text <> '{}'
        ORDER BY finished_at ASC
      `,
      sql`
        SELECT package_id, number, category, correct_answer, explanation, options
        FROM questions
      `,
    ]);

    const results = (resultRows as any[]).map((r) => ({
      packageId: r.package_id,
      answers: (r.answers ?? {}) as Record<string, string>,
    }));

    const questions = (questionRows as any[]).map((q) => ({
      packageId: q.package_id,
      number: Number(q.number),
      category: q.category,
      correctAnswer: q.correct_answer ?? null,
      explanation: q.explanation ?? null,
      options: Array.isArray(q.options)
        ? q.options.map((o: any) => ({ id: o?.id ?? '', score: typeof o?.score === 'number' ? o.score : 0 }))
        : [],
    }));

    const items = aggregateWrongAnswers(results, questions);
    const grouped = groupByCategory(items);

    const byPackage: Record<string, number> = {};
    for (const i of items) byPackage[i.packageId] = (byPackage[i.packageId] ?? 0) + 1;

    return NextResponse.json({ success: true, isPro: true, total: items.length, grouped, byPackage });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pro/recap]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
