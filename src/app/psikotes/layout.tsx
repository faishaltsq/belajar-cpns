import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tes Psikotes Online CPNS, BUMN & Kedinasan: Kraepelin, Kecermatan, PAPI',
  description: 'Modul latihan tes psikotes online: tes koran Kraepelin (penjumlahan cepat), tes kecermatan angka dan huruf hilang, penalaran analitis, dan tes kepribadian PAPI Kostick.',
  keywords: [
    'psikotes cpns',
    'tes psikotes online',
    'tes kraepelin online',
    'tes koran online',
    'tes kecermatan angka',
    'tes kecermatan huruf',
    'tes kepribadian papi kostick',
    'psikotes bumn kedinasan',
  ],
  openGraph: {
    title: 'Tes Psikotes Online CPNS & Kedinasan — Lolos.in',
    description: 'Latihan Kraepelin, Tes Kecermatan, Penalaran Analitis, dan Kepribadian ASN PAPI Kostick.',
    url: 'https://lolosin.com/psikotes',
  },
};

export default function PsikotesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
