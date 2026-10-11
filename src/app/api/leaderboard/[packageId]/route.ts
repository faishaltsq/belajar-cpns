import { NextRequest, NextResponse } from 'next/server';
import { getPackageLeaderboard } from '@/lib/db';

export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const list = await getPackageLeaderboard(params.packageId, 50);
    return NextResponse.json({
      packageId: params.packageId,
      leaderboard: list,
      totalParticipants: list.length,
    });
  } catch (e: unknown) {
    if (e instanceof Error) console.error('[api/leaderboard]', e.message);
    return NextResponse.json({ error: 'Gagal memuat papan peringkat.' }, { status: 500 });
  }
}
