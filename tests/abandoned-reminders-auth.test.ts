import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The abandoned-cart endpoint sends real email. Its guard used to be
 * `if (cronSecret && header !== ...)`, which silently disabled authorization
 * whenever the secret was missing — an unauthenticated trigger for a mailer.
 * These cases pin the corrected behaviour: refuse when unconfigured, refuse on
 * a wrong key, run only on a matching one.
 */
vi.mock('@/lib/db', () => ({ getDb: () => null }));
vi.mock('@/lib/mailer', () => ({ sendOtpEmail: vi.fn() }));

import { POST } from '@/app/api/payment/abandoned-reminders/route';

function call(authorization?: string) {
  return POST(
    new NextRequest('http://localhost/api/payment/abandoned-reminders', {
      method: 'POST',
      headers: authorization ? { authorization } : {},
    })
  );
}

describe('abandoned-reminders authorization', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('ADMIN_SECRET', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('refuses to run when no secret is configured', async () => {
    const res = await call('Bearer anything');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Not configured' });
  });

  it('refuses an unauthenticated request even when unconfigured', async () => {
    const res = await call();
    expect(res.status).toBe(503);
  });

  it('refuses a wrong key', async () => {
    vi.stubEnv('CRON_SECRET', 'right-key');
    const res = await call('Bearer wrong-key');
    expect(res.status).toBe(401);
  });

  it('refuses a bare request when a key is configured', async () => {
    vi.stubEnv('CRON_SECRET', 'right-key');
    const res = await call();
    expect(res.status).toBe(401);
  });

  it('gets past the gate on a matching key', async () => {
    vi.stubEnv('CRON_SECRET', 'right-key');
    const res = await call('Bearer right-key');
    // Not 401/503: the database is stubbed out, so the handler stops one step
    // later at "Database unavailable" — proving authorization was satisfied.
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Database unavailable');
  });

  it('accepts ADMIN_SECRET as a manual-run key', async () => {
    vi.stubEnv('ADMIN_SECRET', 'ops-key');
    const res = await call('Bearer ops-key');
    expect(res.status).toBe(500);
  });
});
