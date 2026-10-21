/**
 * Single source of truth for SKD exam rules and exam-year labels.
 *
 * `PASSING_GRADES`, `QUESTION_LIMITS` and `MAX_SCORES` used to be declared in
 * `src/lib/scoring.ts` while `src/components/Footer.tsx` and
 * `src/app/profil/page.tsx` restated the same 65 / 80 / 166 by hand, and
 * "CPNS 2027" was written out literally in twenty-plus places. Nothing failed
 * when those drifted, so they eventually disagreed — the profile page calls the
 * grade "Resmi BKN 2024" while the footer calls it "Info Seleksi 2027".
 *
 * Everything that quotes an exam year or a passing grade reads it from here.
 */

/** Year every marketing, SEO and share string targets. */
export const EXAM_YEAR = 2027;

/**
 * Passing grade, max score and question count per sub-test.
 *
 * These are the figures the scoring path uses, so they are the authority — a
 * page that displays a passing grade must import them rather than restate them.
 */
export const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 } as const;
export const QUESTION_LIMITS = { TWK: 30, TIU: 35, TKP: 45, TOTAL: 110 } as const;
export const MAX_SCORES = { TWK: 150, TIU: 175, TKP: 225, TOTAL: 550 } as const;

export type SubTestKey = keyof typeof PASSING_GRADES;

/**
 * Provenance of the numbers above.
 *
 * `verification` is deliberately part of the contract: an audit can prove the
 * code applies the same figure everywhere, it cannot prove a figure is what a
 * regulator will publish for a recruitment year that has not been announced.
 * Until someone cites the actual document for `EXAM_YEAR`, copy should present
 * these as the reference rules the packages are built on, not as a published
 * requirement for that year.
 */
export const EXAM_RULES = {
  /** 'reference' until the figure is confirmed for EXAM_YEAR; 'official' only then. */
  verification: 'reference' as 'reference' | 'official',
  citedSource: 'Kepmen PANRB 321/2024',
  citedOn: '2024',
  note:
    'Acuan penyusunan paket simulasi. Ketentuan resmi untuk tahun penerimaan berikutnya dapat berubah.',
} as const;

/** "CPNS 2027" — the year-scoped label used in headings and copy. */
export function cpnsLabel(year: number = EXAM_YEAR): string {
  return `CPNS ${year}`;
}

/** "SKD CPNS 2027" — the year-scoped label used in titles. */
export function skdLabel(year: number = EXAM_YEAR): string {
  return `SKD ${cpnsLabel(year)}`;
}

/** "TWK 65, TIU 80, TKP 166" — one formatter so no page restates the trio. */
export function passingGradeLine(): string {
  return (Object.keys(PASSING_GRADES) as SubTestKey[])
    .map((k) => `${k} ${PASSING_GRADES[k]}`)
    .join(', ');
}

/** "Passing Grade: TWK 65, TIU 80, TKP 166" */
export function passingGradeListItem(): string {
  return `Passing Grade: ${passingGradeLine()}`;
}
