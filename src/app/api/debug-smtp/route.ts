import { NextResponse } from 'next/server';

export async function GET() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const resend = process.env.RESEND_API_KEY;

  return NextResponse.json({
    hasSmtpUser: Boolean(user),
    smtpUserMasked: user ? `${user.slice(0, 4)}***@${user.split('@')[1]}` : null,
    hasSmtpPass: Boolean(pass),
    smtpPassLength: pass ? pass.length : 0,
    hasResend: Boolean(resend),
  });
}
