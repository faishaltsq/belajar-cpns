const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=([^\r\n]+)/)[1];
const sql = neon(dbUrl);

(async () => {
  // 1. Buat tabel
  await sql`
    CREATE TABLE IF NOT EXISTS figural_filename_map (
      filename TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Table created/verified');

  // 2. Isi dari semua soal yang image-nya masih referensi filename (belum crop)
  const rows = await sql`
    SELECT package_id, number,
      REGEXP_REPLACE(image, '^.*/', '') as filename
    FROM questions
    WHERE image IS NOT NULL
      AND image != ''
      AND image NOT LIKE 'data:image/%'
  `;
  console.log('Rows to insert:', rows.length);

  let inserted = 0;
  for (const r of rows) {
    if (!r.filename || !r.filename.startsWith('fig_')) continue;
    try {
      await sql`
        INSERT INTO figural_filename_map (filename, package_id, question_number)
        VALUES (${r.filename}, ${r.package_id}, ${r.number})
        ON CONFLICT (filename) DO NOTHING
      `;
      inserted++;
    } catch (e) {
      console.warn('Skip:', r.filename, e.message);
    }
  }
  console.log('Inserted:', inserted);

  // 3. Verifikasi
  const count = await sql`SELECT COUNT(*) as n FROM figural_filename_map`;
  console.log('Total entries:', count[0].n);

  const sample = await sql`SELECT * FROM figural_filename_map ORDER BY filename LIMIT 10`;
  for (const s of sample) console.log(s.filename, '->', s.package_id, '#' + s.question_number);
})().catch(console.error);
