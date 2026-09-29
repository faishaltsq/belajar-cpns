import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, createToken, verifyToken } from '../src/lib/auth';
import { findUserByPhone, createUser } from '../src/lib/supabase';

describe('Auth Security Helper', () => {
  it('hashes and verifies 6-digit PIN securely', async () => {
    const pin = '123456';
    const hash = await hashPin(pin);
    expect(hash).not.toBe(pin);
    expect(hash).toMatch(/^\$2[aby]\$.{56}$/);

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

describe('Supabase DB helpers (in-memory fallback)', () => {
  it('findUserByPhone returns null for unknown phone', async () => {
    const result = await findUserByPhone('0000000000000');
    expect(result).toBeNull();
  });

  it('createUser then findUserByPhone returns created user', async () => {
    const phone = '6289999999999';
    const pinHash = 'hash_placeholder';
    const name = 'Test Peserta';

    const created = await createUser(phone, pinHash, name);
    expect(created.phone).toBe(phone);
    expect(created.pin_hash).toBe(pinHash);
    expect(created.name).toBe(name);
    expect(typeof created.id).toBe('string');

    const found = await findUserByPhone(phone);
    expect(found).not.toBeNull();
    expect(found?.phone).toBe(phone);
    expect(found?.pin_hash).toBe(pinHash);
    expect(found?.name).toBe(name);
    expect(found?.id).toBe(created.id);
  });
});
