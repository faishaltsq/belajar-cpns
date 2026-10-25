import { NextRequest, NextResponse } from 'next/server';
import { getPackageLeaderboard } from '@/lib/db';
import { getSessionUserId } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/leaderboard/[packageId]
 *
 * Papan peringkat nasional untuk SATU paket tryout. Papan itu publik — dibaca
 * tanpa login — dan isinya selalu dihitung dari `WHERE package_id = <packageId>`
 * di `getPackageLeaderboard`, jadi skor paket lain tidak pernah masuk ke sini.
 *
 * Query opsional `?resultId=<uuid>`: id hasil yang baru dikerjakan pemanggil.
 * Baris itu selalu ikut dikembalikan sebagai `me` walau peringkatnya di luar
 * 50 besar, sehingga user peringkat 300 tetap melihat posisinya. User yang
 * login dikenali dari cookie sesi, jadi `me` biasanya ketemu tanpa query apa pun.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { packageId: string } }
) {
  const packageId = params.packageId;
  if (!packageId || typeof packageId !== 'string') {
    return NextResponse.json({ error: 'Paket tidak valid.' }, { status: 400 });
  }

  try {
    const userId = await getSessionUserId();
    const board = await getPackageLeaderboard(packageId, {
      limit: 50,
      userId,
      resultId: req.nextUrl.searchParams.get('resultId'),
    });

    return NextResponse.json(
      {
        packageId,
        leaderboard: board.rows,
        me: board.me,
        totalParticipants: board.totalParticipants,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: unknown) {
    if (e instanceof Error) console.error('[api/leaderboard]', e.message);
    return NextResponse.json({ error: 'Gagal memuat papan peringkat.' }, { status: 500 });
  }
}
