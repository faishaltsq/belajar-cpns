import { NextRequest, NextResponse } from 'next/server';
import { saveExamResult } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { scoreSubmission } from '@/lib/serverScoring';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`results:${ip}`, 20, 300);
    if (!rl.success) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json();
    const { packageId, answers, durationUsed } = body;

    if (typeof packageId !== 'string' || !packageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Score is derived from the answers against the stored package. Any
    // client-supplied totalScore/scoreTwk/... is ignored — see
    // src/lib/serverScoring.ts for why.
    const scored = await scoreSubmission(packageId, answers ?? {}, Number(durationUsed));
    if (!scored.ok) {
      const status = scored.reason === 'Package not found' ? 404 : 400;
      return NextResponse.json({ error: scored.reason }, { status });
    }

    // Keamanan IDOR: Hanya gunakan userId dari token sesi terverifikasi
    let finalUserId: string | undefined = undefined;
    const cookieStore = cookies();
    const token = cookieStore.get('cpns_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.userId) finalUserId = payload.userId;
    }

    const id = await saveExamResult({
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

    return NextResponse.json({ success: true, id, result: scored.result, questionScores });
  } catch (e: unknown) {
    if (e instanceof Error) console.error('[api/results]', e.message);
    return NextResponse.json({ error: 'Gagal menyimpan hasil ujian.' }, { status: 500 });
  }
}
