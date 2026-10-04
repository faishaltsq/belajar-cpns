import { NextRequest, NextResponse } from 'next/server';
import { loadPackage, TRYOUT_LIST } from '@/lib/loadPackage';
import { getDb } from '@/lib/db';
import { Question } from '@/lib/types';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

function isAuthorized(req: NextRequest): boolean {
  const pin = req.headers.get('x-admin-pin') || req.nextUrl.searchParams.get('pin');
  return pin === ADMIN_PIN;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/admin/generate-custom
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      packageId = 'tryout-custom',
      title = 'Tryout Custom',
      twkCount = 10,
      tiuCount = 10,
      tkpCount = 10,
      includeImages = true,
      durationMinutes = 30,
    } = body;

    // Gather all questions from static packages
    const allQuestions: Question[] = [];
    for (const pkg of TRYOUT_LIST) {
      const qs = await loadPackage(pkg.id);
      allQuestions.push(...qs);
    }

    const twkPool = shuffle(allQuestions.filter((q) => q.category === 'TWK'));
    const tiuPool = shuffle(allQuestions.filter((q) => q.category === 'TIU'));
    const tkpPool = shuffle(allQuestions.filter((q) => q.category === 'TKP'));

    const selected: Question[] = [];

    // Sample TWK
    selected.push(...twkPool.slice(0, Math.min(twkCount, twkPool.length)));

    // Sample TIU — optionally include figural (with images)
    const tiuSelected: Question[] = [];
    if (includeImages) {
      // Figural = TIU questions with images
      const figuralPool = shuffle(tiuPool.filter(q => q.image));
      const plainTiu = shuffle(tiuPool.filter(q => !q.image));
      const figuralCount = Math.min(Math.floor(tiuCount * 0.3), figuralPool.length);
      tiuSelected.push(...figuralPool.slice(0, figuralCount));
      const remaining = tiuCount - tiuSelected.length;
      tiuSelected.push(...plainTiu.slice(0, Math.min(remaining, plainTiu.length)));
    } else {
      tiuSelected.push(...tiuPool.slice(0, Math.min(tiuCount, tiuPool.length)));
    }
    selected.push(...tiuSelected);

    // Sample TKP
    selected.push(...tkpPool.slice(0, Math.min(tkpCount, tkpPool.length)));

    // Re-number IDs sequentially
    const numbered = selected.map((q, i) => ({ ...q, id: i + 1 }));

    // Save to Neon DB
    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database not connected — set DATABASE_URL' }, { status: 500 });
    }

    const durationSec = durationMinutes * 60;

    // Upsert package
    await sql`
      INSERT INTO packages (id, title, question_count, duration_sec, is_active)
      VALUES (${packageId}, ${title}, ${numbered.length}, ${durationSec}, true)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        question_count = EXCLUDED.question_count,
        duration_sec = EXCLUDED.duration_sec,
        updated_at = now()
    `;

    // Delete old questions for this package, then insert fresh
    await sql`DELETE FROM questions WHERE package_id = ${packageId}`;

    for (const q of numbered) {
      // Derive correct_answer from options (the option id with score===5)
      const correctOpt = q.options.find((o) => o.score === 5);
      const correctAnswer = correctOpt?.id ?? null;

      // Derive tkp_scores: { A: score, B: score, ... } for TKP questions
      const tkpScores =
        q.category === 'TKP'
          ? q.options.reduce<Record<string, number>>((acc, o) => {
              acc[o.id] = o.score;
              return acc;
            }, {})
          : null;

      await sql`
        INSERT INTO questions (package_id, number, category, text, image, options, correct_answer, tkp_scores, explanation, difficulty)
        VALUES (
          ${packageId}, ${q.id}, ${q.category}, ${q.text}, ${q.image || null},
          ${JSON.stringify(q.options)}::jsonb,
          ${correctAnswer},
          ${tkpScores ? JSON.stringify(tkpScores) : null}::jsonb,
          ${q.explanation || null},
          'medium'
        )
      `;
    }

    return NextResponse.json({
      success: true,
      packageId,
      title,
      totalQuestions: numbered.length,
      twk: numbered.filter((q) => q.category === 'TWK').length,
      tiu: numbered.filter((q) => q.category === 'TIU').length,
      tkp: numbered.filter((q) => q.category === 'TKP').length,
      withImages: numbered.filter((q) => Boolean(q.image)).length,
      durationMinutes,
      savedTo: 'database',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
