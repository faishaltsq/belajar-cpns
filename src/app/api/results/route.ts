import { NextRequest, NextResponse } from 'next/server';
import { saveExamResult } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { scoreSubmission } from '@/lib/serverScoring';
import { checkPackageAccess, getSessionUserId } from '@/lib/entitlement';
import { toReviewQuestion } from '@/lib/questionPayload';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`results:${ip}`, 20, 300);
    if (!rl.success) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json();
    const { packageId, answers, durationUsed } = body;

    // Mode Latihan Mandiri must stay off the leaderboard, and `exam_results`
    // has no column to mark a row as practice — so a practice submission is
    // scored here and returned, but never written. Persisting it would put a
    // practice score on the official ranking for that package.
    const isPractice = body?.practice === true;

    if (typeof packageId !== 'string' || !packageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Keamanan IDOR + entitlement: only a verified session may submit, and only
    // for a package that session is allowed to sit. Scoring an unearned package
    // would both leak that the package exists and write an unbacked result row.
    const callerId = await getSessionUserId();

    const access = await checkPackageAccess(packageId);
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.reason === 'login_required'
              ? 'Silakan masuk terlebih dahulu.'
              : 'Paket ini memerlukan akses berbayar.',
          reason: access.reason,
        },
        { status: 403 }
      );
    }

    // Score is derived from the answers against the stored package. Any
    // client-supplied totalScore/scoreTwk/... is ignored — see
    // src/lib/serverScoring.ts for why.
    const scored = await scoreSubmission(packageId, answers ?? {}, Number(durationUsed));
    if (!scored.ok) {
      const status = scored.reason === 'Package not found' ? 404 : 400;
      return NextResponse.json({ error: scored.reason }, { status });
    }

    const finalUserId: string | undefined = callerId ?? undefined;

    const id = isPractice
      ? null
      : await saveExamResult({
          userId: finalUserId,
          packageId,
          answers: answers ?? {},
          scoreTwk: scored.result.twk.score,
          scoreTiu: scored.result.tiu.score,
          scoreTkp: scored.result.tkp.score,
          totalScore: scored.result.totalScore,
          isPassed: scored.result.isPassedAll,
          durationUsed: scored.result.durationSeconds || undefined,
        });

    // Per-question scores so the client can persist an accurate snapshot. The
    // review page and the wrong-answer collector both read the stored questions,
    // and those no longer carry option scores (audit F3) — so the worth of each
    // question travels with the result instead of being re-derived client-side.
    const questionScores = scored.questions.map((q) => {
      const chosenId = (answers as Record<string, string | null>)?.[String(q.id)] ?? null;
      const chosen = q.options.find((o) => o.id === chosenId);
      return {
        questionId: q.id,
        score: chosen ? chosen.score : 0,
        maxScore: Math.max(0, ...q.options.map((o) => o.score)),
      };
    });

    // A practice result has no row to look the key up from later, so the review
    // payload rides along with the score. Same entitlement gate and same rate
    // limit as a normal submission — this is the drill/check oracle by another
    // route, so it is not offered for free packages to unauthenticated callers
    // any more generously than before.
    const review = isPractice
      ? scored.questions.map((q) => toReviewQuestion(q))
      : undefined;

    return NextResponse.json({
      success: true,
      id,
      result: scored.result,
      questionScores,
      ...(review ? { review } : {}),
    });
  } catch (e: unknown) {
    if (e instanceof Error) console.error('[api/results]', e.message);
    return NextResponse.json({ error: 'Gagal menyimpan hasil ujian.' }, { status: 500 });
  }
}
