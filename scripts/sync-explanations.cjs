/**
 * Sync DB `questions.explanation` from the static JSON packages.
 *
 * Why: an early seed wrote scrambled explanations for a few packages
 * (question text/options/answers were fine, only the explanation column was
 * misaligned). The admin migrate route used to skip `explanation` in its
 * ON CONFLICT DO UPDATE clause, so re-seeding never repaired the rows.
 * Run this after any bulk import to guarantee explanations match their question.
 *
 * Usage: node scripts/sync-explanations.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const DRY = process.argv.includes('--dry');

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

/** JSON source of truth for a package id (tryout-1 lives in sample_questions.json). */
function loadJson(pkg) {
  const candidates =
    pkg === 'tryout-1'
      ? ['src/data/sample_questions.json']
      : [`src/data/packages/${pkg}.json`];
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    const d = JSON.parse(fs.readFileSync(c, 'utf8'));
    return Array.isArray(d) ? d : d.questions;
  }
  return null;
}

function allStaticPackages() {
  const ids = new Set(['tryout-1']);
  const dir = 'src/data/packages';
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+)\.json$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

(async () => {
  const sql = neon(env.DATABASE_URL);
  let scanned = 0;
  let fixed = 0;
  const fixedByPkg = {};

  for (const pid of allStaticPackages()) {
    const j = loadJson(pid);
    if (!j || !j.length) continue;
    const want = new Map(j.map((q) => [q.id, (q.explanation || '').trim()]));

    let db;
    try {
      db = await sql`
        SELECT number, explanation FROM questions
        WHERE package_id = ${pid} ORDER BY number
      `;
    } catch (e) {
      console.error(`${pid}: query failed — ${e.message}`);
      continue;
    }

    for (const row of db) {
      scanned++;
      const target = want.get(row.number);
      if (!target) continue;
      if (target === (row.explanation || '').trim()) continue;

      if (!DRY) {
        await sql`
          UPDATE questions SET explanation = ${target}
          WHERE package_id = ${pid} AND number = ${row.number}
        `;
      }
      fixed++;
      fixedByPkg[pid] = (fixedByPkg[pid] || 0) + 1;
    }
  }

  console.log(DRY ? '[dry run]' : 'done', `scanned=${scanned} mismatched=${fixed}`);
  for (const [p, c] of Object.entries(fixedByPkg).sort()) {
    console.log(`  ${p}: ${c} fixed`);
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
