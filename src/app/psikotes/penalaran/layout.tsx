import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Penalaran Analitis Online — Latihan Logika Psikotes',
  description: 'Tes penalaran analitis online: latih kemampuan menganalisis informasi, menarik kesimpulan logis, dan memecahkan soal cerita bergaya psikotes.',
  path: '/psikotes/penalaran',
  keywords: ['tes penalaran analitis', 'tes penalaran logika', 'psikotes penalaran', 'soal penalaran cpns', 'latihan logika'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
