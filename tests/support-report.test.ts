import { describe, it, expect, vi } from 'vitest';
import { generateWhatsAppLink, generateMailtoLink, SUPPORT_EMAIL, SUPPORT_WA_PHONE } from '@/lib/support';
import { POST as supportReportRoute } from '@/app/api/support/report/route';
import { NextRequest } from 'next/server';

// Mock DB
const mockSql = vi.fn().mockResolvedValue([{ id: 101 }]);
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

describe('Support Helpers', () => {
  it('has correct support email and WhatsApp admin number', () => {
    expect(SUPPORT_EMAIL).toBe('halo.lolosin.support@gmail.com');
    expect(SUPPORT_WA_PHONE).toBe('62859106831589');
  });

  it('generates valid WhatsApp URL with encoded message and context', () => {
    const link = generateWhatsAppLink({
      category: 'Bug Teknis',
      description: 'Tombol submit tidak respon',
      userEmail: 'peserta@example.com',
      pageUrl: 'https://belajar-cpns-saas.vercel.app/simulasi/tryout-1',
    });

    expect(link).toContain('https://wa.me/62859106831589?text=');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('Lolos.in');
    expect(decoded).toContain('Bug Teknis');
    expect(decoded).toContain('peserta@example.com');
    expect(decoded).toContain('Tombol submit tidak respon');
  });

  it('generates valid mailto URL with subject and prefilled body', () => {
    const link = generateMailtoLink({
      category: 'Soal & Pembahasan',
      description: 'Kunci jawaban no 15 salah',
      userEmail: 'user@test.com',
    });

    expect(link.startsWith('mailto:halo.lolosin.support@gmail.com?')).toBe(true);
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('Soal & Pembahasan');
    expect(decoded).toContain('Kunci jawaban no 15 salah');
  });
});

describe('POST /api/support/report', () => {
  it('rejects request with missing description', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/report', {
      method: 'POST',
      body: JSON.stringify({ category: 'Bug Teknis' }),
    });
    const res = await supportReportRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('accepts valid report and returns success', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/report', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Bug Teknis',
        description: 'Tampilan soal figural tidak muat di layar',
        userEmail: 'pelamar@example.com',
        pageUrl: 'http://localhost:3000/simulasi/tryout-figural-khusus',
      }),
    });
    const res = await supportReportRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

