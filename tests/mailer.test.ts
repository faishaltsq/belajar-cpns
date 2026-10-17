import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: 'mock-id' }));
const mockResendSend = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { id: 'resend-id' }, error: null }));
const mockResendCtor = vi.hoisted(() => vi.fn());

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockResendSend };
    constructor(key: string) {
      mockResendCtor(key);
    }
  },
}));

import { sendOtpEmail } from '@/lib/mailer';

const BASE_ENV = ['SMTP_USER', 'SMTP_PASS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'RESEND_API_KEY', 'MAIL_FROM'];

describe('Mailer', () => {
  beforeEach(() => {
    for (const k of BASE_ENV) vi.stubEnv(k, '');
    mockResendSend.mockResolvedValue({ data: { id: 'resend-id' }, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns failure when neither Resend nor SMTP is configured', async () => {
    const res = await sendOtpEmail({
      to: 'test@example.com',
      subject: 'Test OTP',
      html: '<p>Kode: 123456</p>',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Provider email belum dikonfigurasi');
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('prefers Resend over SMTP when both are configured', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('SMTP_USER', 'test@gmail.com');
    vi.stubEnv('SMTP_PASS', 'testpass123');

    const res = await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    expect(res.success).toBe(true);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends from MAIL_FROM and sets Reply-To to support', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('MAIL_FROM', 'noreply@lolosin.com');

    await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    const arg = mockResendSend.mock.calls.at(-1)?.[0] as { from?: string; replyTo?: string };
    expect(arg.from).toBe('Lolos.in <noreply@lolosin.com>');
    expect(arg.replyTo).toBe('halo.lolosin.support@gmail.com');
  });

  it('sends a text/plain part alongside the HTML (deliverability)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');

    await sendOtpEmail({
      to: 'penerima@gmail.com',
      subject: 'Kode Verifikasi Lolos.in: 654321',
      html: `<div><p>Halo <strong>Peserta</strong>,</p>
             <a href="https://lolosin.com/api/auth/verify-link?email=a%40b.com&amp;otp=123456">Verifikasi</a>
             <p>Kode manual:</p><div>654321</div></div>`,
    });

    const arg = mockResendSend.mock.calls.at(-1)?.[0] as { text?: string; html?: string };
    expect(typeof arg.text).toBe('string');
    expect(arg.text).not.toBe('');
    expect(arg.html).toBeTruthy();
    // The OTP must survive the conversion or the user cannot read their code.
    expect(arg.text).toContain('654321');
    // And the verify link must survive it too, or text-only clients are stuck.
    expect(arg.text).toContain('https://lolosin.com/api/auth/verify-link');
  });

  it('refuses to send from the @resend.dev sandbox (it cannot reach real users)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('MAIL_FROM', 'onboarding@resend.dev');

    const res = await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    expect(res.success).toBe(false);
    expect(res.error).toContain('resend.dev');
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('surfaces the Resend error and does not claim success', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    mockResendSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'domain is not verified', statusCode: 403 },
    });

    const res = await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    expect(res.success).toBe(false);
    expect(res.error).toContain('domain is not verified');
  });

  it('falls back to SMTP when Resend fails and SMTP is configured', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('SMTP_USER', 'test@gmail.com');
    vi.stubEnv('SMTP_PASS', 'testpass123');
    mockResendSend.mockResolvedValue({ data: null, error: { name: 'rate_limit', message: 'too many', statusCode: 429 } });

    const res = await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    expect(res.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to SMTP when Resend fails and SMTP is absent', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    mockResendSend.mockResolvedValue({ data: null, error: { name: 'rate_limit', message: 'too many', statusCode: 429 } });

    const res = await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    expect(res.success).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('uses the authenticated Gmail address when only Gmail SMTP is configured', async () => {
    vi.stubEnv('SMTP_USER', 'test@gmail.com');
    vi.stubEnv('SMTP_PASS', 'testpass123');
    vi.stubEnv('MAIL_FROM', 'noreply@lolosin.com');

    await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    const arg = mockSendMail.mock.calls.at(-1)?.[0] as { from?: string };
    // Gmail rejects a spoofed sender; the authenticated address wins.
    expect(arg.from).toContain('test@gmail.com');
    expect(arg.from).not.toContain('noreply@lolosin.com');
  });

  it('honours MAIL_FROM when an SMTP relay is configured', async () => {
    vi.stubEnv('SMTP_USER', 'relay-login');
    vi.stubEnv('SMTP_PASS', 'relay-pass');
    vi.stubEnv('SMTP_HOST', 'smtp-relay.brevo.com');
    vi.stubEnv('MAIL_FROM', 'noreply@lolosin.com');

    await sendOtpEmail({ to: 'x@example.com', subject: 'Kode OTP', html: '<p>123</p>' });

    const arg = mockSendMail.mock.calls.at(-1)?.[0] as { from?: string };
    expect(arg.from).toContain('noreply@lolosin.com');
  });

  it('forwards attachments to Resend with an inline contentId', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');

    await sendOtpEmail({
      to: 'x@example.com',
      subject: 'Kode OTP',
      html: '<p>123</p>',
      attachments: [
        { filename: 'shot.png', content: Buffer.from('abc').toString('base64'), encoding: 'base64', contentType: 'image/png', cid: 'screenshot@lolosin' },
      ],
    });

    const arg = mockResendSend.mock.calls.at(-1)?.[0] as {
      attachments?: Array<{ filename?: string; contentId?: string; contentType?: string }>;
    };
    expect(arg.attachments).toHaveLength(1);
    expect(arg.attachments?.[0]?.filename).toBe('shot.png');
    expect(arg.attachments?.[0]?.contentId).toBe('screenshot@lolosin');
    expect(arg.attachments?.[0]?.contentType).toBe('image/png');
  });

  it('adds List-Unsubscribe only to reminder mail, never to OTPs', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');

    await sendOtpEmail({ to: 'x@example.com', subject: 'Kode Verifikasi Lolos.in: 111111', html: '<p>1</p>' });
    const otp = mockResendSend.mock.calls.at(-1)?.[0] as { headers?: Record<string, string> };
    expect(otp.headers?.['List-Unsubscribe']).toBeUndefined();

    await sendOtpEmail({ to: 'x@example.com', subject: 'Reminder: selesaikan pembayaranmu', html: '<p>2</p>' });
    const reminder = mockResendSend.mock.calls.at(-1)?.[0] as { headers?: Record<string, string> };
    expect(reminder.headers?.['List-Unsubscribe']).toContain('halo.lolosin.support@gmail.com');
  });
});
