export function isOrderEligibleForReminder(
  createdAt: Date,
  status: string,
  lastRemindedAt?: Date | null,
  referenceNow: Date = new Date()
): boolean {
  if (status.toLowerCase() !== 'pending') return false;
  if (lastRemindedAt) return false;

  const ageMs = referenceNow.getTime() - createdAt.getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  return ageMs >= ONE_HOUR_MS && ageMs <= TWENTY_FOUR_HOURS_MS;
}

export function buildAbandonedReminderEmail(
  orderId: number,
  exactAmount: number,
  packageLabel: string,
  appUrl: string = 'https://belajar-cpns-saas.vercel.app/simulasi'
): { subject: string; html: string } {
  const formattedAmount = exactAmount.toLocaleString('id-ID');
  const subject = `[Lolos.in] Selesaikan Akses ${packageLabel} Anda`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1c1917; line-height: 1.6;">
      <h2 style="color: #c96442; margin-top: 0;">Halo Pejuang NIP,</h2>
      <p>Kami melihat Anda sempat memulai pemesanan untuk paket <strong>${packageLabel}</strong> (Pesanan #${orderId}), namun pembayarannya belum sempat terselesaikan.</p>
      
      <div style="background: #faf9f5; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 13px; color: #78716c;">Total Tagihan Persis (termasuk kode unik):</div>
        <div style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 4px 0 8px 0;">Rp ${formattedAmount}</div>
        <div style="font-size: 12px; color: #a8a29e;">Nominal wajib persis agar verifikasi QRIS otomatis aktif seketika.</div>
      </div>

      <p>Jika Anda masih ingin melanjutkan persiapan ujian CAT SKD CPNS 2027 bersama 34 paket standar BKN dan soal figural lengkap, Anda dapat menyelesaikan pembayaran melalui menu simulasi:</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" style="background: #c96442; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Lanjutkan Pembayaran di Lolos.in</a>
      </div>

      <p style="font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 16px;">
        Abaikan email ini jika Anda sudah menyelesaikan pesanan lain atau tidak berniat melanjutkan. Butuh bantuan? Balas email ini atau hubungi layanan bantuan kami.
      </p>
    </div>
  `;

  return { subject, html };
}
