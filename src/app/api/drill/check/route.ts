import { NextRequest, NextResponse } from 'next/server';
import { loadPackage } from '@/lib/loadPackage';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Drill reveals the key one question at a time, after the learner answers.
 *
 * The old drill page pulled whole packages from /api/questions and compared
 * `options[].score` client-side, which meant the key shipped with the exam.
 * That endpoint now strips scores, so drill asks here instead: it sends the
 * question id and its chosen option, and gets back only that question's key.
 *
 * Deliberately unauthenticated — drill is a free study feature and the request
 * is scoped to a single question the caller has already attempted. Rate-limited
 * because walking a whole package one question at a time is the abuse case.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(`drill:${getClientIp(req)}`, 60, 60);
    if (!rl.success) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
    }

    const body = await req.json();
    const { packageId, questionId, selectedOptionId } = body;

    if (typeof packageId !== 'string' || !packageId) {
      return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
    }

    const numericQuestionId = Number(questionId);
    if (!Number.isInteger(numericQuestionId)) {
      return NextResponse.json({ error: 'questionId must be an integer' }, { status: 400 });
    }

    const questions = await loadPackage(packageId);
    const question = questions.find((q) => q.id === numericQuestionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const scores = question.options.map((o) => (typeof o.score === 'number' ? o.score : 0));
    const maxScore = Math.max(...scores);
    const chosen = question.options.find((o) => o.id === selectedOptionId);
    const userScore = chosen && typeof chosen.score === 'number' ? chosen.score : 0;
    const isCorrect = question.category === 'TKP' ? userScore >= 4 : userScore === maxScore && maxScore > 0;

    return NextResponse.json(
      {
        correctOptionId: question.options[scores.indexOf(maxScore)]?.id ?? null,
        userScore,
        maxScore,
        isCorrect,
        explanation: question.explanation ?? '',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
