import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Simulasi CAT SKD CPNS 2027 Online Standar BKN',
  description: 'Simulasi CAT SKD CPNS 2027 standar resmi BKN. 37 paket tryout TWK, TIU, TKP 110 butir soal, timer 100 menit, skor otomatis, dan pembahasan soal.',
  keywords: [
    'simulasi cpns',
    'simulasi cat bkn',
    'tryout cpns online',
    'tryout cpns 2027',
    'soal cat bkn',
    'tryout skd gratis',
    'passing grade cpns',
  ],
  openGraph: {
    title: 'Simulasi CAT SKD CPNS 2027 Online Standar BKN — Lolos.in',
    description: '37 Paket Tryout CAT · 110 Butir Soal · Timer 100 Menit · Pembahasan Detail · Gratis.',
    url: 'https://lolosin.com/simulasi',
  },
};

export default function SimulasiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
