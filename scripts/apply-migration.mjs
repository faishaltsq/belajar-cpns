// Applies a migration .sql file against DATABASE_URL.
//
// Usage: node scripts/apply-migration.mjs migrations/011_add_bundle_package_ids.sql
//
// The Neon HTTP driver executes each call as a single prepared statement, so a
// file holding several statements is split here — comment lines are dropped
// first so a ';' inside a comment cannot cut a statement in half.
// Never prints DATABASE_URL.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
const env = {};
for (const raw of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const url = env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/apply-migration.mjs <file.sql>');
  process.exit(1);
}
const q = neon(url);
const body = readFileSync(file, 'utf8');

const statements = body
  .split(/\r?\n/)
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await q.query(stmt);
}
console.log('applied:', file, `(${statements.length} statements)`);
