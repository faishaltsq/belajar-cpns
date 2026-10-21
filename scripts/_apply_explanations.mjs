import { readFileSync, writeFileSync } from 'node:fs';
const files = process.argv.slice(2);
const touched = new Map();
let applied = 0, skipped = 0;
for (const f of files) {
  const batch = JSON.parse(readFileSync(f, 'utf8'));
  for (const item of batch.items) {
    const path = `src/data/packages/${item.file}`;
    if (!touched.has(path)) touched.set(path, JSON.parse(readFileSync(path, 'utf8')));
    const pkg = touched.get(path);
    const q = pkg[String(item.number)];
    if (!q) { console.log('MISSING', item.file, item.number); skipped++; continue; }
    if (typeof q.explanation === 'string' && q.explanation.trim() !== '') { skipped++; continue; }
    q.explanation = item.explanation;
    applied++;
  }
}
for (const [path, pkg] of touched) writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('applied', applied, 'skipped', skipped);
