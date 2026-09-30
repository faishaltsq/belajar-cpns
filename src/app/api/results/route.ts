import { NextRequest, NextResponse } from 'next/server';
import { saveExamResult } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageId, answers, scoreTwk, scoreTiu, scoreTkp, totalScore, isPassed, durationUsed, userId } = body;
    if (!packageId || totalScore === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const id = await saveExamResult({
      userId: userId || undefined,
      packageId,
      answers: answers ?? {},
      scoreTwk: scoreTwk ?? 0,
      scoreTiu: scoreTiu ?? 0,
      scoreTkp: scoreTkp ?? 0,
      totalScore,
      isPassed: !!isPassed,
      durationUsed: durationUsed ?? undefined,
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
