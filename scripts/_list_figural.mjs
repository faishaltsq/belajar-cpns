import { readFileSync, writeFileSync } from 'node:fs';
const p = JSON.parse(readFileSync('src/data/packages/tryout-figural-2.json', 'utf8'));
const rows = Object.entries(p)
  .filter(([, q]) => typeof q.explanation !== 'string' || q.explanation.trim() === '')
  .map(([k, q]) => `${k}\t${q.image}\tANS=${q.correctAnswer}`);
writeFileSync('docs/audit/_figural.tsv', rows.join('\n'), 'utf8');
console.log('missing', rows.length);
console.log(rows.slice(0, 10).join('\n'));
