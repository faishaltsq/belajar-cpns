import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CATALOG_QUESTION_TOTAL,
  CATALOG_TOTAL,
  FREE_PACKAGE_TOTAL,
  STANDARD_110_TOTAL,
  catalogHeadline,
  catalogMetaDescription,
} from '@/lib/catalogStats';
import { EXAM_YEAR, PASSING_GRADES, QUESTION_LIMITS, passingGradeLine } from '@/lib/examRules';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { FREE_PACKAGE_IDS } from '@/lib/pricing';

/**
 * Guards for the two ways this codebase's marketing copy drifted away from the
 * product: counts typed by hand, and exam-year / passing-grade figures restated
 * in every component that displays them.
 */

const SRC = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC);

function filesMatching(re: RegExp): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of FILES) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((text, i) => {
      if (re.test(text)) {
        // Relative, always forward-slashed — allowlists are written POSIX-style.
        hits.push({ file: path.relative(SRC, file).split(path.sep).join('/'), line: i + 1, text: text.trim() });
      }
      re.lastIndex = 0;
    });
  }
  return hits;
}

describe('catalog counts are derived, not typed', () => {
  it('matches TRYOUT_LIST exactly', () => {
    expect(CATALOG_TOTAL).toBe(TRYOUT_LIST.length);
    expect(STANDARD_110_TOTAL).toBe(TRYOUT_LIST.filter((p) => p.questionCount === 110).length);
    expect(CATALOG_QUESTION_TOTAL).toBe(
      TRYOUT_LIST.reduce((sum, p) => sum + p.questionCount, 0)
    );
    expect(FREE_PACKAGE_TOTAL).toBe(FREE_PACKAGE_IDS.length);
  });

  it('the free count only counts packages that actually exist', () => {
    for (const id of FREE_PACKAGE_IDS) {
      expect(TRYOUT_LIST.some((p) => p.id === id)).toBe(true);
    }
  });

  it('no source file restates a catalog headline number', () => {
    const hits = filesMatching(/\b37 paket|\b3\.898 Soal|\b3898 Soal/).filter(
      (h) => h.file !== 'lib/catalogStats.ts'
    );
    expect(hits.map((h) => `${h.file}:${h.line}`)).toEqual([]);
  });

  it('builds the meta strings from the catalog', () => {
    const headline = catalogHeadline('Gratis tanpa login.');
    expect(headline).toContain(`${CATALOG_TOTAL} Paket`);
    expect(headline).toContain('3.898 Soal');
    expect(headline.startsWith(`${CATALOG_TOTAL} Paket Tryout CAT Standar BKN`)).toBe(true);

    const meta = catalogMetaDescription('Prefix.', 'Suffix.');
    expect(meta).toContain(`${CATALOG_TOTAL} paket tryout`);
    expect(meta).toContain(`${STANDARD_110_TOTAL} di antaranya`);
    expect(meta).toContain('Suffix.');
  });
});

describe('exam year has one source', () => {
  it('every year label written in src agrees with EXAM_YEAR', () => {
    const hits = filesMatching(/(?:CPNS|SKD)\s+(20\d{2})/).filter(
      (h) => h.file !== 'lib/examRules.ts'
    );
    const wrong = hits.filter((h) => !h.text.includes(String(EXAM_YEAR)));
    expect(wrong.map((h) => `${h.file}:${h.line}: ${h.text}`)).toEqual([]);
  });
});

describe('passing grades have one source', () => {
  it('no component restates the 65/80/166 trio by hand', () => {
    // Matches the literal pattern as written in JSX copy, not the import.
    const hits = filesMatching(/TWK 65,\s*TIU 80,\s*TKP 166/).filter(
      (h) => h.file !== 'lib/examRules.ts' && h.file !== 'lib/scoring.ts'
    );
    expect(hits.map((h) => `${h.file}:${h.line}`)).toEqual([]);
  });

  it('formats the line used in copy from the same constants the scorer uses', () => {
    expect(passingGradeLine()).toBe('TWK 65, TIU 80, TKP 166');
    expect(PASSING_GRADES.TWK).toBe(65);
    expect(PASSING_GRADES.TIU).toBe(80);
    expect(PASSING_GRADES.TKP).toBe(166);
    expect(QUESTION_LIMITS.TOTAL).toBe(110);
  });
});

describe('homepage headline numbers are read, not typed', () => {
  it('no page types a package total by hand', () => {
    // The inverse of the checks above: restating the *correct* number is banned,
    // but a stale one slipped straight through — the homepage stats bar said
    // "36 Paket (3.816 Soal)" while the catalog publishes 37 / 3.898. Ban any
    // typed package count outside the module that computes them.
    const hits = filesMatching(/\b\d{1,4}\s*Paket\b/).filter(
      (h) => h.file !== 'lib/catalogStats.ts'
    );
    expect(hits.map((h) => `${h.file}:${h.line}: ${h.text}`)).toEqual([]);
  });

  it('no catalog headline surface types a question total by hand', () => {
    // Scoped to the two surfaces that headline the catalog's size. Module cards
    // may legitimately state their own question count ("45 Soal" for a
    // psikotes module); the aggregate cannot be typed anywhere.
    const surfaces = ['app/page.tsx', 'app/opengraph-image.tsx'];
    const hits = filesMatching(/\b\d{1,4}(?:[.,]\d{3})*\s*Soal\b/).filter((h) =>
      surfaces.includes(h.file)
    );
    expect(hits.map((h) => `${h.file}:${h.line}: ${h.text}`)).toEqual([]);
  });
});
