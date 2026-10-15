import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel)) as Array<{
  id: number;
  text: string;
  explanation?: string;
  options: { id: string; text: string; score: number }[];
}>;

// ---------------------------------------------------------
// Latihan Kilat loads tryout-1/2/3 (and figural) — every question it can
// serve must carry an explanation that belongs to that question.
// ---------------------------------------------------------
describe('drill explanation integrity', () => {
  const DRILL_SOURCES: Array<[string, string]> = [
    ['tryout-1', 'src/data/sample_questions.json'],
    ['tryout-2', 'src/data/packages/tryout-2.json'],
    ['tryout-3', 'src/data/packages/tryout-3.json'],
  ];

  it('every drill question has a non-empty explanation', () => {
    for (const [pkg, file] of DRILL_SOURCES) {
      const qs = readJson(file);
      expect(qs.length, `${pkg} has no questions`).toBeGreaterThan(0);
      const missing = qs.filter((q) => !(q.explanation || '').trim());
      expect(missing.map((q) => q.id), `${pkg} questions without explanation`).toEqual([]);
    }
  });

  it('no two questions in a package share the same explanation text', () => {
    // a duplicated explanation means the import paired one text with many
    // questions — exactly the misalignment reported in Latihan Kilat
    for (const [pkg, file] of DRILL_SOURCES) {
      const qs = readJson(file);
      const seen = new Map<string, number>();
      const dups: Array<{ text: string; ids: number[] }> = [];
      for (const q of qs) {
        const e = (q.explanation || '').trim();
        if (!e) continue;
        if (seen.has(e)) {
          const first = seen.get(e)!;
          const found = dups.find((d) => d.text === e);
          if (found) found.ids.push(q.id);
          else dups.push({ text: e, ids: [first, q.id] });
        } else {
          seen.set(e, q.id);
        }
      }
      expect(dups, `${pkg} has duplicated explanations`).toEqual([]);
    }
  });

  it('explanations are topically bound to their question stem/answer', () => {
    // Per-question vocabulary overlap is noisy on real data (short numeric items,
    // paraphrased explanations), so assert on the aggregate instead: a
    // misaligned import (the bug that scrambled Latihan Kilat) drops overlap to
    // near zero because explanations come from unrelated questions.
    const STOP = new Set([
      'yang', 'dan', 'atau', 'untuk', 'dengan', 'adalah', 'pada', 'dalam', 'akan',
      'tidak', 'ini', 'itu', 'anda', 'soal', 'nomor', 'paling', 'tepat', 'sebagai',
      'oleh', 'dari', 'ke', 'di', 'the', 'a', 'an', 'of', 'to', 'is', 'are',
    ]);
    const words = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !STOP.has(w));

    for (const [pkg, file] of DRILL_SOURCES) {
      const qs = readJson(file);
      let bound = 0;
      let total = 0;
      for (const q of qs) {
        const exp = (q.explanation || '').trim();
        if (!exp) continue;
        total++;
        const eWords = words(exp);
        const stem = new Set(words(q.text));
        const answer = new Set(words(q.options.slice().sort((a, b) => b.score - a.score)[0]?.text ?? ''));
        const sub = new Set(words(q.subCategory ?? ''));
        if (eWords.some((w) => stem.has(w) || answer.has(w) || sub.has(w))) bound++;
      }
      const ratio = bound / total;
      expect(
        ratio,
        `${pkg}: only ${(ratio * 100).toFixed(0)}% of explanations mention their question's topic`
      ).toBeGreaterThan(0.8);
    }
  });
});

// ---------------------------------------------------------
// Latihan Kilat must confirm before the user navigates away mid-session
// ---------------------------------------------------------
describe('drill navigation guard', () => {
  const DRILL = 'src/app/drill/[category]/[subCategory]/page.tsx';
  const src = read(DRILL);

  it('intercepts internal link clicks while a session is running', () => {
    expect(src).toMatch(/onClickCapture/);
    expect(src).toMatch(/closest\?\.\('a\[href\]'\)/);
    expect(src).toMatch(/setPendingHref\(href\)/);
    expect(src).toMatch(/e\.preventDefault\(\)/);
  });

  it('warns on tab close / reload via beforeunload', () => {
    expect(src).toMatch(/beforeunload/);
    expect(src).toMatch(/e\.returnValue = ''/);
  });

  it('only guards while the session is active, and releases the guard on confirm', () => {
    expect(src).toMatch(/const sessionActive = questions\.length > 0 && !isFinished && !loading/);
    expect(src).toMatch(/if \(!sessionActive \|\| allowLeave\) return;/);
    expect(src).toMatch(/const leaveTo = \(href: string\) => \{[\s\S]*?setAllowLeave\(true\)/);
  });

  it('renders the confirmation for both the exit button and an intercepted link', () => {
    expect(src).toMatch(/\{\(showExitConfirm \|\| pendingHref\) && \(/);
    expect(src).toMatch(/leaveTo\(pendingHref \|\| '\/drill'\)/);
  });

  it('does not guard after finishing the session', () => {
    // isFinished is part of sessionActive, and the finished screen returns early
    expect(src).toMatch(/sessionActive = questions\.length > 0 && !isFinished/);
  });
});

// ---------------------------------------------------------
// The seed route must heal explanations, not just write them once
// ---------------------------------------------------------
describe('migrate route explanation healing', () => {
  const src = read('src/app/api/admin/migrate/route.ts');

  it('updates explanation on conflict', () => {
    const conflictBlock = src.slice(src.indexOf('ON CONFLICT (package_id, number) DO UPDATE SET'));
    expect(conflictBlock).toMatch(/explanation = EXCLUDED\.explanation/);
  });
});
