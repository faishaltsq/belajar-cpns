import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TRYOUT_LIST, loadPackage } from '@/lib/loadPackage';
import { Question } from '@/lib/types';

// Admin PIN check (stored in env or fallback master PIN)
const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

function isAuthorized(req: NextRequest): boolean {
  const pin = req.headers.get('x-admin-pin') || req.nextUrl.searchParams.get('pin');
  return pin === ADMIN_PIN;
}

// GET /api/admin/packages — list all packages with question count
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pkgId = req.nextUrl.searchParams.get('id');

  if (pkgId) {
    const qs = await loadPackage(pkgId);
    return NextResponse.json({ id: pkgId, questions: qs });
  }

  // Return summaries for all packages
  const packages = await Promise.all(
    TRYOUT_LIST.map(async (p) => {
      const qs = await loadPackage(p.id);
      const twk = qs.filter((q) => q.category === 'TWK').length;
      const tiu = qs.filter((q) => q.category === 'TIU').length;
      const tkp = qs.filter((q) => q.category === 'TKP').length;
      const withImages = qs.filter((q) => Boolean(q.image)).length;
      return {
        ...p,
        totalQuestions: qs.length,
        twkCount: twk,
        tiuCount: tiu,
        tkpCount: tkp,
        withImagesCount: withImages,
      };
    })
  );

  return NextResponse.json({ packages });
}

// PUT /api/admin/packages — update a specific question or full package
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { packageId, questions, question } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId required' }, { status: 400 });
    }

    const filePath =
      packageId === 'tryout-1'
        ? path.join(process.cwd(), 'src/data/sample_questions.json')
        : path.join(process.cwd(), `src/data/packages/${packageId}.json`);

    let currentQuestions: Question[] = [];
    if (fs.existsSync(filePath)) {
      currentQuestions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    if (questions && Array.isArray(questions)) {
      // Full replacement
      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
      return NextResponse.json({ success: true, count: questions.length });
    }

    if (question && question.id) {
      // Single question update
      const idx = currentQuestions.findIndex((q) => q.id === question.id);
      if (idx >= 0) {
        currentQuestions[idx] = { ...currentQuestions[idx], ...question };
      } else {
        currentQuestions.push(question);
      }
      fs.writeFileSync(filePath, JSON.stringify(currentQuestions, null, 2), 'utf-8');
      return NextResponse.json({ success: true, updatedId: question.id });
    }

    return NextResponse.json({ error: 'questions or question payload required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
