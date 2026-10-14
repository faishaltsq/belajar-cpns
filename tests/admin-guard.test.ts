import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB layer so route modules import cleanly without env vars
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => null),
  isDbConnected: vi.fn(async () => true),
}));

// Mock adminAuth to control guard behavior per test
vi.mock('@/lib/adminAuth', () => ({
  isAuthorizedAdmin: vi.fn(),
}));

import { isAuthorizedAdmin } from '@/lib/adminAuth';
const mockGuard = vi.mocked(isAuthorizedAdmin);

describe('admin route guards', () => {
  beforeEach(() => {
    mockGuard.mockReset();
  });

  it('question-bank GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank?limit=1');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('question-bank POST returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { POST } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank', {
      method: 'POST',
      body: JSON.stringify({ action: 'build_package', packageId: 'p1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('generate-ebook POST returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { POST } = await import('@/app/api/admin/generate-ebook/route');
    const req = new Request('https://x.dev/api/admin/generate-ebook', {
      method: 'POST',
      body: JSON.stringify({ category: 'TWK', count: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('generate-ebook GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/generate-ebook/route');
    const req = new Request('https://x.dev/api/admin/generate-ebook');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('figural-img GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/figural-img/route');
    const req = new Request('https://x.dev/api/admin/figural-img?filename=fig_a_01.png');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('db-status GET returns 401 when guard rejects', async () => {
    mockGuard.mockReturnValue(false);
    const { GET } = await import('@/app/api/admin/db-status/route');
    const req = new Request('https://x.dev/api/admin/db-status');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('guard passes through when authorized (question-bank GET reaches DB branch)', async () => {
    mockGuard.mockReturnValue(true);
    const { GET } = await import('@/app/api/admin/question-bank/route');
    const req = new Request('https://x.dev/api/admin/question-bank?limit=1');
    const res = await GET(req as any);
    // getDb mocked to null -> route's own "DB not configured" branch, NOT 401
    expect(res.status).toBe(500);
  });
});
