import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { CATALOG_TOTAL, STANDARD_110_TOTAL } from '@/lib/catalogStats';
import { QUESTION_LIMITS, EXAM_YEAR, skdLabel } from '@/lib/examRules';

export const metadata: Metadata = pageMeta({
  title: `Simulasi ${skdLabel()} Online Standar BKN`,
  description: `Simulasi CAT ${skdLabel()} standar acuan BKN. ${CATALOG_TOTAL} paket tryout TWK, TIU, TKP ${QUESTION_LIMITS.TOTAL} butir soal, timer 100 menit, skor otomatis, dan pembahasan soal.`,
  path: '/simulasi',
  keywords: [
    'simulasi cpns',
    'simulasi cat bkn',
    'tryout cpns online',
    `tryout cpns ${EXAM_YEAR}`,
    'soal cat bkn',
    'tryout skd gratis',
    'passing grade cpns',
  ],
});

export default function SimulasiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
