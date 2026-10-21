import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { mergeDrillPackages, stripQuestionPrefix } from '@/lib/drillHelper';
import type { Question } from '@/lib/types';

const readJson = (rel: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8')) as Question[];

// /api/questions/ strips `explanation` (toPublicQuestion), so drill's reveal
// comes from /api/drill/check, which resolves (packageId, questionId) inside
// ONE package. These tests pin the contract that makes that resolution land on
// the question the learner is actually looking at.
const DRILL_PACKAGES = ['tryout-1', 'tryout-2', 'tryout-3'];

describe('drill package ownership', () => {
  const loaded = DRILL_PACKAGES.map((pkg) => ({
    pkg,
    questions: readJson(`src/data/packages/${pkg}.json`),
  }));

  it('question ids collide across drill packages — the precondition of the bug', () => {
    const sets = loaded.map((r) => new Set(r.questions.map((q) => q.id)));
    const shared = [...sets[0]].filter((id) => sets[1].has(id) && sets[2].has(id));
    expect(shared.length).toBeGreaterThan(100);
  });

  it('every merged question keeps the package that served it', () => {
    const merged = mergeDrillPackages(loaded);
    expect(merged).toHaveLength(loaded.reduce((n, r) => n + r.questions.length, 0));

    for (const r of loaded) {
      const mine = merged.filter((q) => q.sourcePackage === r.pkg);
      expect(mine).toHaveLength(r.questions.length);
      // Ids must not have leaked onto a sibling package.
      expect(new Set(mine.map((q) => q.id))).toEqual(new Set(r.questions.map((q) => q.id)));
    }
  });

  it('resolving by sourcePackage returns the pembahasan of that very question', () => {
    const merged = mergeDrillPackages(loaded);
    const byPkg = new Map(loaded.map((r) => [r.pkg, new Map(r.questions.map((q) => [q.id, q]))]));

    let checked = 0;
    let wouldHaveDiffered = 0;
    for (const q of merged) {
      // What /api/drill/check returns for this (packageId, questionId).
      const returned = byPkg.get(q.sourcePackage)!.get(q.id)!.explanation ?? '';
      expect(returned.length, `${q.sourcePackage}#${q.id} empty explanation`).toBeGreaterThan(0);
      checked++;

      // The questions an id-only lookup would have resolved to carry different
      // pembahasan text, which is why the tag is load-bearing.
      const idOnly = byPkg.get('tryout-3')!.get(q.id)!;
      if (q.sourcePackage !== 'tryout-3' && idOnly.explanation !== returned) wouldHaveDiffered++;
    }
    expect(checked).toBeGreaterThan(300);
    expect(wouldHaveDiffered).toBeGreaterThan(200);
  });

  it('an id-only lookup resolves a different question — the bug this guards', () => {
    // Recreates the old `owner[q.id] = pkg` map: last write wins.
    const owner: Record<number, string> = {};
    for (const r of loaded) for (const q of r.questions) owner[q.id] = r.pkg;
    expect(Object.values(owner).every((p) => p === 'tryout-3')).toBe(true);

    const merged = mergeDrillPackages(loaded);
    let wrong = 0;
    for (const q of merged) if (owner[q.id] !== q.sourcePackage) wrong++;
    expect(wrong).toBeGreaterThan(200);
  });
});

describe('stripQuestionPrefix', () => {
  it('drops the prelude when the subcategory has no parentheses', () => {
    expect(stripQuestionPrefix('Soal nomor 7 (Nasionalisme): Seorang PNS menemukan...')).toBe(
      'Seorang PNS menemukan...'
    );
  });

  it('drops a nested-parenthesis subcategory without leaving a stray `):`', () => {
    // `Pilar Negara (Pancasila)` ends in `))`; a `\([^)]*\)` stops at the
    // inner bracket and leaves `): ` glued to the question.
    const raw = 'Soal nomor 18 (Pilar Negara (Pancasila)): Sikap musyawarah untuk mencapai mufakat';
    expect(stripQuestionPrefix(raw)).toBe('Sikap musyawarah untuk mencapai mufakat');
  });

  it('leaves text without a prelude untouched', () => {
    expect(stripQuestionPrefix('2, 5, 10, 17, 26, ... Nilai suku berikutnya adalah...')).toBe(
      '2, 5, 10, 17, 26, ... Nilai suku berikutnya adalah...'
    );
  });

  it('handles `no.` and spaced variants', () => {
    expect(stripQuestionPrefix('Soal no. 3 (Integritas) : Apa yang seharusnya...')).toBe(
      'Apa yang seharusnya...'
    );
  });
});
