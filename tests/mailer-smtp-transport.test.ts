import { describe, it, expect, afterAll } from 'vitest';
import net from 'net';
import { sendOtpEmail } from '@/lib/mailer';

/**
 * Drives the real mailer over a real SMTP socket.
 *
 * `tests/mailer.test.ts` mocks `nodemailer.createTransport`, so it can never
 * exercise the `SMTP_HOST` relay branch or prove that nodemailer actually
 * assembles a valid multipart/alternative message. This file covers both.
 */

const SAVED_ENV = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM,
};

afterAll(() => {
  // Never leak a fake SMTP config into sibling test files sharing this worker.
  for (const [k, v] of Object.entries(SAVED_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

interface Catcher {
  port: number;
  received: () => string;
  close: () => void;
}

/** Minimal SMTP server that accepts one message and records the DATA payload. */
async function startCatcher(): Promise<Catcher> {
  let captured = '';
  const server = net.createServer((sock) => {
    sock.write('220 smoke ESMTP\r\n');
    let inData = false;
    let buf = '';
    sock.on('data', (chunk) => {
      buf += chunk.toString();
      let idx: number;
      while ((idx = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            sock.write('250 OK\r\n');
          } else {
            captured += `${line}\n`;
          }
          continue;
        }
        const c = line.toUpperCase();
        if (c.startsWith('EHLO') || c.startsWith('HELO')) sock.write('250-smoke\r\n250-AUTH LOGIN PLAIN\r\n250 OK\r\n');
        else if (c.startsWith('AUTH')) sock.write('235 ok\r\n');
        else if (c.startsWith('MAIL') || c.startsWith('RCPT')) sock.write('250 OK\r\n');
        else if (c.startsWith('DATA')) {
          inData = true;
          sock.write('354 go\r\n');
        } else if (c.startsWith('QUIT')) {
          sock.write('221 bye\r\n');
          sock.end();
        } else sock.write('250 OK\r\n');
      }
    });
  });

  const port = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });

  return { port, received: () => captured, close: () => server.close() };
}

describe('SMTP relay transport', () => {
  it('sends a multipart message with text, html, Reply-To and own-domain From', async () => {
    const catcher = await startCatcher();

    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(catcher.port);
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'noreply@lolosin.com';
    process.env.SMTP_PASS = 'x';
    process.env.MAIL_FROM = 'noreply@lolosin.com';

    const res = await sendOtpEmail({
      to: 'peserta@example.com',
      subject: 'Kode Verifikasi Lolos.in: 654321',
      html: `<div><p>Halo <strong>Peserta</strong>,</p>
        <a href="https://lolosin.com/api/auth/verify-link?email=a%40b.com&amp;otp=123456">Verifikasi &amp; Masuk</a>
        <p>Kode manual:</p><div>654321</div></div>`,
    });

    await new Promise((r) => setTimeout(r, 300));
    const wire = catcher.received();
    catcher.close();

    expect(res.success).toBe(true);
    // A custom SMTP_HOST must select the relay path, not the Gmail service path.
    expect(/Content-Type: multipart\/alternative/i.test(wire)).toBe(true);
    expect(/Content-Type: text\/plain/i.test(wire)).toBe(true);
    expect(/Content-Type: text\/html/i.test(wire)).toBe(true);
    expect(/Reply-To:.*halo\.lolosin\.support@gmail\.com/i.test(wire)).toBe(true);
    expect(/From:.*noreply@lolosin\.com/i.test(wire)).toBe(true);
    // The OTP and the verify link must both survive into the text part.
    expect(wire).toContain('654321');
    expect(wire).toContain('verify-link?email');
  });
});
