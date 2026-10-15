import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Latihan Kilat Soal CPNS 2027 per Subtopik TWK, TIU, TKP',
  description: 'Drill latihan soal CPNS 2027 fokus 18 subtopik materi SKD: Analogi, Silogisme, Analitis, Deret Angka, Figural, Pancasila, UUD 1945, dan Pelayanan Publik.',
  keywords: [
    'latihan soal cpns',
    'drill soal cpns',
    'soal silogisme cpns',
    'soal analogi verbal',
    'deret angka cpns',
    'soal figural cpns',
    'soal twk tiu tkp',
  ],
  openGraph: {
    title: 'Latihan Kilat Soal CPNS 2027 per Subtopik — Lolos.in',
    description: '18 Subtopik SKD Lengkap · Feedback Jawaban Instan · Pembahasan Lengkap.',
    url: 'https://lolosin.com/drill',
  },
};

export default function DrillLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
