import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadPackage, TRYOUT_LIST } from '@/lib/loadPackage';
import { Question } from '@/lib/types';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

function isAuthorized(req: NextRequest): boolean {
  const pin = req.headers.get('x-admin-pin') || req.nextUrl.searchParams.get('pin');
  return pin === ADMIN_PIN;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/admin/generate-custom
// Body: { packageId, title, twkCount, tiuCount, tkpCount, includeImages, durationMinutes? }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      packageId = 'tryout-mini',
      title = 'Tryout Mini',
      twkCount = 10,
      tiuCount = 10,
      tkpCount = 10,
      includeImages = true,
      durationMinutes = 30,
    } = body;

    // Gather all questions from all existing packages
    const allQuestions: Question[] = [];
    for (const pkg of TRYOUT_LIST) {
      const qs = await loadPackage(pkg.id);
      allQuestions.push(...qs);
    }

    const twkPool = shuffle(allQuestions.filter((q) => q.category === 'TWK'));
    const tiuPool = shuffle(allQuestions.filter((q) => q.category === 'TIU'));
    const tkpPool = shuffle(allQuestions.filter((q) => q.category === 'TKP'));

    const selected: Question[] = [];

    // Sample TWK
    selected.push(...twkPool.slice(0, Math.min(twkCount, twkPool.length)));

    // Sample TIU — optionally include figural (with images)
    let tiuSelected: Question[] = [];
    if (includeImages) {
      // Load figural bank
      const figuralPath = path.join(process.cwd(), 'src/data/figural_bank.json');
      let figuralBank: Question[] = [];
      if (fs.existsSync(figuralPath)) {
        figuralBank = JSON.parse(fs.readFileSync(figuralPath, 'utf-8'));
      }
      const figuralCount = Math.min(Math.floor(tiuCount * 0.3), figuralBank.length); // 30% figural
      tiuSelected.push(...shuffle(figuralBank).slice(0, figuralCount));
      const remaining = tiuCount - tiuSelected.length;
      tiuSelected.push(...tiuPool.slice(0, Math.min(remaining, tiuPool.length)));
    } else {
      tiuSelected.push(...tiuPool.slice(0, Math.min(tiuCount, tiuPool.length)));
    }
    selected.push(...tiuSelected);

    // Sample TKP
    selected.push(...tkpPool.slice(0, Math.min(tkpCount, tkpPool.length)));

    // Re-number IDs sequentially
    const numbered = selected.map((q, i) => ({ ...q, id: i + 1 }));

    // Write to file
    const outputPath = path.join(process.cwd(), `src/data/packages/${packageId}.json`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(numbered, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      packageId,
      title,
      totalQuestions: numbered.length,
      twk: numbered.filter((q) => q.category === 'TWK').length,
      tiu: numbered.filter((q) => q.category === 'TIU').length,
      tkp: numbered.filter((q) => q.category === 'TKP').length,
      withImages: numbered.filter((q) => Boolean(q.image)).length,
      durationMinutes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
