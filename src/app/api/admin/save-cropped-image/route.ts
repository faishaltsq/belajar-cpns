import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin');
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { filename, dataUrl } = await req.json();

    if (!filename || !dataUrl) {
      return NextResponse.json({ error: 'Missing filename or dataUrl' }, { status: 400 });
    }

    const safeName = path.basename(filename);
    if (!safeName.startsWith('fig_') || !safeName.endsWith('.png')) {
      return NextResponse.json({ error: 'Only fig_*.png files can be edited' }, { status: 400 });
    }

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Invalid data URL (must be image/png base64)' }, { status: 400 });
    }

    let dbUpdated = 0;
    try {
      const sql = getDb();
      if (sql) {
        // Derive question number from filename for reliable re-crop support
        // (after first crop, image is a data URL and won't match LIKE '%fig_*%')
        const filenameMatch = safeName.match(/^fig_(analogi|ketidaksamaan|serial)_(\d+)\.png$/);
        let numStart = 0;
        if (filenameMatch) {
          const type = filenameMatch[1];
          const n = parseInt(filenameMatch[2], 10);
          if (type === 'analogi')        numStart = n;
          if (type === 'ketidaksamaan')  numStart = n + 17;
          if (type === 'serial')         numStart = n + 31;
        }

        if (numStart > 0) {
          const res = await sql`
            UPDATE questions
            SET image = ${dataUrl}
            WHERE package_id = 'tryout-figural'
              AND number = ${numStart}
          `;
          dbUpdated = (res as unknown as { rowCount: number }).rowCount || 0;
        } else {
          const matchPattern = `%${safeName}%`;
          const res = await sql`
            UPDATE questions
            SET image = ${dataUrl}
            WHERE image LIKE ${matchPattern}
          `;
          dbUpdated = (res as unknown as { rowCount: number }).rowCount || 0;
        }
      }
    } catch (dbErr) {
      console.warn('DB update skipped:', (dbErr as Error).message);
    }

    // 2. Also try writing to local disk (local dev only, EROFS on Vercel = ignored)
    let fsUpdated = false;
    try {
      const b64 = dataUrl.split(',')[1];
      const buffer = Buffer.from(b64, 'base64');
      const filePath = path.join(process.cwd(), 'public', 'images', 'questions', safeName);
      fs.writeFileSync(filePath, buffer);
      fsUpdated = true;
    } catch {
      // Expected on Vercel: EROFS read-only filesystem — DB is source of truth
    }

    const persisted = dbUpdated > 0 || fsUpdated;
    return NextResponse.json({
      success: persisted,
      filename: safeName,
      db_rows_updated: dbUpdated,
      filesystem: fsUpdated,
      message: dbUpdated > 0
        ? `Berhasil! ${dbUpdated} soal diupdate di database.`
        : fsUpdated
        ? 'Disimpan ke disk lokal.'
        : 'Tidak ada soal yang cocok di database.',
      url: dataUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
