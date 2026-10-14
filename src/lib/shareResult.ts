export interface ShareTextParams {
  tryoutLabel: string;
  totalScore: number;
  twk: number;
  tiu: number;
  tkp: number;
  isPassedAll: boolean;
  siteUrl?: string;
}

export function generateShareText({
  tryoutLabel,
  totalScore,
  twk,
  tiu,
  tkp,
  isPassedAll,
  siteUrl = 'https://belajar-cpns-saas.vercel.app/simulasi',
}: ShareTextParams): string {
  const statusEmoji = isPassedAll ? '🎉' : '💪';
  const statusText = isPassedAll ? 'LOLOS PASSING GRADE' : 'BELUM MEMENUHI PASSING GRADE';

  return (
    `${statusEmoji} Hasil Simulasi CAT SKD CPNS 2027 di Lolos.in!\n\n` +
    `Paket: ${tryoutLabel}\n` +
    `Total Skor: ${totalScore}/550\n` +
    `Rincian: TWK: ${twk} | TIU: ${tiu} | TKP: ${tkp}\n` +
    `Status: ${statusText}\n\n` +
    `Coba simulasi gratis standar BKN sekarang di:\n${siteUrl}`
  );
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
