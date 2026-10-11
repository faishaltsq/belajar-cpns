import { NextRequest, NextResponse } from 'next/server';
import { saveExamResult } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageId, answers, scoreTwk, scoreTiu, scoreTkp, totalScore, isPassed, durationUsed, userId } = body;
    if (!packageId || totalScore === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      scoreTwk: scoreTwk ?? 0,
      scoreTiu: scoreTiu ?? 0,
      scoreTkp: scoreTkp ?? 0,
      totalScore,
      isPassed: !!isPassed,
      durationUsed: durationUsed ?? undefined,
    });
    return NextResponse.json({ success: true, id });
  } catch (e: unknown) {
    if (e instanceof Error) console.error('[api/results]', e.message);
    return NextResponse.json({ error: 'Gagal menyimpan hasil ujian.' }, { status: 500 });
  }
}
