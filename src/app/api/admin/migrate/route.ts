import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TRYOUT_LIST, loadPackage } from '@/lib/loadPackage';

const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin');
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  try {
    // 0. Update outdated figural image paths in questions table
    try {
      await sql`
        UPDATE questions 
        SET image = '/images/questions/fig_serial_03.png'
        WHERE package_id = 'tryout-mini' AND number = 18 AND image LIKE '%fig_page%'
      `;
      await sql`
        UPDATE questions 
        SET image = '/images/questions/fig_serial_05.png'
        WHERE package_id = 'tryout-mini' AND number = 19 AND image LIKE '%fig_page%'
      `;
      await sql`
        UPDATE questions 
        SET image = '/images/questions/fig_analogi_01.png'
        WHERE package_id = 'tryout-mini' AND number = 20 AND image LIKE '%fig_page%'
      `;
    } catch {}

    // 1. Create tables
    await sql.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(30) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        question_count INT DEFAULT 0,
        duration_sec INT DEFAULT 6000,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        package_id VARCHAR(30) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        number INT NOT NULL,
        category VARCHAR(10) NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
        text TEXT NOT NULL,
        image TEXT,
        options JSONB NOT NULL,
        correct_answer VARCHAR(5),
        tkp_scores JSONB,
        explanation TEXT,
        difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(package_id, number)
      )
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS exam_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        package_id VARCHAR(30) REFERENCES packages(id) ON DELETE SET NULL,
        answers JSONB NOT NULL,
        score_twk INT DEFAULT 0,
        score_tiu INT DEFAULT 0,
        score_tkp INT DEFAULT 0,
        total_score INT DEFAULT 0,
        is_passed BOOLEAN DEFAULT false,
        duration_used INT,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_questions_package ON questions(package_id)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_results_user ON exam_results(user_id)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_results_package ON exam_results(package_id)`);

    // 2. Seed packages from static JSON files bundled in the build
    const meta: Record<string, { title: string; duration: number }> = {
      'tryout-1': { title: 'Paket Tryout SKD 01 (Standar CAT BKN)', duration: 6000 },
      'tryout-2': { title: 'Paket Tryout SKD 02 (Standar CAT BKN)', duration: 6000 },
      'tryout-3': { title: 'Paket Tryout SKD 03 (Standar CAT BKN)', duration: 6000 },
      'tryout-4': { title: 'Paket Tryout SKD 04 (Standar CAT BKN)', duration: 6000 },
      'tryout-5': { title: 'Paket Tryout SKD 05 (Standar CAT BKN)', duration: 6000 },
      'tryout-6': { title: 'Paket Tryout SKD 06 (Standar CAT BKN)', duration: 6000 },
      'tryout-mini': { title: 'Tryout Mini Uji Coba (30 Soal + Figural)', duration: 1800 },
    };

    // Important: loadPackage here will read from static JSON (not DB) because DB is empty
    // We need direct static import to avoid infinite loop
    const staticLoaders: Record<string, () => Promise<any[]>> = {
      'tryout-1': () => import('@/data/sample_questions.json').then(m => m.default as any[]),
      'tryout-2': () => import('@/data/packages/tryout-2.json').then(m => m.default as any[]),
      'tryout-3': () => import('@/data/packages/tryout-3.json').then(m => m.default as any[]).catch(() => []),
      'tryout-4': () => import('@/data/packages/tryout-4.json').then(m => m.default as any[]).catch(() => []),
      'tryout-5': () => import('@/data/packages/tryout-5.json').then(m => m.default as any[]).catch(() => []),
      'tryout-6': () => import('@/data/packages/tryout-6.json').then(m => m.default as any[]).catch(() => []),
      'tryout-7': () => import('@/data/packages/tryout-7.json').then(m => m.default as any[]).catch(() => []),
      'tryout-mini': () => import('@/data/packages/tryout-mini.json').then(m => m.default as any[]).catch(() => []),
    };

    let totalSeeded = 0;

    for (const [pkgId, m] of Object.entries(meta)) {
      const loader = staticLoaders[pkgId];
      if (!loader) continue;
      const questions = await loader();
      if (!questions.length) continue;

      // Upsert package
      await sql`
        INSERT INTO packages (id, title, question_count, duration_sec, is_active)
        VALUES (${pkgId}, ${m.title}, ${questions.length}, ${m.duration}, true)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          question_count = EXCLUDED.question_count,
          duration_sec = EXCLUDED.duration_sec,
          updated_at = now()
      `;

      // Upsert questions
      for (const q of questions) {
        await sql`
          INSERT INTO questions (package_id, number, category, text, image, options, correct_answer, tkp_scores, explanation, difficulty)
          VALUES (
            ${pkgId}, ${q.id}, ${q.category}, ${q.text}, ${q.image || null},
            ${JSON.stringify(q.options)}::jsonb,
            ${q.correctAnswer || null},
            ${q.tkpScores ? JSON.stringify(q.tkpScores) : null}::jsonb,
            ${q.explanation || null},
            ${q.difficulty || 'medium'}
          )
          ON CONFLICT (package_id, number) DO UPDATE SET
            text = EXCLUDED.text,
            image = CASE 
              WHEN questions.image LIKE 'data:image/%' THEN questions.image
              ELSE EXCLUDED.image
            END,
            options = EXCLUDED.options,
            correct_answer = EXCLUDED.correct_answer,
            tkp_scores = EXCLUDED.tkp_scores
        `;
      }
      totalSeeded += questions.length;
    }

    const pkgCount = await sql`SELECT count(*) as c FROM packages`;
    const qCount = await sql`SELECT count(*) as c FROM questions`;

    return NextResponse.json({
      success: true,
      tablesCreated: ['users', 'packages', 'questions', 'exam_results'],
      totalPackagesSeeded: Number(pkgCount[0].c),
      totalQuestionsSeeded: Number(qCount[0].c),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
