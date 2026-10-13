import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

  // Build response: semua gambar disajikan via /api/admin/figural-img yang menangani
  // redirect otomatis ke static file bila belum di-crop, atau serve data URL dari DB
  const images = knownFiles.map(f => {
    let size = 0;
    try {
      size = fs.statSync(path.join(dir, f)).size;
    } catch { /* Vercel runtime: static files served separately */ }

    return {
      filename: f,
      url: `/api/admin/figural-img?filename=${f}`,
      size,
      overridden: false,
    };
  });

  return NextResponse.json({ images });
}
