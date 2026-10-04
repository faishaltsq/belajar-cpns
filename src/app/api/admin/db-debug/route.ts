import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin');
  if (pin !== (process.env.ADMIN_PIN || '123456')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'No DB' });
  
  const envInfo = {
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_POSTGRES_URL: !!process.env.POSTGRES_URL,
    db_host: (() => {
      try { return new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL || '').host; } catch { return 'parse_error'; }
    })(),
  };

  const rows = await sql`
    SELECT package_id, number, image 
    FROM questions 
    WHERE package_id = 'tryout-mini' AND image IS NOT NULL
    ORDER BY number
  `;

  return NextResponse.json({ envInfo, rows });
}