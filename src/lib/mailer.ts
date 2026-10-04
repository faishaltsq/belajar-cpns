import nodemailer from 'nodemailer';

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
  attachments?: MailAttachment[];
}

export async function sendOtpEmail({ to, subject, html, attachments }: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Prioritas 1: Gmail SMTP / Custom SMTP (bisa kirim ke siapapun tanpa verifikasi domain)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Lolos.in" <${smtpUser}>`,
        to,
        subject,
        html,
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

  // Prioritas 2: Resend (hanya jika ada key)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const res = await resend.emails.send({
        from: 'Lolos.in <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      if (res.error) throw new Error(res.error.message);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[mailer] Gagal via Resend:', msg);
      return { success: false, error: msg };
    }
  }

  console.warn('[mailer] Tidak ada provider email yang terkonfigurasi.');
  return { success: false, error: 'Provider email belum dikonfigurasi' };
}
