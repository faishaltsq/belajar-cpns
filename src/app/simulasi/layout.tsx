import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Simulasi CAT SKD CPNS 2027 Online Standar BKN',
  description: 'Simulasi CAT SKD CPNS 2027 standar resmi BKN. 37 paket tryout TWK, TIU, TKP 110 butir soal, timer 100 menit, skor otomatis, dan pembahasan soal.',
  path: '/simulasi',
  keywords: [
    'simulasi cpns',
    'simulasi cat bkn',
    'tryout cpns online',
    'tryout cpns 2027',
    'soal cat bkn',
    'tryout skd gratis',
    'passing grade cpns',
  ],
});

export default function SimulasiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
