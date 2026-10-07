import QRCode from 'qrcode';

export interface CreateTransactionParams {
  orderId: string;
  amount: number;
  keterangan?: string;
  callbackUrl?: string;
  apiKey?: string;
  merchantId?: string;
  env?: 'sandbox' | 'production';
}

export interface KlikQrisTransactionResult {
  success: boolean;
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  status: string;
  qrisUrl?: string;
  qrisImage?: string;
  expiredAt?: string;
  signature?: string;
  error?: string;
}

export function getKlikQrisBaseUrl(env?: string): string {
  const isProd = (env || process.env.KLIKQRIS_ENV) === 'production';
  return isProd ? 'https://klikqris.com/api' : 'https://klikqris.com/api/sandbox';
}

export async function createKlikQrisTransaction(
  params: CreateTransactionParams
): Promise<KlikQrisTransactionResult> {
  const apiKey = params.apiKey || process.env.KLIKQRIS_API_KEY;
  const merchantId = params.merchantId || process.env.KLIKQRIS_MERCHANT_ID;
  const env = params.env || (process.env.KLIKQRIS_ENV === 'production' ? 'production' : 'sandbox');
  const baseUrl = getKlikQrisBaseUrl(env);

  // If no API key configured (e.g. offline dev mode), fallback to mock synthesized QR
  if (!apiKey || !merchantId) {
    const uniqueCode = Math.floor(Math.random() * 900) + 100;
    const totalAmount = params.amount + uniqueCode;
    const mockQrDataUrl = await QRCode.toDataURL(`KLIKQRIS_MOCK_${params.orderId}_${totalAmount}`, {
      width: 280,
      margin: 2,
    });
    return {
      success: true,
      orderId: params.orderId,
      amount: params.amount,
      uniqueCode,
      totalAmount,
      status: 'PENDING',
      qrisUrl: '',
      qrisImage: mockQrDataUrl,
      signature: 'mock_dev_signature',
    };
  }

  try {
    const res = await fetch(`${baseUrl}/qris/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'id_merchant': merchantId,
      },
      body: JSON.stringify({
        order_id: params.orderId,
        id_merchant: merchantId,
        amount: params.amount,
        keterangan: params.keterangan || `Pembayaran ${params.orderId}`,
        ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.status) {
      return {
        success: false,
        orderId: params.orderId,
        amount: params.amount,
        uniqueCode: 0,
        totalAmount: params.amount,
        status: 'FAILED',
        error: json.message || 'Gagal membuat transaksi KlikQRIS',
      };
    }

    const data = json.data || {};
    const totalAmount = Number(data.total_amount || data.amount || params.amount);
    const amount = Number(data.amount || params.amount);
    const uniqueCode = Math.max(0, totalAmount - amount);

    return {
      success: true,
      orderId: data.order_id || params.orderId,
      amount,
      uniqueCode,
      totalAmount,
      status: data.status || 'PENDING',
      qrisUrl: data.qris_url || '',
      qrisImage: data.qris_image || '',
      expiredAt: data.expired_at,
      signature: data.signature,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi ke KlikQRIS gagal';
    return {
      success: false,
      orderId: params.orderId,
      amount: params.amount,
      uniqueCode: 0,
      totalAmount: params.amount,
      status: 'ERROR',
      error: msg,
    };
  }
}

export async function checkKlikQrisStatus(orderId: string): Promise<{
  success: boolean;
  status: 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED';
  paidAt?: string;
  signature?: string;
  error?: string;
}> {
  const apiKey = process.env.KLIKQRIS_API_KEY;
  const merchantId = process.env.KLIKQRIS_MERCHANT_ID;
  const baseUrl = getKlikQrisBaseUrl();

  if (!apiKey || !merchantId) {
    return { success: false, status: 'PENDING', error: 'Credentials not configured' };
  }

  try {
    const res = await fetch(`${baseUrl}/qris/status/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'id_merchant': merchantId,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.status) {
      return { success: false, status: 'PENDING', error: json.message };
    }

    const d = json.data || {};
    const statusMap: Record<string, 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED'> = {
      SUCCESS: 'PAID',
      PAID: 'PAID',
      PENDING: 'PENDING',
      EXPIRED: 'EXPIRED',
    };

    return {
      success: true,
      status: statusMap[String(d.status).toUpperCase()] || 'PENDING',
      paidAt: d.paid_at,
      signature: d.signature,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghubungi server KlikQRIS';
    return { success: false, status: 'PENDING', error: msg };
  }
}
