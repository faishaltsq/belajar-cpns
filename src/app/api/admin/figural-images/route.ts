import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin');
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dir = path.join(process.cwd(), 'public', 'images', 'questions');
  let files: string[] = [];
  if (fs.existsSync(dir)) {
    files = fs.readdirSync(dir)
      .filter(f => f.startsWith('fig_') && f.endsWith('.png'))
      .sort();
  }

  const images = files.map(f => {
    const stat = fs.statSync(path.join(dir, f));
    return {
      filename: f,
      url: `/images/questions/${f}`,
      size: stat.size,
    };
  });

  return NextResponse.json({ images });
}
