import { describe, it, expect } from 'vitest';
import { getClientIp } from '@/lib/rateLimit';

function reqWith(headers: Record<string, string>): Request {
  return new Request('https://x.dev/api/auth/login', { headers });
}

describe('getClientIp', () => {
  it('uses the LAST XFF hop (edge-observed), not the spoofable first hop', () => {
    const req = reqWith({ 'x-forwarded-for': '6.6.6.6, 36.86.50.10' });
    expect(getClientIp(req)).toBe('36.86.50.10');
  });

  it('handles single-hop XFF (no proxy chain)', () => {
    const req = reqWith({ 'x-forwarded-for': '36.86.50.10' });
    expect(getClientIp(req)).toBe('36.86.50.10');
  });

  it('falls back to x-real-ip when XFF absent', () => {
    const req = reqWith({ 'x-real-ip': '36.86.50.11' });
    expect(getClientIp(req)).toBe('36.86.50.11');
  });

  it('returns 127.0.0.1 when no proxy headers at all', () => {
    expect(getClientIp(reqWith({}))).toBe('127.0.0.1');
  });

  it('never returns an empty string for blank XFF', () => {
    const req = reqWith({ 'x-forwarded-for': '  ', 'x-real-ip': '10.1.2.3' });
    expect(getClientIp(req)).toBe('10.1.2.3');
  });
});
