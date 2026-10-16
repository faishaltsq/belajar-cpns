/**
 * Move base64 image overrides out of questions.image into static files.
 *
 * Why: 88 rows store whole PNGs as data:image/... in the DB, so
 * /api/questions/<pkg> ships ~8 MB of base64 every run (Cache-Control is
 * no-store) instead of letting the CDN serve 80 KB files with immutable
 * caching. We keep the images as PUBLIC files under /images/questions/derived/
 * and rewrite the column to the path. Future admin crops still work: the crop
 * editor writes a data: override, which loadPackage() applies over the path.
 *
 * Usage: node scripts/extract-db-images.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DRY = process.argv.includes('--dry');
const OUT_DIR = path.join('public', 'images', 'questions', 'derived');

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

function extFor(mime) {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

(async () => {
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    SELECT id, package_id, number, image FROM questions
    WHERE image LIKE 'data:image/%' ORDER BY package_id, number
  `;
  if (!rows.length) { console.log('no data-URL images in DB'); return; }

  if (!DRY) fs.mkdirSync(OUT_DIR, { recursive: true });

  const seenHash = new Map(); // bytes hash -> public path (dedupe identical crops)
  let written = 0, deduped = 0, invalid = 0, skipped = 0;

  for (const r of rows) {
    const m = /^data:image\/([a-z+]+);base64,(.+)$/is.exec(r.image || '');
    if (!m) { invalid++; continue; }
    let buf;
    try { buf = Buffer.from(m[2], 'base64'); } catch { invalid++; continue; }
    if (buf.length < 64) { invalid++; continue; }

    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
    const rel = path.posix.join('/images/questions/derived', `${r.package_id}-${r.number}-${hash}.${extFor(m[1])}`);
    const disk = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));

    if (seenHash.has(hash)) {
      // identical bytes already written for another row
      deduped++;
      if (!DRY) await sql`UPDATE questions SET image = ${seenHash.get(hash)} WHERE id = ${r.id}`;
      continue;
    }

    if (DRY) {
      console.log(`[dry] ${r.package_id} #${r.number} -> ${rel} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      fs.writeFileSync(disk, buf);
      await sql`UPDATE questions SET image = ${rel} WHERE id = ${r.id}`;
    }
    seenHash.set(hash, rel);
    written++;
  }

  console.log(`${DRY ? '[dry run]' : 'done'} rows=${rows.length} files=${written} deduped=${deduped} invalid=${invalid}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
