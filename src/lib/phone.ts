// ponytail: regex-only ID mobile normalizer. Use libphonenumber-js if supporting non-ID numbers.
export function normalizeIndonesianPhone(phone: string): string {
  if (!phone || !phone.trim()) {
    throw new Error('Nomor HP tidak boleh kosong');
  }
  let cleaned = phone.trim().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  if (!cleaned.startsWith('628')) {
    throw new Error('Harus nomor seluler Indonesia (diawali 08 / 628)');
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error('Nomor HP tidak valid (panjang karakter tidak sesuai)');
  }

  return cleaned;
}

export interface ValidationResult {
  isValid: boolean;
  phone?: string;
  error?: string;
}

export function validatePhoneAndPin(phone: string, pin: string): ValidationResult {
  try {
    const normalizedPhone = normalizeIndonesianPhone(phone);
    if (!/^\d{6}$/.test(pin)) {
      return { isValid: false, error: 'PIN harus berupa 6 digit angka (0-9)' };
    }
    return { isValid: true, phone: normalizedPhone };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validasi gagal';
    return {
      isValid: false,
      error: message,
    };
  }
}
