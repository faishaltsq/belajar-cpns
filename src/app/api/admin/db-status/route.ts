import { NextResponse } from 'next/server';
import { isDbConnected } from '@/lib/db';

export async function GET() {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  // ponytail: no auth check here — endpoint returns boolean only, no sensitive data

  const connected = await isDbConnected();
  const hasEnv = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

  return NextResponse.json({
    connected,
    hasEnv,
    message: !hasEnv
      ? 'DATABASE_URL not set — connect Neon via Vercel Storage'
      : connected
      ? 'Database connected'
      : 'DATABASE_URL set but connection failed',
  });
}
