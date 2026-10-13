import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/mailer';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

// TEMPORARY: Debug endpoint - hapus setelah masalah SMTP terselesaikan
export async function POST(req: Request) {
  const authorized = await isAuthorizedAdmin(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'Missing to' }, { status: 400 });

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendKey = process.env.RESEND_API_KEY;

  const envInfo = {
    SMTP_USER: smtpUser ? smtpUser.replace(/(?<=.{3}).(?=.*@)/g, '*') : 'NOT SET',
    SMTP_PASS: smtpPass ? `SET (${smtpPass.length} chars)` : 'NOT SET',
    RESEND_API_KEY: resendKey ? `SET (${resendKey.length} chars)` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  };

  const result = await sendOtpEmail({
    to,
    subject: 'Lolos.in SMTP Debug Test',
    html: '<p>Test email dari debug endpoint. Jika ini masuk, SMTP berfungsi.</p>',
  });

  return NextResponse.json({ envInfo, mailResult: result });
}
