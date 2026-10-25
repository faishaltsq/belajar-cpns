import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Kepribadian PAPI Kostick Online — Profil Kerja ASN',
  description: 'Tes kepribadian PAPI Kostick online: 30 pasang pernyataan untuk memetakan 5 dimensi profil kerja, motivasi, dan karakteristik kepribadian CPNS/ASN.',
  path: '/psikotes/kepribadian',
  keywords: ['tes papi kostick', 'papi kostick online', 'tes kepribadian cpns', 'tes kepribadian asn', 'psikotes kepribadian'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
