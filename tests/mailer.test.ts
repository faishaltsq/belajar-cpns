import { describe, it, expect, vi } from 'vitest';
import { sendOtpEmail } from '@/lib/mailer';

describe('Mailer fallback handling', () => {
  it('returns failure when neither SMTP nor Resend configured', async () => {
    const origUser = process.env.SMTP_USER;
    const origPass = process.env.SMTP_PASS;
    const origResend = process.env.RESEND_API_KEY;

    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;

    const res = await sendOtpEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    process.env.SMTP_USER = origUser;
    process.env.SMTP_PASS = origPass;
    process.env.RESEND_API_KEY = origResend;
  });
});
