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

// Base QRIS Saweria resmi untuk faishaltsq (dapat dioverride via env QRIS_BASE_STRING)
export const DEFAULT_BASE_QRIS =
  '00020101021226650013CO.XENDIT.WWW01189360084800000000020215WNtXtb6qmr4ZJBw0303UME51370014ID.CO.QRIS.WWW0215ID20253781998505204509953033605405100715802ID5922PT Harta Tahta Sukaria6013JAKARTA PUSAT61051034062290525jnKoyvoo7dqcUcM86B9hvu6bC6304F1E5';

/**
 * Hitung CRC16-CCITT (polynomial 0x1021, init 0xFFFF) standar Bank Indonesia EMVCo QRIS
 */
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Mengubah QRIS menjadi QRIS Dinamis dengan nominal presisi (Tag 54) dan CRC16 baru
 */
export function makeDynamicQris(baseQris: string, amount: number): string {
  let base = baseQris.trim().replace(/6304[A-Fa-f0-9]{4}$/, '');
  base = base.replace('010211', '010212');

  const amtStr = String(Math.round(amount));
  const tag54 = `54${String(amtStr.length).padStart(2, '0')}${amtStr}`;

  const match54 = base.match(/54(\d{2})/);
  if (match54 && match54.index !== undefined) {
    const lenVal = parseInt(match54[1], 10);
    const startPos = match54.index;
    const endPos = startPos + 4 + lenVal;
    base = base.slice(0, startPos) + tag54 + base.slice(endPos);
  } else {
    const idx58 = base.indexOf('5802ID');
    if (idx58 !== -1) {
      base = base.slice(0, idx58) + tag54 + base.slice(idx58);
    } else {
      base += tag54;
    }
  }

  const toHash = base + '6304';
  const crc = crc16Ccitt(toHash);
  return toHash + crc;
}

// Memory cache for saweria user id
const userIdCache = new Map<string, string>();

/**
 * Mendapatkan Saweria User ID (UUID) dari username Saweria
 */
export async function getSaweriaUserId(targetUsername?: string): Promise<{ userId: string; username: string }> {
  // 1. Cek env langsung atau fallback ke default akun
  const envUserId = process.env.SAWERIA_USER_ID;
  const username = (targetUsername || process.env.SAWERIA_USERNAME || 'faishaltsq').trim();

  if (envUserId && (!targetUsername || targetUsername === process.env.SAWERIA_USERNAME)) {
    return { userId: envUserId, username };
  }

  // Known account mappings untuk menghindari network call
  if (username.toLowerCase() === 'faishaltsq') {
    return { userId: '99b468ce-765a-4e35-8dac-64102353e931', username: 'faishaltsq' };
  }

  // 2. Cek cache
  if (userIdCache.has(username)) {
    return { userId: userIdCache.get(username)!, username };
  }

  // 3. Panggil API resmi backend Saweria untuk ekstrak user ID
  try {
    const res = await fetch(`${SAWERIA_BACKEND}/users/${encodeURIComponent(username)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://saweria.co',
        'Referer': `https://saweria.co/${encodeURIComponent(username)}`,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      throw new Error(`Username Saweria "${username}" tidak ditemukan di saweria.co. Silakan periksa kembali username akun Saweria kamu.`);
    }

    if (!res.ok) {
      throw new Error(`Saweria backend error (${res.status})`);
    }

    const json = await res.json();
    const userId = json?.data?.id;

    if (!userId) {
      throw new Error(`Saweria user ID tidak ditemukan untuk "${username}"`);
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
  let username = params.saweriaUsername || process.env.SAWERIA_USERNAME || 'faishaltsq';

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

  let qrString: string | null = null;
  let txId = `saweria-qris-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  let amountRaw = amount;

  try {
    const res = await fetch(`${SAWERIA_BACKEND}/donations/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://saweria.co',
        'Referer': `https://saweria.co/${encodeURIComponent(username)}`,
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.qr_string) {
        qrString = json.data.qr_string;
        txId = json.data.id || txId;
        amountRaw = json.data.amount_raw || amount;
      }
    } else {
      const errText = await res.text();
      console.error(`[Saweria API Error] status=${res.status}:`, errText);
      throw new Error(`Saweria API returned HTTP ${res.status}: ${errText}`);
    }
  } catch (apiErr: unknown) {
    const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
    console.error('[Saweria API Fetch Catch]:', msg);
    // If backend network call fails, proceed to dynamic QRIS synthesis below
  }

  // Jika backend Saweria dibatasi Cloudflare atau tidak mengembalikan qr_string,
  // buat QRIS Dinamis standar Bank Indonesia secara instan dengan nominal presisi
  if (!qrString) {
    const baseQris = process.env.QRIS_BASE_STRING || DEFAULT_BASE_QRIS;
    qrString = makeDynamicQris(baseQris, amount);
  }

  // Generate data URL QR Code image
  const qrDataUrl = await QRCode.toDataURL(qrString, {
    width: 320,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  return {
    id: txId,
    amount,
    amountRaw,
    qrString,
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://saweria.co',
        'Referer': 'https://saweria.co/',
        'Accept': 'application/json, text/plain, */*',
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
