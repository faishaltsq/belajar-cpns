import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
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
        // Generic: update semua soal yang image field-nya referensi filename ini (semua paket)
        const matchPattern = `%${safeName}%`;
        const resByFilename = await sql`
          UPDATE questions
          SET image = ${dataUrl}
          WHERE image LIKE ${matchPattern}
          RETURNING number, package_id
        `;
        dbUpdated += Array.isArray(resByFilename) ? resByFilename.length : 0;

        // Re-crop support: jika sudah pernah di-crop (data URL sudah ada), cari via figural_filename_map
        if (dbUpdated === 0) {
          const mapRows = await sql`
            SELECT package_id, question_number FROM figural_filename_map
            WHERE filename = ${safeName}
            LIMIT 1
          `;
          if (mapRows.length > 0) {
            const { package_id, question_number } = mapRows[0] as { package_id: string; question_number: number };
            const resMap = await sql`
              UPDATE questions
              SET image = ${dataUrl}
              WHERE package_id = ${package_id} AND number = ${question_number}
              RETURNING number
            `;
            dbUpdated += Array.isArray(resMap) ? resMap.length : 0;
          }
        } else {
          // Sync cross-package: update soal di paket lain yang punya teks soal sama tapi image sudah data URL
          const updatedRows = Array.isArray(resByFilename) ? resByFilename as { number: number; package_id: string }[] : [];
          for (const row of updatedRows.slice(0, 5)) {
            const qTextRows = await sql`
              SELECT text FROM questions
              WHERE number = ${row.number} AND package_id = ${row.package_id}
              LIMIT 1
            `;
            if (qTextRows.length > 0) {
              const qText = (qTextRows[0] as { text: string }).text;
              const crossRes = await sql`
                UPDATE questions
                SET image = ${dataUrl}
                WHERE text = ${qText}
                  AND package_id != ${row.package_id}
                  AND image IS NOT NULL
                  AND image != ''
                RETURNING number
              `;
              dbUpdated += Array.isArray(crossRes) ? crossRes.length : 0;
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('[save-cropped-image] DB update skipped:', (dbErr as Error).message);
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
