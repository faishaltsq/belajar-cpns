import { NextResponse } from 'next/server';
import { isDbConnected } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
