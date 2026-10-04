import QRCode from 'qrcode';

const SAWERIA_BACKEND = 'https://backend.saweria.co';
const SAWERIA_FRONTEND = 'https://saweria.co';

export interface CreateQrisParams {
  userId?: string;
  saweriaUsername?: string;
  amount: number;
  message: string;
  donorName: string;
  donorEmail: string;
}

export interface QrisResult {
  id: string;
  amount: number;
  amountRaw: number;
  qrString: string;
  qrDataUrl: string;
  username: string;
}

// Memory cache for saweria user id
const userIdCache = new Map<string, string>();

/**
 * Mendapatkan Saweria User ID (UUID) dari username Saweria
 */
export async function getSaweriaUserId(targetUsername?: string): Promise<{ userId: string; username: string }> {
  // 1. Cek env langsung
  const envUserId = process.env.SAWERIA_USER_ID;
  const username = (targetUsername || process.env.SAWERIA_USERNAME || 'sandhikagalih').trim();

  if (envUserId && (!targetUsername || targetUsername === process.env.SAWERIA_USERNAME)) {
    return { userId: envUserId, username };
  }

  // 2. Cek cache
  if (userIdCache.has(username)) {
    return { userId: userIdCache.get(username)!, username };
  }

  // 3. Fetch profil saweria untuk ekstrak user ID
  try {
    const res = await fetch(`${SAWERIA_FRONTEND}/${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Saweria user "${username}" not found (${res.status})`);
    }

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
    if (!match) {
      throw new Error('Saweria page format unexpected');
    }

    const data = JSON.parse(match[1]);
    const userId = data?.props?.pageProps?.data?.id;

    if (!userId) {
      throw new Error(`Saweria user ID not found for "${username}"`);
    }

    userIdCache.set(username, userId);
    return { userId, username };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Gagal menghubungkan ke Saweria: ${msg}`);
  }
}

/**
 * Generate QRIS langsung via backend Saweria
 */
export async function createSaweriaQris(params: CreateQrisParams): Promise<QrisResult> {
  const { amount, message, donorName, donorEmail } = params;

  let userId = params.userId;
  let username = params.saweriaUsername || process.env.SAWERIA_USERNAME || 'sandhikagalih';

  if (!userId) {
    const info = await getSaweriaUserId(username);
    userId = info.userId;
    username = info.username;
  }

  const payload = {
    agree: true,
    notUnderage: true,
    message: message || 'Lolos.in CPNS Tryout',
    amount: Math.max(1000, Math.round(amount)),
    payment_type: 'qris',
    vote: '',
    currency: 'IDR',
    customer_info: {
      first_name: donorName || 'Sobat Lolos.in',
      email: donorEmail || 'user@lolos.in',
      phone: '',
    },
  };

  const res = await fetch(`${SAWERIA_BACKEND}/donations/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Saweria API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const d = json.data;

  if (!d || !d.qr_string) {
    throw new Error('Saweria did not return QR string');
  }

  // Generate data URL QR Code image
  const qrDataUrl = await QRCode.toDataURL(d.qr_string, {
    width: 320,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  return {
    id: d.id,
    amount: d.amount || amount,
    amountRaw: d.amount_raw || amount,
    qrString: d.qr_string,
    qrDataUrl,
    username,
  };
}

/**
 * Cek status pembayaran transaksi QRIS di Saweria
 */
export async function checkSaweriaQrisStatus(transactionId: string): Promise<{ paid: boolean; raw: unknown }> {
  try {
    const res = await fetch(`${SAWERIA_BACKEND}/donations/qris/${transactionId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { paid: false, raw: null };
    }

    const json = await res.json();
    const data = json.data;

    // Di Saweria: jika transaksi sudah dibayar, qr_string menjadi kosong atau null
    const paid = !data || !data.qr_string || data.qr_string === '';
    return { paid, raw: data };
  } catch {
    return { paid: false, raw: null };
  }
}
