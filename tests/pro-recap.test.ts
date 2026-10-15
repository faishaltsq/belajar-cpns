// tests/pro-recap.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: any[]) => mockVerifyToken(...a) }));

import { GET as recap } from '@/app/api/pro/recap/route';

const req = () => new NextRequest('http://localhost:3000/api/pro/recap');

beforeEach(() => {
  vi.resetAllMocks();
  mockCookieStore.get.mockReturnValue({ value: 'tok' });
  mockVerifyToken.mockResolvedValue({ userId: 'u-1', email: 'a@b.c' });
});

describe('GET /api/pro/recap', () => {
  it('returns 401 when the session token is missing', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const res = await recap(req());
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user is not PRO', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: false }]);
    const res = await recap(req());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/PRO/i);
  });

  it('returns 200 with an empty recap when a PRO user has no attempts', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: true }])            // user
      .mockResolvedValueOnce([])                            // results
      .mockResolvedValueOnce([]);                           // questions
    const res = await recap(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.grouped.TWK).toEqual([]);
  });

  it('returns aggregated wrong answers for a PRO user', async () => {
    mockSql
      .mockResolvedValueOnce([{ is_pro: true }])
      .mockResolvedValueOnce([
        { package_id: 'tryout-1', answers: { '1': 'D', '2': 'B' } },
      ])
      .mockResolvedValueOnce([
        { package_id: 'tryout-1', number: 1, category: 'TWK', correct_answer: 'A', explanation: 'e1',
          options: [{ id: 'A', text: 'x', score: 5 }, { id: 'B', text: 'y', score: 0 }] },
        { package_id: 'tryout-1', number: 2, category: 'TIU', correct_answer: null, explanation: 'e2',
          options: [{ id: 'A', text: 'x', score: 0 }, { id: 'B', text: 'y', score: 5 }] },
      ]);
    const res = await recap(req());
    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.grouped.TWK).toHaveLength(1);
    expect(json.grouped.TIU).toHaveLength(0);
    expect(json.byPackage['tryout-1']).toBe(1);
  });

  it('never leaks the is_pro=false path as a 200', async () => {
    mockSql.mockResolvedValueOnce([{ is_pro: null }]);
    const res = await recap(req());
    expect(res.status).toBe(403);
  });
});

// tests/pro-recap.test.ts  (append)
describe('/rekap page', () => {
  it('exists and is a client component that calls the recap endpoint', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.join(process.cwd(), 'src/app/rekap/page.tsx');
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toMatch(/'use client'/);
    expect(src).toMatch(/\/api\/pro\/recap/);
    // must not use lucide-react (project constraint)
    expect(src).not.toMatch(/lucide-react/);
  });

  it('handles the 403 PRO gate with a readable state', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/rekap/page.tsx'), 'utf8');
    expect(src).toMatch(/403|PRO_REQUIRED/);
  });
});

describe('/riwayat surfaces the recap to PRO users', () => {
  const readRiwayat = async () => {
    const fs = await import('fs');
    const path = await import('path');
    return fs.readFileSync(path.join(process.cwd(), 'src/app/riwayat/page.tsx'), 'utf8');
  };

  it('links PRO users to the recap from the PRO card', async () => {
    const src = await readRiwayat();
    expect(src).toMatch(/href="\/rekap"/);
    expect(src).toMatch(/Soal Salah/);
  });

  it('does not publish a stale hardcoded package count', async () => {
    const src = await readRiwayat();
    // TRYOUT_LIST has grown to 37; a literal here already says 19+
    expect(src).not.toMatch(/19\+ paket/);
    expect(src).toMatch(/\{TOTAL_TRYOUT_PACKAGES\}/);
  });
});
