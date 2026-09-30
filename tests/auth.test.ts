import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../src/lib/auth';

describe('Auth Security Helper', () => {
  it('hashes and verifies password securely', async () => {
    const password = 'rahasia123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$.{56}$/);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('salah', hash);
    expect(isWrong).toBe(false);
  });

  it('generates and decodes JWT session token', async () => {
    const payload = { email: 'budi@test.com', userId: 'user-1' };
    const token = await createToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = await verifyToken(token);
    expect(decoded?.email).toBe('budi@test.com');
    expect(decoded?.userId).toBe('user-1');
  });

  it('returns null for invalid/tampered token', async () => {
    const decoded = await verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
});
