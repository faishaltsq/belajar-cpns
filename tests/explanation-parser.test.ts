import { describe, it, expect } from 'vitest';
import { parseExplanation } from '@/lib/explanationParser';

describe('parseExplanation', () => {
  it('splits text at "Trik Cepat:" marker', () => {
    const text = 'Pasal 1 UUD 1945 mengatur tentang bentuk negara.\nTrik Cepat: Ingat kata kunci "kedaulatan rakyat".';
    const result = parseExplanation(text);
    expect(result.core).toBe('Pasal 1 UUD 1945 mengatur tentang bentuk negara.');
    expect(result.trickTip).toContain('Trik Cepat');
  });

  it('splits text at "Tips:" marker', () => {
    const text = 'Ini penjelasan utama.\nTips: Gunakan eliminasi.';
    const result = parseExplanation(text);
    expect(result.core).toBe('Ini penjelasan utama.');
    expect(result.trickTip).toContain('Tips');
  });

  it('returns core only when no trick marker found', () => {
    const text = 'Penjelasan biasa tanpa tips.';
    const result = parseExplanation(text);
    expect(result.core).toBe('Penjelasan biasa tanpa tips.');
    expect(result.trickTip).toBeNull();
  });

  it('handles empty text', () => {
    expect(parseExplanation('')).toEqual({ core: '', trickTip: null });
  });
});
