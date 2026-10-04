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

// GET /api/admin/packages — list all packages or load questions & settings of one package
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pkgId = req.nextUrl.searchParams.get('id');

  if (pkgId) {
    const qs = await loadPackage(pkgId);
    let settings = { duration_sec: 6000, randomize_questions: false, randomize_options: false };
    const sql = getDb();
    if (sql) {
      try {
        const rows = await sql`
          SELECT duration_sec, randomize_questions, randomize_options
          FROM packages
          WHERE id = ${pkgId}
        `;
        if (rows?.[0]) {
          settings = {
            duration_sec: rows[0].duration_sec ?? 6000,
            randomize_questions: Boolean(rows[0].randomize_questions),
            randomize_options: Boolean(rows[0].randomize_options),
          };
        }
      } catch {}
    }
    return NextResponse.json({ id: pkgId, questions: qs, settings });
  }

  // List all packages (from DB merged with static)
  const sql = getDb();
  let dbPkgs: any[] = [];
  if (sql) {
    try {
      dbPkgs = await sql`
        SELECT id, title as label, description as desc, question_count, duration_sec,
               randomize_questions, randomize_options, is_active
        FROM packages
        ORDER BY created_at ASC
      `;
    } catch {}
  }

  const mergedMap = new Map<string, any>();
  TRYOUT_LIST.forEach((p) => {
    mergedMap.set(p.id, { ...p, duration_sec: 6000, randomize_questions: false, randomize_options: false });
  });
  dbPkgs.forEach((p) => {
    mergedMap.set(p.id, {
      id: p.id,
      label: p.label,
      desc: p.desc || `${p.question_count || 0} soal (${Math.round((p.duration_sec || 6000) / 60)} menit)`,
      badge: p.id === 'tryout-mini' ? 'Coba Gratis' : 'Custom',
      duration_sec: p.duration_sec || 6000,
      randomize_questions: Boolean(p.randomize_questions),
      randomize_options: Boolean(p.randomize_options),
    });
  });

  const packages = await Promise.all(
    Array.from(mergedMap.values()).map(async (p) => {
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

// POST /api/admin/packages — add a new question to a package
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { packageId, question } = body;
    if (!packageId || !question) {
      return NextResponse.json({ error: 'packageId and question required' }, { status: 400 });
    }

    const qs = await loadPackage(packageId);
    const nextNumber = qs.length > 0 ? Math.max(...qs.map((q) => q.id)) + 1 : 1;
    const newQ: Question = {
      ...question,
      id: nextNumber,
    };

    // 1. Sync to Neon DB
    const sql = getDb();
    if (sql) {
      await sql`
        INSERT INTO questions (package_id, number, category, text, image, options, correct_answer, tkp_scores, explanation, difficulty)
        VALUES (
          ${packageId}, ${newQ.id}, ${newQ.category}, ${newQ.text}, ${newQ.image || null},
          ${JSON.stringify(newQ.options)}::jsonb, ${(newQ as any).correctAnswer || null},
          ${(newQ as any).tkpScores ? JSON.stringify((newQ as any).tkpScores) : null}::jsonb,
          ${newQ.explanation || null}, ${(newQ as any).difficulty || 'medium'}
        )
      `;
      // Update package question_count
      await sql`UPDATE packages SET question_count = (SELECT COUNT(*) FROM questions WHERE package_id = ${packageId}) WHERE id = ${packageId}`;
    }

    // 2. Sync to JSON file if exists
    const filePath =
      packageId === 'tryout-1'
        ? path.join(process.cwd(), 'src/data/sample_questions.json')
        : path.join(process.cwd(), `src/data/packages/${packageId}.json`);
    if (fs.existsSync(filePath)) {
      const list: Question[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      list.push(newQ);
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true, question: newQ });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/admin/packages — update a question
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { packageId, question } = body;

    if (!packageId || !question || !question.id) {
      return NextResponse.json({ error: 'packageId and valid question required' }, { status: 400 });
    }

    const filePath =
      packageId === 'tryout-1'
        ? path.join(process.cwd(), 'src/data/sample_questions.json')
        : path.join(process.cwd(), `src/data/packages/${packageId}.json`);

    if (fs.existsSync(filePath)) {
      const currentQuestions: Question[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const idx = currentQuestions.findIndex((q) => q.id === question.id);
      if (idx >= 0) {
        currentQuestions[idx] = { ...currentQuestions[idx], ...question };
        fs.writeFileSync(filePath, JSON.stringify(currentQuestions, null, 2), 'utf-8');
      }
    }

    // Sync to Neon DB
    const sql = getDb();
    if (sql) {
      await sql`
        INSERT INTO questions (package_id, number, category, text, image, options, correct_answer, tkp_scores, explanation, difficulty)
        VALUES (
          ${packageId}, ${question.id}, ${question.category}, ${question.text}, ${question.image || null},
          ${JSON.stringify(question.options)}::jsonb, ${(question as any).correctAnswer || null},
          ${(question as any).tkpScores ? JSON.stringify((question as any).tkpScores) : null}::jsonb,
          ${question.explanation || null}, ${(question as any).difficulty || 'medium'}
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/packages — delete a question or an entire package
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pkgId = req.nextUrl.searchParams.get('id');
  const qId = req.nextUrl.searchParams.get('qId');
  const deletePackage = req.nextUrl.searchParams.get('deletePackage') === 'true';

  if (!pkgId) {
    return NextResponse.json({ error: 'package id required' }, { status: 400 });
  }

  const sql = getDb();

  // A. Delete entire package
  if (deletePackage) {
    if (sql) {
      await sql`DELETE FROM packages WHERE id = ${pkgId}`;
      await sql`DELETE FROM questions WHERE package_id = ${pkgId}`;
    }
    const filePath = path.join(process.cwd(), `src/data/packages/${pkgId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ success: true, deletedPackage: pkgId });
  }

  // B. Delete a single question
  if (qId) {
    const num = Number(qId);
    if (sql) {
      await sql`DELETE FROM questions WHERE package_id = ${pkgId} AND number = ${num}`;
      await sql`UPDATE packages SET question_count = (SELECT COUNT(*) FROM questions WHERE package_id = ${pkgId}) WHERE id = ${pkgId}`;
    }
    const filePath =
      pkgId === 'tryout-1'
        ? path.join(process.cwd(), 'src/data/sample_questions.json')
        : path.join(process.cwd(), `src/data/packages/${pkgId}.json`);
    if (fs.existsSync(filePath)) {
      const list: Question[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const filtered = list.filter((q) => q.id !== num);
      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true, deletedQuestion: num });
  }

  return NextResponse.json({ error: 'Specify qId or deletePackage=true' }, { status: 400 });
}

// PATCH /api/admin/packages — update package settings (duration, randomize)
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { packageId, durationMinutes, randomizeQuestions, randomizeOptions, title } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId required' }, { status: 400 });
    }

    const durationSec = durationMinutes ? durationMinutes * 60 : undefined;

    const sql = getDb();
    if (sql) {
      // Upsert package row if not exists
      await sql`
        INSERT INTO packages (id, title, duration_sec, randomize_questions, randomize_options)
        VALUES (${packageId}, ${title || packageId}, ${durationSec || 6000}, ${Boolean(randomizeQuestions)}, ${Boolean(randomizeOptions)})
        ON CONFLICT (id) DO UPDATE SET
          duration_sec = COALESCE(${durationSec}, packages.duration_sec),
          randomize_questions = COALESCE(${randomizeQuestions !== undefined ? Boolean(randomizeQuestions) : null}, packages.randomize_questions),
          randomize_options = COALESCE(${randomizeOptions !== undefined ? Boolean(randomizeOptions) : null}, packages.randomize_options),
          title = COALESCE(${title || null}, packages.title),
          updated_at = now()
      `;
    }

    return NextResponse.json({ success: true, packageId });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
