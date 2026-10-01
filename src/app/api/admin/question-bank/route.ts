import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/admin/question-bank
 * Query params: category?, sub_category?, limit?, offset?
 * List soal dari bank
 */
export async function GET(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const subCategory = searchParams.get('sub_category');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let questions;
  if (category && subCategory) {
    questions = await sql`
      SELECT id, category, sub_category, text, options, correct_answer, explanation, difficulty, source, used_count, created_at
      FROM question_bank
      WHERE category = ${category} AND sub_category = ${subCategory}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (category) {
    questions = await sql`
      SELECT id, category, sub_category, text, options, correct_answer, explanation, difficulty, source, used_count, created_at
      FROM question_bank
      WHERE category = ${category}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    questions = await sql`
      SELECT id, category, sub_category, text, options, correct_answer, explanation, difficulty, source, used_count, created_at
      FROM question_bank
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // Stats ringkasan
  const stats = await sql`
    SELECT category, COUNT(*) as count, COUNT(DISTINCT sub_category) as sub_count
    FROM question_bank
    GROUP BY category
    ORDER BY category
  `;
  const total = await sql`SELECT COUNT(*) as total FROM question_bank`;

  return NextResponse.json({
    questions,
    stats,
    total: total[0]?.total ?? 0,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST /api/admin/question-bank
 * Action: rakit paket dari bank soal
 * Body: { action: 'build_package', packageId: string, twk: number, tiu: number, tkp: number }
 * Ambil soal random dari bank sesuai komposisi → masukkan ke paket
 */
export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { action } = body;

  if (action === 'build_package') {
    const { packageId, twk = 30, tiu = 35, tkp = 45 } = body;
    if (!packageId) return NextResponse.json({ error: 'packageId required' }, { status: 400 });

    const total = twk + tiu + tkp;

    // Ambil soal random dari bank per kategori
    const twkQ = await sql`
      SELECT id, text, options, correct_answer, category, sub_category, explanation, difficulty, image
      FROM question_bank WHERE category = 'TWK'
      ORDER BY random() LIMIT ${twk}
    `;
    const tiuQ = await sql`
      SELECT id, text, options, correct_answer, category, sub_category, explanation, difficulty, image
      FROM question_bank WHERE category = 'TIU'
      ORDER BY random() LIMIT ${tiu}
    `;
    const tkpQ = await sql`
      SELECT id, text, options, correct_answer, category, sub_category, explanation, difficulty, image
      FROM question_bank WHERE category = 'TKP'
      ORDER BY random() LIMIT ${tkp}
    `;

    const allQ = [...twkQ, ...tiuQ, ...tkpQ];

    if (allQ.length === 0) {
      return NextResponse.json({ error: 'Bank soal kosong, generate soal dulu' }, { status: 404 });
    }

    // Hapus soal lama di paket ini (opsional: hanya insert tanpa hapus)
    await sql`DELETE FROM questions WHERE package_id = ${packageId}`;

    // Insert ke tabel questions
    let orderIdx = 0;
    const insertedIds: string[] = [];
    for (const q of allQ) {
      await sql`
        INSERT INTO questions (package_id, text, options, correct_answer, category, explanation, difficulty, order_index, image)
        VALUES (
          ${packageId},
          ${q.text},
          ${JSON.stringify(q.options)}::jsonb,
          ${q.correct_answer},
          ${q.category},
          ${q.explanation || ''},
          ${q.difficulty || 'medium'},
          ${orderIdx},
          ${q.image || null}
        )
      `;
      insertedIds.push(q.id);
      orderIdx++;
    }

    // Update question_count di paket
    await sql`
      UPDATE packages SET question_count = (
        SELECT COUNT(*) FROM questions WHERE package_id = ${packageId}
      ) WHERE id = ${packageId}
    `;

    // Increment used_count di bank
    for (const id of insertedIds) {
      await sql`UPDATE question_bank SET used_count = used_count + 1 WHERE id = ${id}::uuid`;
    }

    return NextResponse.json({
      success: true,
      inserted: allQ.length,
      breakdown: { twk: twkQ.length, tiu: tiuQ.length, tkp: tkpQ.length },
      packageId,
    });
  }

  if (action === 'delete') {
    const { ids } = body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    for (const id of ids) {
      await sql`DELETE FROM question_bank WHERE id = ${id}::uuid`;
    }
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
