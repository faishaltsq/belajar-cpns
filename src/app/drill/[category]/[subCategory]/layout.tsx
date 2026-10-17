import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { DRILL_TOPICS } from '@/lib/drillHelper';

export function generateMetadata({
  params,
}: {
  params: { category: string; subCategory: string };
}): Metadata {
  const raw = params.subCategory;
  const candidates = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) candidates.push(decoded);
  } catch {
    // malformed escape — match raw only
  }

  const topic = DRILL_TOPICS.find(
    (t) =>
      t.category.toLowerCase() === params.category.toLowerCase() &&
      candidates.some((c) => t.subCategory.toLowerCase() === c.toLowerCase())
  );

  if (!topic) {
    return {
      title: 'Subtopik Tidak Ditemukan',
      robots: { index: false, follow: true },
    };
  }

  const path = `/drill/${topic.category}/${encodeURIComponent(topic.subCategory)}`;

  return pageMeta({
    title: `Latihan Soal ${topic.label} CPNS 2027 — ${topic.category} + Pembahasan`,
    description: `Latihan soal ${topic.label} (${topic.category}) untuk SKD CPNS 2027: pembahasan instan per butir, penjelasan kunci jawaban, dan progres jawaban tersimpan. Gratis tanpa login.`,
    path,
    keywords: [
      `soal ${topic.label.toLowerCase()} cpns`,
      `latihan ${topic.label.toLowerCase()}`,
      `soal ${topic.category.toLowerCase()} cpns 2027`,
      'latihan soal cpns',
    ],
  });
}

export default function DrillTopicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
