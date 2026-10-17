import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { TRYOUT_LIST } from '@/lib/loadPackage';
import { TRYOUT_SEO } from '@/data/tryoutSeo';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const pkg = TRYOUT_LIST.find((p) => p.id === params.id);

  if (!pkg) {
    return {
      title: 'Paket Tryout Tidak Ditemukan',
      robots: { index: false, follow: true },
    };
  }

  const seo = TRYOUT_SEO[pkg.id];
  const topics = seo ? seo.topics.slice(0, 4).join(', ') : 'TWK, TIU, TKP';
  const cats = seo
    ? seo.breakdown
        .filter((b) => b.count > 0)
        .map((b) => `${b.count} ${b.category}`)
        .join(', ')
    : 'TWK, TIU, TKP';

  return pageMeta({
    title: `${pkg.label} — ${pkg.questionCount} Soal CAT SKD CPNS 2027`,
    description: `${pkg.label}: ${cats} (${pkg.questionCount} butir), timer ${pkg.durationMin} menit, skor otomatis. Cakupan materi ${topics}. Gratis tanpa login.`,
    path: `/simulasi/${pkg.id}`,
    keywords: [
      `${pkg.label.toLowerCase()} cpns`,
      `tryout ${pkg.id.replace('tryout-', '')} cpns 2027`,
      'tryout cpns 2027',
      'simulasi cat bkn',
      'soal skd cpns',
    ],
  });
}

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
