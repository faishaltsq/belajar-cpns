// tests/leaderboard-scope.test.ts
//
// Regression suite for the per-package leaderboard.
//
// Two rules that used to be broken and are now pinned here:
//
//   1. The board belongs to exactly one package. `WHERE er.package_id = $1` is
//      the only thing that decides membership, so a score from tryout-4 can
//      never surface on the tryout-mini board.
//   2. Rank is per PARTICIPANT, not per `exam_results` row. One account that
//      sat the same package five times used to occupy five slots and push
//      everybody else off the 50-row page.
//
// The SQL is asserted textually (the window functions are the fix — a rewrite
// that drops them silently reintroduces the bug) and the row mapping is
// asserted against a crafted result set.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.fn();

// `getPackageLeaderboard` calls the module-local `getDb`, so replacing the
// export would never reach it. Mock the DRIVER instead: a .neon.tech hostname
// routes `getDb()` down the neon-http branch, which returns this function.
vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockSql,
  neonConfig: {},
}));

const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: () => mockCookieStore }));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth', () => ({ verifyToken: (...a: unknown[]) => mockVerifyToken(...a) }));

import { getPackageLeaderboard } from '@/lib/db';
import { GET as leaderboardGet } from '@/app/api/leaderboard/[packageId]/route';

process.env.DATABASE_URL = 'postgresql://user:pass@fake-db.neon.tech/neondb';

/** Capture the SQL text of the one query the helper runs. */
function captureSql(rows: Record<string, unknown>[] = []) {
  const texts: string[] = [];
  mockSql.mockImplementation((strings: TemplateStringsArray) => {
    texts.push(strings.join('?'));
    return Promise.resolve(rows);
  });
  return texts;
}

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const RESULT_ID = '33333333-3333-4333-8333-333333333333';

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    rank: 1,
    result_id: RESULT_ID,
    user_id: UUID_A,
    user_name: 'Ani',
    total_score: 400,
    score_tkp: 166,
    score_tiu: 130,
    score_twk: 104,
    duration_used: 3600,
    is_passed: true,
    finished_at: '2026-10-20T10:00:00.000Z',
    attempt_count: 1,
    total_participants: 1,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieStore.get.mockReturnValue(undefined);
  mockVerifyToken.mockResolvedValue(null);
  mockSql.mockResolvedValue([]);
});

describe('getPackageLeaderboard — paket yang jadi cakupan papan', () => {
  it('memfilter satu paket saja dan tidak pernah menggabungkan paket lain', async () => {
    const texts = captureSql();
    await getPackageLeaderboard('tryout-mini');
    expect(texts).toHaveLength(1);
    // The scope is the package filter, and it must be a bound parameter, not a
    // string the caller could widen.
    expect(texts[0]).toMatch(/WHERE\s+er\.package_id\s*=\s*\?/i);
    expect(texts[0]).not.toMatch(/package_id\s+IN\s*\(/i);
  });

  it('memakai filter paket yang diminta, bukan daftar paket', async () => {
    const seen: unknown[][] = [];
    mockSql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      seen.push(values);
      return Promise.resolve([]);
    });
    await getPackageLeaderboard('tryout-4');
    // values: [packageId, limit, userId, userId, resultId, resultId]
    expect(seen[0][0]).toBe('tryout-4');
  });
});

describe('getPackageLeaderboard — satu baris per peserta', () => {
  it('mengurutkan percobaan terbaik per peserta lewat window function', async () => {
    const texts = captureSql();
    await getPackageLeaderboard('tryout-mini');
    const sql = texts[0];
    expect(sql).toMatch(/ROW_NUMBER\(\)\s+OVER/i);
    expect(sql).toMatch(/PARTITION BY\s+a\.participant_key/i);
    expect(sql).toMatch(/attempt_no\s*=\s*1/i);
    expect(sql).toMatch(/COUNT\(\*\)\s+OVER\s*\(\s*PARTITION BY\s+a\.participant_key\s*\)/i);
  });

  it('memisahkan tamu sebagai peserta sendiri tanpa menggabungkannya', async () => {
    const texts = captureSql();
    await getPackageLeaderboard('tryout-mini');
    expect(texts[0]).toMatch(/COALESCE\(er\.user_id::text,\s*'anon:'\s*\|\|\s*er\.id::text\)/i);
  });

  it('memakai tie-breaker BKN: total, TKP, TIU, TWK, lalu durasi tercepat', async () => {
    const texts = captureSql();
    await getPackageLeaderboard('tryout-mini');
    const order = texts[0].match(/ORDER BY[\s\S]*?FROM board/i)?.[0] ?? '';
    const idx = (needle: string) => order.indexOf(needle);
    expect(idx('b.total_score DESC')).toBeGreaterThan(-1);
    expect(idx('b.score_tkp DESC')).toBeGreaterThan(idx('b.total_score DESC'));
    expect(idx('b.score_tiu DESC')).toBeGreaterThan(idx('b.score_tkp DESC'));
    expect(idx('b.score_twk DESC')).toBeGreaterThan(idx('b.score_tiu DESC'));
    expect(idx('b.duration_used ASC')).toBeGreaterThan(idx('b.score_twk DESC'));
  });
});

