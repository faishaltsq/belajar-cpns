import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import type { Question } from '@/lib/types';

const PKG_DIR = path.join(process.cwd(), 'src/data/packages');

function loadAll(): { pkg: string; questions: Question[] }[] {
  return fs
    .readdirSync(PKG_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({
      pkg: f.replace(/\.json$/, ''),
      questions: JSON.parse(fs.readFileSync(path.join(PKG_DIR, f), 'utf8')) as Question[],
    }));
}

const packages = loadAll();

/**
 * Explanation quality guards.
 *
 * These pin the shapes of pembahasan that are useless to a learner: they name a
 * key and nothing else, or they assert a score that contradicts the option
 * weights the app actually applies. They do not judge whether the prose is
 * *correct* — that needs a reader — only that it says something and that the
 * numbers it prints match the data.
 */
describe('pembahasan carries an actual explanation', () => {
  it('no item explains itself with only the answer key', () => {
    const onlyKey = /^\s*(pembahasan\s*:?\s*)?kunci\s+jawaban.{0,40}adalah\s+[A-E]\.?\s*$/i;
    const offenders = packages.flatMap(({ pkg, questions }) =>
      questions
        .filter((q) => onlyKey.test(q.explanation ?? ''))
        .map((q) => `${pkg}#${q.id}`)
    );
    // 286 items across the batch-imported packs still say only "Kunci jawaban
    // yang tepat adalah X." — tracked as an open content defect, asserted here
    // so the count can only shrink.
    expect(offenders.length).toBeLessThanOrEqual(286);
    expect(offenders.filter((o) => o.startsWith('tryout-1#')).length).toBe(0);
  });

  it('no item explains itself with an empty placeholder', () => {
    const empty = packages.flatMap(({ pkg, questions }) =>
      questions
        .filter((q) => !(q.explanation ?? '').trim() || (q.explanation ?? '').trim() === '(KOSONG)')
        .map((q) => `${pkg}#${q.id}`)
    );
    // All 59 are figural items whose source PDF lists keys without rationale.
    expect(empty.length).toBeLessThanOrEqual(59);
    expect(empty.every((e) => e.startsWith('tryout-figural-2#'))).toBe(true);
  });
});

describe('pembahasan never contradicts the option weights', () => {
  it('a "Poin: A=.." map matches the real scores of the options it names', () => {
    const poin = /oin:?\s*((?:[A-E]\s*=\s*\d+\s*[,.]?\s*)+)/;
    const offenders: string[] = [];

    for (const { pkg, questions } of packages) {
      for (const q of questions) {
        const m = poin.exec(q.explanation ?? '');
        if (!m) continue;
        const claims = Array.from(m[1].matchAll(/([A-E])\s*=\s*(\d+)/g));
        if (claims.length < 2) continue;

        const actual = new Map((q.options ?? []).map((o) => [o.id, Number(o.score ?? 0)]));
        for (const [, letter, claimed] of claims) {
          if (actual.has(letter) && actual.get(letter) !== Number(claimed)) {
            offenders.push(`${pkg}#${q.id} ${letter}=${claimed} but score is ${actual.get(letter)}`);
            break;
          }
        }
      }
    }
    // 25 TKP items publish a point map that disagrees with their option scores.
    expect(offenders.length).toBeLessThanOrEqual(25);
  });

  it('an explanation that names a top-scoring option does not name a low-scoring one', () => {
    // `tryout-2#77` said "Pilihan B bernilai 5" while B scores 1 and D scores 5,
    // and the prose described D. Counted, not fixed: 173 such items exist and
    // resolving each needs a human read of which letter was meant.
    const names = /Pilihan\s+([A-E])/i;
    let suspicious = 0;
    for (const { questions } of packages) {
      for (const q of questions) {
        const m = names.exec(q.explanation ?? '');
        if (!m) continue;
        const scores = (q.options ?? []).map((o) => Number(o.score ?? 0));
        const max = Math.max(...scores);
        if (max === 0) continue;
        const claimed = (q.options ?? []).find((o) => o.id === m[1].toUpperCase());
        if (claimed && Number(claimed.score ?? 0) < max) suspicious++;
      }
    }
    expect(suspicious).toBeLessThanOrEqual(173);
  });
});
