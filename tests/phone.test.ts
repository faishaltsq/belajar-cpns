import { describe, it, expect } from 'vitest';
import { normalizeIndonesianPhone, validatePhoneAndPin } from '../src/lib/phone';

describe('Phone & PIN Validation', () => {
  it('normalizes local 08xx to standard 628xx format', () => {
    expect(normalizeIndonesianPhone('081234567890')).toBe('6281234567890');
    expect(normalizeIndonesianPhone('+62812-3456-7890')).toBe('6281234567890');
    expect(normalizeIndonesianPhone('6281234567890')).toBe('6281234567890');
  });

  it('normalizes bare 8xx (no leading 0 or 62) to 628xx', () => {
    expect(normalizeIndonesianPhone('81234567890')).toBe('6281234567890');
  });

  it('rejects empty string and whitespace-only input', () => {
    expect(() => normalizeIndonesianPhone('')).toThrow('Nomor HP tidak boleh kosong');
    expect(() => normalizeIndonesianPhone('   ')).toThrow('Nomor HP tidak boleh kosong');
  });

  it('rejects invalid phone numbers', () => {
    expect(() => normalizeIndonesianPhone('08123')).toThrow('Nomor HP tidak valid');
    expect(() => normalizeIndonesianPhone('0215555555')).toThrow('Harus nomor seluler Indonesia');
  });

  it('validates 6-digit numeric PIN', () => {
    const valid = validatePhoneAndPin('081234567890', '123456');
    expect(valid.isValid).toBe(true);

    const invalidPin = validatePhoneAndPin('081234567890', '1234a');
    expect(invalidPin.isValid).toBe(false);
    expect(invalidPin.error).toContain('PIN harus berupa 6 digit angka');
  });
});
