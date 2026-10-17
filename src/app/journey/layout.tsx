import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Roadmap Belajar CPNS 30 Hari: Target Lolos Passing Grade SKD',
  description: 'Kurikulum belajar terstruktur 30 hari persiapan seleksi SKD CPNS 2027: Fase 1 Fondasi TWK, Fase 2 Trik Cepat TIU, Fase 3 TKP & Gladi CAT.',
  path: '/journey',
  keywords: ['roadmap belajar cpns', 'jadwal belajar cpns 30 hari', 'kurikulum skd cpns', 'target lolos skd bkn'],
});

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