describe('getPackageLeaderboard — semua user bisa masuk papan', () => {
  it('mengembalikan baris pemanggil walau peringkatnya di luar limit', async () => {
    const texts = captureSql([row({ rank: 137, user_id: UUID_B, user_name: 'Budi', total_score: 210, total_participants: 400 })]);
    const board = await getPackageLeaderboard('tryout-mini', { limit: 50, userId: UUID_B });
    expect(board.rows).toHaveLength(1);
    expect(board.me?.rank).toBe(137);
    expect(board.me?.user_name).toBe('Budi');
    expect(board.totalParticipants).toBe(400);
    // The own-row clause is what makes this possible; the limit alone would
    // have dropped it.
    expect(texts[0]).toMatch(/user_id\s*=\s*\?::uuid/i);
  });

  it('menemukan baris tamu lewat resultId', async () => {
    captureSql([row({ rank: 12, user_id: null, user_name: null })]);
    const board = await getPackageLeaderboard('tryout-mini', { resultId: RESULT_ID });
    expect(board.me?.rank).toBe(12);
    expect(board.me?.user_id).toBeNull();
  });

  it('tidak pernah membocorkan result_id ke payload', async () => {
    captureSql([row()]);
    const board = await getPackageLeaderboard('tryout-mini', { userId: UUID_A });
    expect(board.rows[0]).not.toHaveProperty('result_id');
    expect(board.me).not.toHaveProperty('result_id');
  });

  it('menolak resultId yang bukan uuid tanpa menembak query ber-cast uuid', async () => {
    captureSql([row()]);
    const board = await getPackageLeaderboard('tryout-mini', { resultId: 'bukan-uuid' });
    // A cast of a non-uuid raises 22P02 in Postgres and would 500 the board;
    // the guard turns it into "matches nothing" instead.
    expect(board.me).toBeNull();
  });

  it('mengembalikan papan kosong saat database tidak tersedia', async () => {
    mockSql.mockImplementation(() => Promise.reject(new Error('down')));
    const board = await getPackageLeaderboard('tryout-mini');
    expect(board.rows).toEqual([]);
    expect(board.me).toBeNull();
    expect(board.totalParticipants).toBe(0);
  });
});

describe('GET /api/leaderboard/[packageId]', () => {
  const req = (url: string) => new NextRequest(`https://lolosin.com${url}`);

  it('mengembalikan papan paket itu beserta total peserta sebenarnya', async () => {
    // Real SQL: every row carries the same `total_participants` (COUNT(*) OVER ()).
    captureSql([
      row({ rank: 1, total_participants: 2 }),
      row({ rank: 2, user_id: UUID_B, user_name: 'Budi', total_score: 380, total_participants: 2 }),
    ]);
    const res = await leaderboardGet(req('/api/leaderboard/tryout-mini') as never, {
      params: { packageId: 'tryout-mini' },
    } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.packageId).toBe('tryout-mini');
    expect(body.leaderboard).toHaveLength(2);
    expect(body.leaderboard[0].rank).toBe(1);
    expect(body.leaderboard[1].rank).toBe(2);
    // totalParticipants is the board size, not the page size — the old code
    // reported `list.length`, which capped at the limit.
    expect(body.totalParticipants).toBe(2);
  });

  it('meneruskan resultId dari query string supaya baris pemanggil ikut', async () => {
    const seen: unknown[][] = [];
    mockSql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      seen.push(values);
      return Promise.resolve([row({ rank: 91, total_participants: 91 })]);
    });
    const res = await leaderboardGet(
      req(`/api/leaderboard/tryout-mini?resultId=${RESULT_ID}`) as never,
      { params: { packageId: 'tryout-mini' } } as never
    );
    const body = await res.json();
    expect(body.me?.rank).toBe(91);
    expect(seen[0]).toContain(RESULT_ID);
  });

  it('memakai identitas sesi untuk menemukan baris user yang login', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === 'cpns_token' ? { name, value: 'valid-token' } : undefined
    );
    mockVerifyToken.mockResolvedValue({ userId: UUID_A, email: 'ani@example.test' });
    const seen: unknown[][] = [];
    mockSql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      seen.push(values);
      return Promise.resolve([row({ rank: 3 })]);
    });
    const res = await leaderboardGet(req('/api/leaderboard/tryout-mini') as never, {
      params: { packageId: 'tryout-mini' },
    } as never);
    const body = await res.json();
    expect(body.me?.rank).toBe(3);
    expect(seen[0]).toContain(UUID_A);
  });

  it('tidak bisa di-cache: papan berubah tiap ada hasil baru', async () => {
    captureSql([row()]);
    const res = await leaderboardGet(req('/api/leaderboard/tryout-mini') as never, {
      params: { packageId: 'tryout-mini' },
    } as never);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('menolak packageId kosong dengan 400', async () => {
    const res = await leaderboardGet(req('/api/leaderboard/') as never, {
      params: { packageId: '' },
    } as never);
    expect(res.status).toBe(400);
  });
});
