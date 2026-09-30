import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TRYOUT_LIST } from '@/lib/loadPackage';

export const dynamic = 'force-dynamic';

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
        return NextResponse.json({
          packages: rows.map(r => ({
            id: r.id,
            label: r.label,
            desc: r.desc || `${r.question_count} soal (${Math.round((r.duration_sec || 6000) / 60)} menit)`,
            badge: r.id === 'tryout-mini' ? 'Coba Gratis' : r.id === 'tryout-1' ? 'Populer' : null,
          })),
        });
      }
    } catch {
      // fallback to static
    }
  }

  return NextResponse.json({ packages: TRYOUT_LIST });
}
