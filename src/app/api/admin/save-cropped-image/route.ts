import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    // Sanitize filename
    const safeName = path.basename(filename);
    if (!safeName.startsWith('fig_') || !safeName.endsWith('.png')) {
      return NextResponse.json({ error: 'Only fig_*.png files can be edited' }, { status: 400 });
    }

    // Extract base64
    const matches = dataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid data URL (must be image/png base64)' }, { status: 400 });
    }

    const buffer = Buffer.from(matches[1], 'base64');
    const filePath = path.join(process.cwd(), 'public', 'images', 'questions', safeName);

    // Save with atomic write (write to temp then rename)
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);

    return NextResponse.json({
      success: true,
      filename: safeName,
      size: buffer.length,
      url: `/images/questions/${safeName}?v=${Date.now()}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
