import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// One-shot maintenance route: rewrite legacy data-URL images on questions rows
// to the content-hashed static files under /images/questions/derived/. The
// filename hash comes from the image bytes, so re-running is idempotent and
// lands on the same paths scripts/extract-db-images.cjs writes locally.
function extFor(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  const rows = await sql`
    SELECT id, package_id, number, image FROM questions
    WHERE image LIKE 'data:image/%' ORDER BY package_id, number
  `;

  const results: Record<string, unknown>[] = [];
  let rewritten = 0;
  let invalid = 0;

  for (const r of rows as { id: string; package_id: string; number: number; image: string }[]) {
    const m = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(r.image || '');
    if (!m) {
      invalid++;
      continue;
    }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 64) {
      invalid++;
      continue;
    }
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
    const rel = `/images/questions/derived/${r.package_id}-${r.number}-${hash}.${extFor(m[1])}`;
    await sql`UPDATE questions SET image = ${rel} WHERE id = ${r.id}`;
    rewritten++;
    results.push({ packageId: r.package_id, number: r.number, path: rel, bytes: buf.length });
  }

  return NextResponse.json({ matched: rows.length, rewritten, invalid, results });
}
