import Link from 'next/link';
import type { PsikotesGuideContent } from '@/data/psikotesContent';

/**
 * Blok materi server-rendered untuk halaman tes psikotes individual.
 *
 * Kedua halaman tes berjalan penuh di client (state runner), sehingga tanpa
 * blok ini HTML awal hanya berisi satu kartu pembuka. Komponen ini memberi
 * crawler dan pengunjung teks yang menjelaskan alatnya sendiri, sekaligus
 * menautkan modul lain.
 *
 * FAQ dirender dari array yang sama dengan JSON-LD, jadi teks yang dibaca
 * Google tidak mungkin menyimpang dari teks yang terlihat di halaman.
 */
export default function PsikotesGuide({
  content,
  idPrefix,
}: {
  content: PsikotesGuideContent;
  /** Awalan id agar dua halaman tidak berbagi id anchor. */
  idPrefix: string;
}) {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section
      aria-labelledby={`${idPrefix}-panduan`}
      className="w-full max-w-xl text-[var(--foreground)] border-t border-[var(--border)] pt-8 mt-2"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h2
        id={`${idPrefix}-panduan`}
        className="text-xl sm:text-2xl font-bold tracking-tight leading-tight"
      >
        Panduan sebelum mulai
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {content.lead}
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
          {section.bullets && (
            <ul className="mt-3 space-y-1.5">
              {section.bullets.map((item, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed text-[var(--muted-foreground)] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--primary)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Latihan terkait</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {content.related.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block h-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 transition hover:border-[var(--primary)]"
              >
                <span className="block text-sm font-semibold text-[var(--foreground)]">
                  {link.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {link.note}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Pertanyaan yang sering diajukan</h2>
        <dl className="space-y-3.5">
          {content.faq.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"
            >
              <dt className="text-sm font-semibold text-[var(--foreground)]">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-[var(--muted-foreground)]">
        Materi di halaman ini menjelaskan cara kerja alat latihan di Lolos.in. Alat ini
        bukan instrumen resmi dan tidak menerbitkan nilai ambang batas atau keputusan
        seleksi.
      </p>
    </section>
  );
}
