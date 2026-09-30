import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ROUTER_URL = 'https://rb4hc5v.abc-tunnel.us/v1/chat/completions';

/**
 * POST /api/admin/generate-ebook
 * Body: { category: 'TWK'|'TIU'|'TKP', count: number, packageId?: string }
 * Ambil konteks random dari ebook_contexts → kirim ke LLM → return soal baru
 */
export async function POST(req: Request) {
  try {
    const apiKey = process.env.HERMES_CUSTOM_LOCALHOST_20128_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const { category, count = 5, packageId } = await req.json();
    if (!['TWK', 'TIU', 'TKP'].includes(category)) {
      return NextResponse.json({ error: 'category harus TWK, TIU, atau TKP' }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Ambil 5 chunk konteks random dari kategori yang diminta
    const contexts = await sql`
      SELECT content, sub_category 
      FROM ebook_contexts 
      WHERE category = ${category} 
      ORDER BY random() 
      LIMIT 5
    `;

    if (contexts.length === 0) {
      return NextResponse.json({ error: `Belum ada konteks ebook untuk kategori ${category}` }, { status: 404 });
    }

    const contextText = contexts.map((c: Record<string, string | null>, i: number) => 
      `[Referensi ${i + 1} - ${c.sub_category || category}]:\n${c.content}`
    ).join('\n\n---\n\n');

    const subCategories: Record<string, string[]> = {
      TWK: ['Nasionalisme', 'Bela Negara', 'Pilar Pancasila', 'UUD 1945', 'Integritas', 'Bahasa Indonesia'],
      TIU: ['Analogi', 'Silogisme', 'Analitis', 'Deret Angka', 'Soal Cerita', 'Figural'],
      TKP: ['Pelayanan Publik', 'Profesionalisme', 'Jejaring Kerja', 'TIK', 'Anti-Radikalisme', 'Sosio-Kultural', 'Manajemen Diri'],
    };

    const isTKP = category === 'TKP';
    const scoringInstruction = isTKP
      ? `Untuk TKP, setiap opsi diberi skor 1-5 (5=paling ideal, 1=paling buruk). TIDAK ada jawaban benar/salah absolut.
         Format opsi: { "id": "a", "text": "...", "score": 5 }, { "id": "b", "text": "...", "score": 3 }, dst.
         Pastikan skor bervariasi (tidak semua 5 atau semua 1).`
      : `Untuk ${category}, setiap opsi diberi skor 5 (benar) atau 0 (salah). Tepat 1 jawaban benar.
         Format opsi: { "id": "a", "text": "...", "score": 5 }, { "id": "b", "text": "...", "score": 0 }, dst.`;

    const prompt = `Kamu adalah pembuat soal CPNS profesional. Berdasarkan materi referensi berikut, buatkan ${count} soal BARU kategori ${category} untuk simulasi CAT SKD CPNS.

ATURAN PENTING:
1. JANGAN copy paste soal dari referensi. Buat soal BARU dengan redaksi berbeda.
2. Gunakan referensi sebagai INSPIRASI topik dan konsep saja.
3. Setiap soal harus punya 5 opsi (a, b, c, d, e).
4. ${scoringInstruction}
5. Sub-kategori harus salah satu dari: ${subCategories[category].join(', ')}
6. Sertakan penjelasan singkat untuk jawaban.
7. Tingkat kesulitan acak: easy, medium, hard.

MATERI REFERENSI:
${contextText}

RESPOND dalam format JSON ARRAY, tanpa markdown code block:
[
  {
    "text": "teks soal",
    "category": "${category}",
    "sub_category": "nama sub kategori",
    "options": [
      { "id": "a", "text": "opsi A", "score": ${isTKP ? '3' : '0'} },
      { "id": "b", "text": "opsi B", "score": ${isTKP ? '5' : '5'} },
      { "id": "c", "text": "opsi C", "score": ${isTKP ? '2' : '0'} },
      { "id": "d", "text": "opsi D", "score": ${isTKP ? '1' : '0'} },
      { "id": "e", "text": "opsi E", "score": ${isTKP ? '4' : '0'} }
    ],
    "explanation": "penjelasan jawaban",
    "difficulty": "medium"
  }
]`;

    const llmRes = await fetch(ROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      console.error('[generate-ebook] LLM error:', errText);
      return NextResponse.json({ error: 'LLM gagal generate soal' }, { status: 502 });
    }

    const llmData = await llmRes.json();
    let content = llmData.choices?.[0]?.message?.content || '';

    // Strip markdown code block if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      console.error('[generate-ebook] JSON parse error:', content.slice(0, 500));
      return NextResponse.json({ error: 'LLM response bukan JSON valid', raw: content.slice(0, 200) }, { status: 422 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'LLM tidak menghasilkan soal' }, { status: 422 });
    }

    // Jika packageId disertakan, langsung simpan ke DB
    if (packageId) {
      // Ambil order_index terakhir
      const lastOrder = await sql`
        SELECT COALESCE(MAX(order_index), -1) + 1 as next_order 
        FROM questions WHERE package_id = ${packageId}
      `;
      let orderIdx = lastOrder[0]?.next_order ?? 0;

      for (const q of questions) {
        const correctAnswer = isTKP
          ? q.options.reduce((best: { score: number; id: string }, o: { score: number; id: string }) => o.score > best.score ? o : best, q.options[0]).id
          : q.options.find((o: { score: number }) => o.score === 5)?.id || 'a';

        await sql`
          INSERT INTO questions (package_id, text, options, correct_answer, category, explanation, difficulty, order_index)
          VALUES (
            ${packageId},
            ${q.text},
            ${JSON.stringify(q.options)}::jsonb,
            ${correctAnswer},
            ${q.category},
            ${q.explanation || ''},
            ${q.difficulty || 'medium'},
            ${orderIdx}
          )
        `;
        orderIdx++;
      }

      // Update question_count
      await sql`
        UPDATE packages SET question_count = (
          SELECT COUNT(*) FROM questions WHERE package_id = ${packageId}
        ) WHERE id = ${packageId}
      `;
    }

    return NextResponse.json({
      success: true,
      count: questions.length,
      questions,
      savedToPackage: packageId || null,
    });
  } catch (error) {
    console.error('[generate-ebook] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: cek statistik ebook_contexts
export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const stats = await sql`
    SELECT category, COUNT(*) as count,
      COUNT(DISTINCT sub_category) as sub_categories,
      COUNT(DISTINCT source_file) as source_files
    FROM ebook_contexts
    GROUP BY category
    ORDER BY category
  `;

  const total = await sql`SELECT COUNT(*) as total FROM ebook_contexts`;

  return NextResponse.json({
    total: total[0]?.total ?? 0,
    categories: stats,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
