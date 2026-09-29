import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, createToken, verifyToken } from '../src/lib/auth';

describe('Auth Security Helper', () => {
  it('hashes and verifies 6-digit PIN securely', async () => {
    const pin = '123456';
    const hash = await hashPin(pin);
    expect(hash).not.toBe(pin);
    expect(hash.length).toBeGreaterThan(20);

    const isMatch = await verifyPin(pin, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPin('654321', hash);
    expect(isWrong).toBe(false);
  });

  it('generates and decodes JWT session token', async () => {
    const payload = { phone: '6281234567890', userId: 'user-1' };
    const token = await createToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = await verifyToken(token);
    expect(decoded?.phone).toBe('6281234567890');
    expect(decoded?.userId).toBe('user-1');
  });

  it('returns null for invalid/tampered token', async () => {
    const decoded = await verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
});
