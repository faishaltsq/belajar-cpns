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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate image type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF allowed' }, { status: 400 });
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const safeName = `upload_${timestamp}.${ext}`;

    const dir = path.join(process.cwd(), 'public', 'images', 'questions');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(dir, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/images/questions/${safeName}`;

    return NextResponse.json({ success: true, url: publicUrl, size: file.size });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
