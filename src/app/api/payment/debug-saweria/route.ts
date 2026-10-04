import { NextResponse } from 'next/server';
import { createSaweriaQris } from '@/lib/saweria';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await createSaweriaQris({
      saweriaUsername: 'faishaltsq',
      amount: 1001,
      message: 'Test Vercel Debug',
      donorName: 'Debugger',
      donorEmail: 'debug@lolos.in',
    });
    return NextResponse.json({
      success: true,
      hasQrString: Boolean(res.qrString),
      isFallback: res.qrString.startsWith('00020101021226650013CO.XENDIT'),
      debugError: res.debugError,
      id: res.id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg });
  }
}
