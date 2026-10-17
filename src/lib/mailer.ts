import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { SUPPORT_EMAIL } from '@/lib/support';

interface MailAttachment {
  filename: string;
  content: string; // base64
  encoding: 'base64';
  contentType: string;
  cid?: string; // for inline embed
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Strongly recommended: HTML-only mail is a spam signal. */
  text?: string;
  attachments?: MailAttachment[];
}

/**
 * Address every transactional email is sent from.
 *
 * With Resend this MUST be on a domain verified in the Resend dashboard —
 * otherwise the API rejects the send with a 403. `@resend.dev` is the shared
 * sandbox and only delivers to the account owner's own address.
 *
 * Resolved per call, not at module load, so tests and long-lived processes
 * observe env changes.
 */
function resolveFrom(): string {
  return process.env.MAIL_FROM || 'noreply@lolosin.com';
}

/**
 * Strip tags to build a text/plain part when the caller did not supply one.
 * Not a general HTML parser — just enough to keep a text part in the MIME tree.
 * Anchor hrefs are appended in parentheses so text-only clients can still
 * follow the verify link.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const clean = label.replace(/<[^>]+>/g, '').trim();
      return clean ? `${clean} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Reminder mail is the only bulk-shaped flow; OTPs must not carry unsubscribe. */
function extraHeaders(subject: string): Record<string, string> | undefined {
  return subject.toLowerCase().includes('reminder')
    ? { 'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>` }
    : undefined;
}

function toResendAttachments(attachments: MailAttachment[] | undefined) {
  return attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, 'base64'),
    contentType: a.contentType,
    // Resend renders `cid:` references from contentId, same as nodemailer's cid.
    contentId: a.cid,
  }));
}

function buildSmtpTransporter(): Transporter | null {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return null;

  const host = process.env.SMTP_HOST;
  return host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      })
    : nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } });
}

export async function sendOtpEmail({ to, subject, html, text, attachments }: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const plain = text || htmlToText(html);
  const from = resolveFrom();
  const headers = extraHeaders(subject);

  // Prioritas 1: Resend. Signs DKIM for our own domain and keeps a clean IP
  // pool — the only configuration that reliably avoids the spam folder.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      if (from.endsWith('@resend.dev')) {
        throw new Error(
          'MAIL_FROM masih memakai sandbox @resend.dev — hanya bisa kirim ke email pemilik akun. Verifikasi domain di dashboard Resend lalu set MAIL_FROM=noreply@lolosin.com.'
        );
      }

      const resend = new Resend(resendKey);
      const res = await resend.emails.send({
        from: `Lolos.in <${from}>`,
        to,
        subject,
        html,
        text: plain,
        replyTo: SUPPORT_EMAIL,
        headers,
        attachments: toResendAttachments(attachments),
      });

      if (res.error) {
        // 403 here almost always means the domain is not verified yet.
        throw new Error(`${res.error.name}: ${res.error.message}`);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[mailer] Gagal via Resend:', msg);
      // Fall through to SMTP only if it is configured — a verified relay is a
      // better fallback than dropping the OTP entirely.
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { success: false, error: msg };
      }
    }
  }

  // Prioritas 2: SMTP relay / Gmail. Kept as a fallback so a Resend outage or
  // an unverified domain does not take registration down.
  const transporter = buildSmtpTransporter();
  if (transporter) {
    try {
      // A relay accepts any From on a domain it signs for; Gmail rejects
      // spoofed senders and forces the authenticated address.
      const smtpFrom = process.env.SMTP_HOST ? from : process.env.SMTP_USER;
      await transporter.sendMail({
        from: `"Lolos.in" <${smtpFrom}>`,
        to,
        subject,
        text: plain,
        html,
        replyTo: `"Lolos.in Support" <${SUPPORT_EMAIL}>`,
        headers,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.contentType,
          cid: a.cid,
        })),
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[mailer] Gagal via SMTP:', msg);
      return { success: false, error: msg };
    }
  }

  console.warn('[mailer] Tidak ada provider email yang terkonfigurasi.');
  return { success: false, error: 'Provider email belum dikonfigurasi' };
}
