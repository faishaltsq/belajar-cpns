import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Tes Kraepelin / Koran Online Gratis — Latihan Kecepatan Hitung',
  description: 'Tes Kraepelin (tes koran) online gratis: penjumlahan angka cepat berurutan dari atas ke bawah untuk mengukur kecepatan, ketelitian, dan ketahanan kerja.',
  path: '/psikotes/kraepelin',
  keywords: ['tes kraepelin', 'tes koran online', 'tes kraepelin online gratis', 'tes pauli', 'psikotes kecepatan hitung'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
