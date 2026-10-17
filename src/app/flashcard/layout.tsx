import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Flashcard Hafalan Cepat Materi CPNS 2027: TWK, TIU, TKP',
  description: 'Metode spaced repetition flashcard untuk menghafal pasal UUD 1945, butir Pancasila, trik hitung cepat TIU, dan kata kunci integritas ASN.',
  path: '/flashcard',
  keywords: ['flashcard cpns', 'hafalan materi cpns', 'pasal uud 1945 cpns', 'rumus cepat tiu', 'hafalan twk cpns'],
});

export default function FlashcardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
