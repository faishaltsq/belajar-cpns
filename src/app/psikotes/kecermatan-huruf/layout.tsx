import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Kecermatan Huruf Hilang Online — Latihan Ketelitian',
  description: 'Tes kecermatan huruf hilang online: cocokkan huruf yang hilang dari tabel referensi. Latih akurasi persepsi visual dan konsentrasi untuk psikotes.',
  path: '/psikotes/kecermatan-huruf',
  keywords: ['tes kecermatan huruf', 'tes huruf hilang', 'tes kecermatan online', 'psikotes ketelitian huruf', 'tes konsentrasi'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
