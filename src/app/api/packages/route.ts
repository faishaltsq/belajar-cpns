import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TRYOUT_LIST } from '@/lib/loadPackage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT id, title as label, description as desc, question_count, duration_sec, is_active
        FROM packages
        WHERE is_active = true
        ORDER BY created_at ASC
      `;
      if (rows && rows.length > 0) {
        // Merge DB rows dengan metadata section dari TRYOUT_LIST
        const metaMap = new Map(TRYOUT_LIST.map(p => [p.id, p]));
        const pkgs = rows.map((r) => {
          const meta = metaMap.get(r.id as string);
          return {
            id: r.id,
            label: r.label,
            desc: r.desc || `${r.question_count} soal (${Math.round((r.duration_sec || 6000) / 60)} menit)`,
            badge: meta?.badge ?? (r.id === 'tryout-mini' ? 'Coba Gratis' : null),
            section: meta?.section ?? 'standard',
            questionCount: meta?.questionCount ?? (r.question_count || 110),
            durationMin: meta?.durationMin ?? Math.round((r.duration_sec || 6000) / 60),
          };
        });
        return NextResponse.json(
          { packages: pkgs },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            },
          }
        );
      }
    } catch {
      // fallback
    }
  }

  return NextResponse.json({ packages: TRYOUT_LIST });
}
