import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/mailer';

export async function GET(req: Request) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const resend = process.env.RESEND_API_KEY;

  const url = new URL(req.url);
  const testTo = url.searchParams.get('to');

  let sendResult = null;
  if (testTo) {
    sendResult = await sendOtpEmail({
      to: testTo,
      subject: 'Test Diagnosa OTP Lolos.in',
      html: '<p>Ini email tes untuk memastikan SMTP berfungsi.</p>',
    });
  }

  return NextResponse.json({
    hasSmtpUser: Boolean(user),
    smtpUserMasked: user ? `${user.slice(0, 4)}***@${user.split('@')[1]}` : null,
    hasSmtpPass: Boolean(pass),
    smtpPassLength: pass ? pass.length : 0,
    hasResend: Boolean(resend),
    sendResult,
  });
}
