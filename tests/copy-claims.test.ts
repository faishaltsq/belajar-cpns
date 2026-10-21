import { describe, it, expect } from 'vitest';

/**
 * P2-15: EXAM_RULES.verification is 'reference' until the figures for
 * EXAM_YEAR are confirmed in an actual BKN publication. Marketing copy must
 * not label passing-grade/marking rules as "resmi" for a year that has not
 * been announced - the FAQ and SEO descriptions get guarded here the same way
 * the code figures are guarded by EXAM_RULES tests.
 */

describe('P2-15 - copy never calls unconfirmed numbers official', () => {
  const read = async (rel: string) => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  };

  it('home FAQ does not advertise "passing grade resmi" for the exam year', async () => {
    const src = await read('src/app/page.tsx');
    expect(src).not.toMatch(/passing grade resmi/i);
    // the answer cites the regulation as the package basis instead
    expect(src).toMatch(/Kepmen PANRB 321\/2024/);
    expect(src).toMatch(/rujukan peraturan/);
  });

  it('home FAQ marking rules stay framed as the known CAT behaviour', async () => {
    const src = await read('src/app/page.tsx');
    expect(src).toMatch(/acuan penyelenggaraan BKN/);
  });

  it('simulasi SEO description does not promise official 2027 rules', async () => {
    const src = await read('src/app/simulasi/layout.tsx');
    expect(src).not.toMatch(/standar resmi BKN/);
    expect(src).toMatch(/standar acuan BKN/);
  });

  it('tryout page keeps the timing copy on the reference frame', async () => {
    const src = await read('src/components/TryoutContent.tsx');
    expect(src).not.toMatch(/waktu resmi CAT BKN/);
    expect(src).toMatch(/waktu acuan CAT BKN/);
  });
});
