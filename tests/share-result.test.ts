import { describe, it, expect } from 'vitest';
import { generateShareText, getWhatsAppShareUrl } from '../src/lib/shareResult';

describe('Exam Result Share Helper', () => {
  it('generates well-formatted share text for passing score', () => {
    const text = generateShareText({
      tryoutLabel: 'Tryout 1',
      totalScore: 420,
      twk: 95,
      tiu: 130,
      tkp: 195,
      isPassedAll: true,
      siteUrl: 'https://belajar-cpns-saas.vercel.app',
    });

    expect(text).toContain('Lolos.in');
    expect(text).toContain('Tryout 1');
    expect(text).toContain('420/550');
    expect(text).toContain('LOLOS');
    expect(text).toContain('TWK: 95 | TIU: 130 | TKP: 195');
    expect(text).toContain('https://belajar-cpns-saas.vercel.app');
  });

  it('generates share text for not passing score', () => {
    const text = generateShareText({
      tryoutLabel: 'Tryout Mini',
      totalScore: 280,
      twk: 50,
      tiu: 70,
      tkp: 160,
      isPassedAll: false,
    });

    expect(text).toContain('280/550');
    expect(text).toContain('BELUM MEMENUHI');
  });

  it('generates valid WhatsApp click-to-chat URL', () => {
    const url = getWhatsAppShareUrl('Halo Lolos.in');
    expect(url).toBe('https://api.whatsapp.com/send?text=Halo%20Lolos.in');
  });
});
