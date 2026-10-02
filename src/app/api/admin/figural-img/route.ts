import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

// Question number → filename mapping
function filenameToNumber(fname: string): number {
  const m = fname.match(/^fig_(analogi|ketidaksamaan|serial)_(\d+)\.png$/);
  if (!m) return 0;
  const n = parseInt(m[2], 10);
  if (m[1] === 'analogi') return n;
  if (m[1] === 'ketidaksamaan') return n + 17;
  if (m[1] === 'serial') return n + 31;
  return 0;
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || req.nextUrl.searchParams.get('pin');
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filename = req.nextUrl.searchParams.get('filename');
  if (!filename) {
    return NextResponse.json({ error: 'Missing filename param' }, { status: 400 });
  }

  const num = filenameToNumber(filename);
  if (num === 0) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const rows = await sql`
      SELECT image FROM questions
      WHERE package_id = 'tryout-figural'
        AND number = ${num}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const image = (rows[0] as { image: string }).image;
    if (image.startsWith('data:image/png;base64,')) {
      const b64 = image.split(',')[1];
      const buffer = Buffer.from(b64, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store',
        },
      });
    }

    // Not a data URL — redirect to the static file
    return NextResponse.redirect(new URL(image, req.url));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
