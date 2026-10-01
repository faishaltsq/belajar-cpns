import { describe, it, expect, vi, afterEach } from 'vitest';

const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: 'mock-id' }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

import { sendOtpEmail } from '@/lib/mailer';

describe('Mailer', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns failure when neither SMTP nor Resend configured', async () => {
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASS', '');
    vi.stubEnv('RESEND_API_KEY', '');

    const res = await sendOtpEmail({
      to: 'test@example.com',
      subject: 'Test OTP',
      html: '<p>Kode: 123456</p>',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Provider email belum dikonfigurasi');
  });

  it('calls nodemailer transporter.sendMail dengan parameter yang benar', async () => {
    vi.stubEnv('SMTP_USER', 'test@gmail.com');
    vi.stubEnv('SMTP_PASS', 'testpass123');

    const res = await sendOtpEmail({
      to: 'penerima@gmail.com',
      subject: 'Kode OTP Lolos.in',
      html: '<p>Kode OTP Anda: <b>928801</b></p>',
    });

    expect(res.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'penerima@gmail.com',
        subject: 'Kode OTP Lolos.in',
        from: expect.stringContaining('Lolos.in'),
      })
    );
  });
});
