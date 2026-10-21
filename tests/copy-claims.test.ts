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

/**
 * P3-16: /riwayat purges every `lolos_guest_exam_*` key and returns before the
 * list is built, so a guest's history is empty by design. The banner used to
 * promise that history was stored, which was false for exactly the visitors the
 * purge protects. The purge stays; the promise becomes conditional on the same
 * `userId` signal the purge reads. A signed-in user's sentence must not change.
 */
describe('P3-16 - the /riwayat banner never promises a guest storage it purges', () => {
  const readPage = async () => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(path.join(process.cwd(), 'src/app/riwayat/page.tsx'), 'utf8');
  };

  it('still purges guest results before building the list (the privacy behaviour is kept)', async () => {
    const src = await readPage();
    expect(src).toMatch(/startsWith\('lolos_guest_exam_'\)/);
    expect(src).toMatch(/guestKeys\.forEach\(k => localStorage\.removeItem\(k\)\)/);
    // the purge branch must still bail out before any history is assembled
    expect(src).toMatch(/if \(!userId\) \{[\s\S]{0,400}?return;[\s\S]{0,80}?\}/);
  });

  it('renders the banner copy from the userId branch, not as an unconditional promise', async () => {
    const src = await readPage();
    expect(src).toMatch(/\{storageNotice\}/);
    // the old defect: the promise sat directly after the icon as a text node
    expect(src).not.toMatch(
      /<BookOpen size=\{14\} className="shrink-0" \/>\s*Riwayat pengerjaan soal disimpan di peramban ini\./
    );
  });

  it('leaves the signed-in sentence exactly as it was', async () => {
    const src = await readPage();
    expect(src).toMatch(
      /userId\s*\?\s*'Riwayat pengerjaan soal disimpan di peramban ini\.'/
    );
  });

  it('tells a guest the result is not saved to history and points at signing in', async () => {
    const src = await readPage();
    const guest = src.match(/:\s*'([^']*tamu[^']*)'/)?.[1] ?? '';
    expect(guest).not.toBe('');
    // the claim the defect was about: a guest is not told it is kept in the browser
    expect(guest).not.toMatch(/disimpan di peramban ini/);
    expect(guest).toMatch(/tidak masuk riwayat/);
    // and it names the real lifetime (sessionStorage dies with the tab)
    expect(guest).toMatch(/selama tab ini terbuka/);
    expect(guest).toMatch(/Masuk/);
  });
});
