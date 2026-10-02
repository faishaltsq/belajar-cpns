import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

// Question number → filename mapping
function numberToFilename(num: number): string | null {
  if (num >= 1 && num <= 17) return `fig_analogi_${String(num).padStart(2, '0')}.png`;
  if (num >= 18 && num <= 31) return `fig_ketidaksamaan_${String(num - 17).padStart(2, '0')}.png`;
  if (num >= 32 && num <= 46) return `fig_serial_${String(num - 31).padStart(2, '0')}.png`;
  return null;
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin');
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Known figural filenames (from build-time static assets)
  const knownFiles = [
    ...Array.from({ length: 17 }, (_, i) => `fig_analogi_${String(i + 1).padStart(2, '0')}.png`),
    ...Array.from({ length: 14 }, (_, i) => `fig_ketidaksamaan_${String(i + 1).padStart(2, '0')}.png`),
    ...Array.from({ length: 15 }, (_, i) => `fig_serial_${String(i + 1).padStart(2, '0')}.png`),
  ];

  // Check DB for data URL overrides
  const dbOverrides = new Map<string, string>();
  try {
    const sql = getDb();
    if (sql) {
      const rows = await sql`
        SELECT number, image FROM questions
        WHERE package_id = 'tryout-figural'
          AND image LIKE 'data:image/%'
      `;
      for (const row of rows) {
        const fname = numberToFilename((row as { number: number }).number);
        if (fname) {
          dbOverrides.set(fname, (row as { image: string }).image);
        }
      }
    }
  } catch {
    // DB unavailable — fall back to disk only
  }

  // Build response: prefer DB override, fallback to static file path
  const dir = path.join(process.cwd(), 'public', 'images', 'questions');
  const images = knownFiles.map(f => {
    let size = 0;
    try {
      size = fs.statSync(path.join(dir, f)).size;
    } catch { /* Vercel runtime: static files served separately */ }

    const isOverridden = dbOverrides.has(f);
    return {
      filename: f,
      url: isOverridden
        ? `/api/admin/figural-img?filename=${f}&pin=${pin}`
        : `/images/questions/${f}`,
      size,
      overridden: isOverridden,
    };
  });

  return NextResponse.json({ images });
}
