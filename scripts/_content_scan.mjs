/**
 * Content scan over every tryout package.
 *
 * Package files are a plain object keyed by question index ("0", "1", ...), NOT
 * a `questions` array. An earlier version of this script read the wrong shape,
 * walked zero questions and reported a clean pass; it now exits non-zero when it
 * finds nothing, so a shape change cannot fake a green result again.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'src/data/packages');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));

const totals = { packages: files.length, questions: 0 };
const issues = {
  dupIds: [],
  emptyOptions: [],
  noMaxScore: [],
  missingExplanation: [],
  latexGarbled: [],
  repeatedText: [],
};
const seenText = new Map();

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const questions = Object.values(data).filter((v) => v && typeof v === 'object' && !Array.isArray(v));
  const ids = new Set();

  for (const q of questions) {
    totals.questions += 1;
    const at = `${file}#${q.id}`;

    if (ids.has(q.id)) issues.dupIds.push(at);
    ids.add(q.id);

    const text = (q.text || '').trim();
    if (text) {
      if (seenText.has(text)) issues.repeatedText.push(`${at} repeats ${seenText.get(text)}`);
      else seenText.set(text, at);
    }

    if (!Array.isArray(q.options) || q.options.length === 0) issues.emptyOptions.push(at);
    else if (Math.max(...q.options.map((o) => Number(o.score) || 0)) <= 0) issues.noMaxScore.push(at);

    if (!q.explanation) issues.missingExplanation.push(at);
    else if (/times|frac|sqrt/.test(q.explanation)) issues.latexGarbled.push(at);
  }
}

if (totals.questions === 0) {
  console.error('FATAL: scanned zero questions — package shape changed again.');
  process.exit(1);
}

console.log(JSON.stringify(totals));
for (const [k, v] of Object.entries(issues)) {
  console.log(`${k}: ${v.length}${v.length ? '  e.g. ' + v.slice(0, 2).join(', ') : ''}`);
}
