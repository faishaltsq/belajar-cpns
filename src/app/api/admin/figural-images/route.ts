import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Dynamic: list all fig_*.png files from public/images/questions on disk
  const dir = path.join(process.cwd(), 'public', 'images', 'questions');
  let knownFiles: string[] = [];
  try {
    if (fs.existsSync(dir)) {
      knownFiles = fs.readdirSync(dir).filter(f => f.startsWith('fig_') && f.endsWith('.png')).sort();
    }
  } catch {
    // Fallback if readdir fails
  }

  // Fallback to static list if folder read fails (e.g. on serverless)
  if (knownFiles.length === 0) {
    knownFiles = [
      ...Array.from({ length: 17 }, (_, i) => `fig_analogi_${String(i + 1).padStart(2, '0')}.png`),
      ...Array.from({ length: 14 }, (_, i) => `fig_ketidaksamaan_${String(i + 1).padStart(2, '0')}.png`),
      ...Array.from({ length: 15 }, (_, i) => `fig_serial_${String(i + 1).padStart(2, '0')}.png`),
    ];
  }

  // Check DB for cropped data URL overrides
  const dbOverrides = new Map<string, string>();
  try {
    const sql = getDb();
    if (sql) {
      const rows = await sql`
        SELECT m.filename, q.image
        FROM figural_filename_map m
        JOIN questions q ON q.package_id = m.package_id AND q.number = m.question_number
        WHERE q.image LIKE 'data:image/%'
      `;
      for (const row of rows) {
        const r = row as { filename: string; image: string };
        if (r.filename && r.image) {
          dbOverrides.set(r.filename, r.image);
        }
      }
    }
  } catch (err) {
    console.warn('[figural-images] DB override lookup skipped:', (err as Error).message);
  }

  // Build response: prefer DB override (data URL), fallback to direct static file path
  const images = knownFiles.map(f => {
    let size = 0;
    try {
      size = fs.statSync(path.join(dir, f)).size;
    } catch { /* Vercel runtime: static files served separately */ }

    const override = dbOverrides.get(f);

    return {
      filename: f,
      url: override || `/images/questions/${f}`,
      size,
      overridden: Boolean(override),
    };
  });

  return NextResponse.json({ images });
}
