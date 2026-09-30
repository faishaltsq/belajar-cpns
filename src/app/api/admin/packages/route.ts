import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TRYOUT_LIST, loadPackage } from '@/lib/loadPackage';
import { getDb } from '@/lib/db';
import { Question } from '@/lib/types';

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

  const packages = await Promise.all(
    TRYOUT_LIST.map(async (p) => {
      const qs = await loadPackage(p.id);
      return {
        ...p,
        totalQuestions: qs.length,
        twkCount: qs.filter((q) => q.category === 'TWK').length,
        tiuCount: qs.filter((q) => q.category === 'TIU').length,
        tkpCount: qs.filter((q) => q.category === 'TKP').length,
        withImagesCount: qs.filter((q) => Boolean(q.image)).length,
      };
    })
  );

  return NextResponse.json({ packages });
}

// PUT /api/admin/packages — update a question (write to JSON + sync ke DB)
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

    let updatedQuestions: Question[] = currentQuestions;

    if (questions && Array.isArray(questions)) {
      updatedQuestions = questions;
    } else if (question && question.id) {
      const idx = currentQuestions.findIndex((q) => q.id === question.id);
      if (idx >= 0) {
        updatedQuestions[idx] = { ...currentQuestions[idx], ...question };
      } else {
        updatedQuestions.push(question);
      }
    } else {
      return NextResponse.json({ error: 'questions or question payload required' }, { status: 400 });
    }

    // 1. Write to JSON file (always)
    fs.writeFileSync(filePath, JSON.stringify(updatedQuestions, null, 2), 'utf-8');

    // 2. Sync to Neon DB (if connected)
    const sql = getDb();
    if (sql) {
      const toSync = question ? [question] : updatedQuestions;
      for (const q of toSync) {
        await sql`
          INSERT INTO questions (package_id, number, category, text, image, options, correct_answer, tkp_scores, explanation, difficulty)
          VALUES (
            ${packageId}, ${q.id}, ${q.category}, ${q.text}, ${q.image || null},
            ${JSON.stringify(q.options)}::jsonb, ${(q as any).correctAnswer || null},
            ${(q as any).tkpScores ? JSON.stringify((q as any).tkpScores) : null}::jsonb,
            ${(q as any).explanation || null}, ${(q as any).difficulty || 'medium'}
          )
          ON CONFLICT (package_id, number) DO UPDATE SET
            text = EXCLUDED.text,
            image = EXCLUDED.image,
            options = EXCLUDED.options,
            correct_answer = EXCLUDED.correct_answer,
            tkp_scores = EXCLUDED.tkp_scores,
            explanation = EXCLUDED.explanation,
            difficulty = EXCLUDED.difficulty
        `;
      }
    }

    return NextResponse.json({
      success: true,
      count: updatedQuestions.length,
      dbSynced: Boolean(sql),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
