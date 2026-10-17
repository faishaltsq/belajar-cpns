import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Kecermatan Angka Hilang Online — Latihan Ketelitian',
  description: 'Tes kecermatan angka hilang online: cocokkan angka yang hilang dari tabel referensi 5 kolom. Latih kecepatan persepsi, konsentrasi, dan ketelitian.',
  path: '/psikotes/kecermatan-angka',
  keywords: ['tes kecermatan angka', 'tes angka hilang', 'tes kecermatan online', 'psikotes ketelitian', 'tes konsentrasi cpns'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
