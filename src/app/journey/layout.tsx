import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roadmap Belajar CPNS 30 Hari: Target Lolos Passing Grade SKD',
  description: 'Kurikulum belajar terstruktur 30 hari persiapan seleksi SKD CPNS 2027: Fase 1 Fondasi TWK, Fase 2 Trik Cepat TIU, Fase 3 TKP & Gladi CAT.',
  keywords: [
    'roadmap belajar cpns',
    'jadwal belajar cpns 30 hari',
    'kurikulum skd cpns',
    'target lolos skd bkn',
  ],
  openGraph: {
    title: 'Roadmap Belajar CPNS 30 Hari — Lolos.in',
    description: 'Panduan Belajar 30 Hari Terarah Menuju Lolos SKD CPNS 2027.',
    url: 'https://lolosin.com/journey',
  },
};

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
