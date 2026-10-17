import Link from 'next/link';
import { DRILL_TOPICS } from '@/lib/drillHelper';
import { DRILL_CONTENT } from '@/data/drillContent';

/**
 * Blok konten server-rendered untuk halaman drill. Halaman drill sendiri
 * berjalan sepenuhnya di client (state ujian), sehingga HTML awalnya kosong.
 * Komponen ini memberi crawler dan pengunjung teks materi yang unik per
 * subtopik, sekaligus tautan internal ke subtopik lain.
 */
export default function DrillTopicContent({
  category,
  subCategory,
}: {
  category: string;
  subCategory: string;
}) {
  const content = DRILL_CONTENT[subCategory];
  if (!content) return null;

  const siblings = DRILL_TOPICS.filter((t) => t.subCategory !== subCategory);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-[var(--foreground)]">
      <nav className="text-xs text-[var(--muted-foreground)] mb-5">
        <Link href="/drill" className="hover:text-[var(--primary)]">
          Latihan Kilat
        </Link>
        <span className="mx-1.5">/</span>
        <span>{category}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        {content.heading}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {content.intro}
      </p>

      {content.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-semibold mb-2">{section.heading}</h2>
          {section.body.map((paragraph, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-2.5"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Tips mengerjakan soal {subCategory}</h2>
        <ul className="space-y-1.5">
          {content.tips.map((tip, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-[var(--muted-foreground)] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--primary)]"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-semibold mb-3">Subtopik latihan lainnya</h2>
        <ul className="flex flex-wrap gap-2">
          {siblings.map((topic) => (
            <li key={`${topic.category}-${topic.subCategory}`}>
              <Link
                href={`/drill/${topic.category}/${encodeURIComponent(topic.subCategory)}`}
                className="inline-block text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition"
              >
                {topic.label} · {topic.category}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
