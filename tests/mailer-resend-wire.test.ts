import { describe, it, expect, afterAll } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import { Resend } from 'resend';

/**
 * Drives the real Resend SDK against a local HTTP server.
 *
 * `tests/mailer.test.ts` mocks the SDK class, so it cannot prove that the
 * payload we build is actually accepted by the SDK's request encoder (field
 * names, attachment shape, headers). This file pins the wire contract.
 */

let server: http.Server | undefined;
const captured: Array<{ url: string; auth: string; body: string }> = [];

afterAll(() => {
  server?.close();
});

async function startServer(): Promise<string> {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      captured.push({ url: req.url ?? '', auth: String(req.headers.authorization ?? ''), body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'wire-id' }));
    });
  });

  const port = await new Promise<number>((resolve) => {
    server?.listen(0, '127.0.0.1', () => {
      resolve((server?.address() as AddressInfo).port);
    });
  });
  return `http://127.0.0.1:${port}`;
}

describe('Resend wire contract', () => {
  it('encodes from, text, reply_to, headers and inline attachments', async () => {
    const base = await startServer();
    const resend = new Resend('re_wire_key', { baseUrl: base });

    await resend.emails.send({
      from: 'Lolos.in <noreply@lolosin.com>',
      to: 'peserta@example.com',
      subject: 'Kode Verifikasi Lolos.in: 654321',
      html: '<p>654321</p>',
      text: 'Kode: 654321',
      replyTo: 'halo.lolosin.support@gmail.com',
      headers: { 'List-Unsubscribe': '<mailto:halo.lolosin.support@gmail.com?subject=unsubscribe>' },
      attachments: [
        {
          filename: 'shot.png',
          content: Buffer.from('abc'),
          contentType: 'image/png',
          contentId: 'screenshot@lolosin',
        },
      ],
    });

    const req = captured.at(-1);
    expect(req).toBeDefined();
    expect(req?.url).toBe('/emails');
    expect(req?.auth).toBe('Bearer re_wire_key');

    const body = JSON.parse(req?.body ?? '{}') as Record<string, unknown>;
    expect(body.from).toBe('Lolos.in <noreply@lolosin.com>');
    expect(body.to).toBe('peserta@example.com');
    expect(body.text).toBe('Kode: 654321');
    // The SDK must map camelCase replyTo/contentId onto the API's snake_case.
    expect(body.reply_to).toBe('halo.lolosin.support@gmail.com');
    expect(body.headers).toMatchObject({
      'List-Unsubscribe': '<mailto:halo.lolosin.support@gmail.com?subject=unsubscribe>',
    });

    const atts = body.attachments as Array<Record<string, unknown>>;
    expect(atts).toHaveLength(1);
    expect(atts[0]?.filename).toBe('shot.png');
    expect(atts[0]?.content_type).toBe('image/png');
    expect(atts[0]?.content_id).toBe('screenshot@lolosin');
  });
});
