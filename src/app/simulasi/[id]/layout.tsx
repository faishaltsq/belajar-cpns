import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { TRYOUT_LIST } from '@/lib/loadPackage';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const pkg = TRYOUT_LIST.find((p) => p.id === params.id);

  if (!pkg) {
    return {
      title: 'Paket Tryout Tidak Ditemukan',
      robots: { index: false, follow: true },
    };
  }

  return pageMeta({
    title: `${pkg.label} — ${pkg.questionCount} Soal CAT SKD CPNS 2027`,
    description: `${pkg.desc}. ${pkg.questionCount} butir soal TWK, TIU, TKP dengan timer ${pkg.durationMin} menit, skor otomatis, dan pembahasan lengkap. Gratis tanpa login.`,
    path: `/simulasi/${pkg.id}`,
    keywords: [`${pkg.label.toLowerCase()} cpns`, 'tryout cpns 2027', 'simulasi cat bkn', 'soal skd cpns'],
  });
}

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
