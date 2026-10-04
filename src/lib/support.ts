export const SUPPORT_EMAIL = 'halo.lolosin.support@gmail.com';
export const SUPPORT_WA_PHONE = '62859106831589'; // +62 859-1068-31589

export interface ReportContext {
  category: string;
  description: string;
  userEmail?: string;
  pageUrl?: string;
}

export function generateWhatsAppLink(ctx: ReportContext): string {
  const lines = [
    'Halo Admin Lolos.in, saya ingin melaporkan kendala/bug:',
    '',
    `📌 *Kategori:* ${ctx.category}`,
    `📝 *Deskripsi Kendala:* ${ctx.description}`,
    ctx.userEmail ? `👤 *Akun/Email:* ${ctx.userEmail}` : '',
    ctx.pageUrl ? `🔗 *Halaman:* ${ctx.pageUrl}` : '',
    `⏱️ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    '',
    'Mohon bantuannya, terima kasih!',
  ].filter(Boolean);

  const message = lines.join('\n');
  return `https://wa.me/${SUPPORT_WA_PHONE}?text=${encodeURIComponent(message)}`;
}

export function generateMailtoLink(ctx: ReportContext): string {
  const subject = `[Laporan Masalah Lolos.in] ${ctx.category}`;
  const bodyLines = [
    'Halo Tim Dukungan Lolos.in,',
    '',
    'Saya ingin melaporkan kendala teknis / bug dengan rincian berikut:',
    '',
    `Kategori: ${ctx.category}`,
    `Deskripsi Masalah: ${ctx.description}`,
    ctx.userEmail ? `Akun Pengguna: ${ctx.userEmail}` : '',
    ctx.pageUrl ? `Halaman URL: ${ctx.pageUrl}` : '',
    `Waktu Pelaporan: ${new Date().toISOString()}`,
    '',
    'Terima kasih.',
  ].filter(Boolean);

  const body = bodyLines.join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
