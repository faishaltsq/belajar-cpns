import Link from 'next/link';
// Catalog data only — loadPackage pulls db.ts into the client bundle.
import { TRYOUT_LIST } from '@/lib/tryoutCatalog';
import { TRYOUT_SEO } from '@/data/tryoutSeo';

/**
 * Konten server-rendered untuk halaman paket tryout. Halaman ujian berjalan
 * penuh di client, jadi tanpa blok ini HTML awal hanya berisi teks loading.
 * Isi diturunkan dari bank soal paket itu sendiri, sehingga setiap halaman
 * benar-benar berbeda.
 */
export default function TryoutContent({ id }: { id: string }) {
  const pkg = TRYOUT_LIST.find((p) => p.id === id);
  const seo = TRYOUT_SEO[id];
  if (!pkg || !seo) return null;

  const others = TRYOUT_LIST.filter((p) => p.id !== id).slice(0, 8);
  const topicList = seo.topics.slice(0, 12);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-[var(--foreground)]">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        {pkg.label} — Simulasi CAT SKD CPNS 2027
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{pkg.desc}</p>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="card-modern p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Butir Soal</dt>
          <dd className="font-bold text-lg">{pkg.questionCount}</dd>
        </div>
        <div className="card-modern p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Durasi</dt>
          <dd className="font-bold text-lg">
            {pkg.durationMin}
            <span className="text-xs font-normal"> menit</span>
          </dd>
        </div>
        <div className="card-modern p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Materi</dt>
          <dd className="font-bold text-lg">
            {seo.breakdown.filter((b) => b.count > 0).map((b) => b.category).join('·')}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Komposisi soal</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          Paket ini terdiri dari{' '}
          {seo.breakdown.map((b, i) => (
            <span key={b.category}>
              {i > 0 ? ', ' : ''}
              {b.count} butir {b.category}
            </span>
          ))}
          . Total {pkg.questionCount} butir dikerjakan dalam {pkg.durationMin} menit, mengikuti
          pembagian waktu acuan CAT BKN.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Materi yang diuji</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-3">
          Subtema yang muncul di paket ini, diurutkan dari yang paling banyak:
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {topicList.map((t) => (
            <li
              key={t}
              className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
            >
              {t}
            </li>
          ))}
          {seo.topics.length > topicList.length && (
            <li className="text-xs px-2.5 py-1 text-[var(--muted-foreground)]">
              +{seo.topics.length - topicList.length} subtema lain
            </li>
          )}
        </ul>
      </section>

      {seo.samples.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Contoh soal dari paket ini</h2>
          <ol className="space-y-2.5">
            {seo.samples.map((s, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed text-[var(--muted-foreground)] pl-5 relative before:content-[counter(list-item)] before:absolute before:left-0 before:text-[var(--primary)] before:font-semibold list-none"
              >
                {s}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-10 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-semibold mb-3">Paket tryout lainnya</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {others.map((p) => (
            <li key={p.id}>
              <Link
                href={`/simulasi/${p.id}`}
                className="card-modern p-3 block text-xs hover:border-[var(--primary)] transition"
              >
                <span className="font-semibold text-[var(--foreground)]">{p.label}</span>
                <span className="text-[var(--muted-foreground)]"> · {p.questionCount} soal</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/simulasi"
          className="inline-block mt-4 text-xs font-semibold text-[var(--primary)]"
        >
          Lihat semua {TRYOUT_LIST.length} paket tryout →
        </Link>
      </section>
    </article>
  );
}
