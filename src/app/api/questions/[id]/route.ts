import { NextRequest, NextResponse } from 'next/server';
import { loadPackage } from '@/lib/loadPackage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const questions = await loadPackage(params.id);
  
  if (!questions.length) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  return NextResponse.json(
    { questions },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
