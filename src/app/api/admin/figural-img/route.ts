import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('filename');
  if (!filename) {
    return NextResponse.json({ error: 'Missing filename param' }, { status: 400 });
  }

  // Sanitize: only fig_*.png, no path traversal
  if (!filename.startsWith('fig_') || !filename.endsWith('.png') || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const sql = getDb();
    if (!sql) {
      return NextResponse.redirect(new URL(`/images/questions/${filename}`, req.url));
    }

    // Generic lookup: cari di semua paket berdasarkan image LIKE '%filename%'
    const matchPattern = `%${filename}%`;
    const rows = await sql`
      SELECT image FROM questions
      WHERE image LIKE ${matchPattern}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.redirect(new URL(`/images/questions/${filename}`, req.url));
    }

    const image = (rows[0] as { image: string }).image;
    if (image && image.startsWith('data:image/')) {
      const [header, b64] = image.split(',');
      const mimeMatch = header.match(/data:(image\/[^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const buffer = Buffer.from(b64, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'no-cache, no-store',
        },
      });
    }

    return NextResponse.redirect(new URL(`/images/questions/${filename}`, req.url));
  } catch (err: unknown) {
    if (err instanceof Error) console.error('[figural-img]', err.message);
    return NextResponse.redirect(new URL(`/images/questions/${filename}`, req.url));
  }
}
