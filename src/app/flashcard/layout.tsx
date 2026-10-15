import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flashcard Hafalan Cepat Materi CPNS 2027: TWK, TIU, TKP',
  description: 'Metode spaced repetition flashcard untuk menghafal pasal UUD 1945, butir Pancasila, trik hitung cepat TIU, dan kata kunci integritas ASN.',
  keywords: [
    'flashcard cpns',
    'hafalan materi cpns',
    'pasal uud 1945 cpns',
    'rumus cepat tiu',
    'hafalan twk cpns',
  ],
  openGraph: {
    title: 'Flashcard Hafalan Cepat Materi CPNS 2027 — Lolos.in',
    description: 'Kartu Memori Cepat · Target Lolos Passing Grade SKD · Gratis.',
    url: 'https://lolosin.com/flashcard',
  },
};

export default function FlashcardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
