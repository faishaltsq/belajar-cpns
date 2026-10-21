import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `/api/auth/me` is a session probe the navbar calls on every page for every
 * visitor. It used to answer 401 whenever no session existed, so a guest's
 * browser logged a console error on every page load. A probe reports the
 * session state — it never fails on "there is no session".
 */

// vi.mock is hoisted above the imports, so its factories cannot close over
// top-level consts — the state and the spies have to be hoisted with it.
const m = vi.hoisted(() => ({
  state: {
    cookieValue: undefined as string | undefined,
    tokenPayload: null as { userId: string; email: string } | null,
    dbUser: null as Record<string, unknown> | null,
  },
  verifyToken: vi.fn<(token: string) => Promise<unknown>>(),
  findUserById: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'cpns_token' && m.state.cookieValue !== undefined
        ? { name, value: m.state.cookieValue }
        : undefined,
  }),
}));
vi.mock('@/lib/auth', () => ({ verifyToken: m.verifyToken }));
vi.mock('@/lib/db', () => ({ findUserById: m.findUserById }));

import { GET } from '@/app/api/auth/me/route';

beforeEach(() => {
  m.state.cookieValue = undefined;
  m.state.tokenPayload = null;
  m.state.dbUser = null;
  m.verifyToken.mockReset();
  m.findUserById.mockReset();
  m.verifyToken.mockImplementation(async (token) => (token === 'bad-token' ? null : m.state.tokenPayload));
  m.findUserById.mockImplementation(async () => m.state.dbUser);
});

describe('GET /api/auth/me', () => {
  it('reports "no session" with 200 for a visitor without a cookie', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(m.verifyToken).not.toHaveBeenCalled();
  });

  it('reports "no session" with 200 for an unreadable token instead of 401', async () => {
    m.state.cookieValue = 'bad-token';
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
    expect(body.session_expired).toBe(true);
    expect(m.verifyToken).toHaveBeenCalledWith('bad-token');
  });

  it('returns the account for a valid session', async () => {
    m.state.cookieValue = 'good-token';
    m.state.tokenPayload = { userId: 'u-1', email: 'sari@example.com' };
    m.state.dbUser = { name: 'Sari Wijaya', phone: '0812000000' };

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: { id: 'u-1', email: 'sari@example.com', name: 'Sari Wijaya', phone: '0812000000' },
    });
  });

  it('falls back to the email local part when the database has no profile row', async () => {
    m.state.cookieValue = 'good-token';
    m.state.tokenPayload = { userId: 'u-2', email: 'budi@example.com' };
    m.state.dbUser = null;

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe('budi');
    expect(body.user.phone).toBeNull();
  });
});
