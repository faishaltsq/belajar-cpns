import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Psikotes Online CPNS, BUMN & Kedinasan: Kraepelin, Kecermatan, PAPI',
  description: 'Modul latihan tes psikotes online: tes koran Kraepelin (penjumlahan cepat), tes kecermatan angka dan huruf hilang, penalaran analitis, dan tes kepribadian PAPI Kostick.',
  path: '/psikotes',
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
});

export default function PsikotesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
