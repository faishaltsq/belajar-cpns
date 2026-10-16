import { describe, it, expect, vi, beforeEach } from 'vitest';

// No DB in tests: route imports getDb and must degrade gracefully
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => null),
  isDbConnected: vi.fn(async () => true),
}));

vi.mock('@/lib/adminAuth', () => ({
  isAuthorizedAdmin: vi.fn(),
}));

import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { GET } from '@/app/api/questions/[id]/route';
import { POST } from '@/app/api/admin/normalize-images/route';

const mockGuard = vi.mocked(isAuthorizedAdmin);

function makeReq(path: string, init?: RequestInit): Request {
  return new Request(`https://lolosin.com${path}`, init);
}

describe('GET /api/questions/[id]', () => {
  it('serves CDN cacheable headers instead of no-store', async () => {
    const res = await GET(makeReq('/api/questions/tryout-1') as any, {
      params: { id: 'tryout-1' },
    });
    const cc = res.headers.get('Cache-Control') || '';
    expect(cc).toContain('s-maxage=');
    expect(cc).toContain('stale-while-revalidate=');
    expect(cc).not.toContain('no-store');
    expect(cc).toContain('public');
  });

  it('does not leak _debug diagnostics in the payload', async () => {
    const res = await GET(makeReq('/api/questions/tryout-1') as any, {
      params: { id: 'tryout-1' },
    });
    if (res.status === 200) {
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).not.toHaveProperty('_debug');
      expect(body).toHaveProperty('questions');
      expect(body).toHaveProperty('meta');
    } else {
      // package missing in test env is fine; header check above still ran
      expect(res.status).toBe(404);
    }
  });
});

describe('POST /api/admin/normalize-images', () => {
  beforeEach(() => {
    mockGuard.mockReset();
  });

  it('returns 401 when the admin guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const res = await POST(makeReq('/api/admin/normalize-images', { method: 'POST' }) as any);
    expect(res.status).toBe(401);
  });

  it('reaches the DB branch (not 401) when authorized', async () => {
    mockGuard.mockReturnValue(true);
    const res = await POST(makeReq('/api/admin/normalize-images', { method: 'POST' }) as any);
    // getDb mocked to null -> route's own "DB not configured" branch
    expect(res.status).toBe(500);
  });
});
