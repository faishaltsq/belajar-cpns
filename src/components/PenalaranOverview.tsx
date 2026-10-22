import Link from 'next/link';
import questionsData from '@/data/psikotes_penalaran.json';
import type { ReasoningQuestion } from '@/lib/types';

/**
 * Blok konten server-rendered untuk halaman tes penalaran. Runner-nya client-only
 * (timer dan state jawaban), jadi HTML awal hanya berisi teks "Memuat modul
 * penalaran..." tanpa <h1>. Komponen ini merender penjelasan tipe soal dan
 * contoh butir nyata dari bank soal, sehingga halaman punya isi yang bisa
 * dibaca crawler dan pengunjung sebelum menekan mulai.
 */

const allQuestions = questionsData as ReasoningQuestion[];

const PACKS = [
  {
    key: 'deret',
    title: 'Deret Angka & Huruf',
    desc: 'Pola bilangan bertingkat, fibonacci, lompat, dan barisan alfabet.',
  },
  {
    key: 'silogisme',
    title: 'Silogisme & Penarikan Kesimpulan',
    desc: 'Modus ponens, modus tollens, dan kesimpulan yang sah dari dua premis.',
  },
  {
    key: 'spasial',
    title: 'Penalaran Spasial & Analitis',
    desc: 'Rotasi bangun, pencerminan, dan penataan urutan berdasarkan petunjuk.',
  },
] as const;

export default function PenalaranOverview() {
  const total = allQuestions.length;
  const samples = PACKS.map((pack) => ({
    pack,
    sample: allQuestions.find((q) => q.category === pack.key),
    count: allQuestions.filter((q) => q.category === pack.key).length,
  }));

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-[var(--foreground)]">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        Tes Penalaran Logika &amp; Spasial: {total} Soal dengan Pembahasan
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        Modul ini berisi {total} butir soal penalaran yang dibagi ke tiga paket. Semua butir
        memakai bentuk pilihan ganda lima opsi seperti tes potensi kognitif pada seleksi
        kedinasan, dan setiap butir punya pembahasan yang muncul setelah jawaban dikumpulkan.
        Tidak ada pendaftaran yang dibutuhkan untuk mencoba paket pertama.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Apa yang sebenarnya diukur</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-2.5">
          Tes penalaran bukan tes hafalan, jadi menambah jam baca tidak banyak menolong. Yang
          diukur adalah kecepatan mengenali pola dan ketahanan mengikuti aturan sampai selesai.
          Karena itu latihannya paling efektif dalam sesi pendek berulang: satu paket, lalu
          baca pembahasan setiap butir yang salah, lalu ulangi paket yang sama beberapa hari
          kemudian.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          Kesalahan yang paling mahal biasanya bukan soal yang tidak bisa dijawab, melainkan
          soal yang dikerjakan terlalu lama. Satu butir deret yang menyita empat menit
          menghabiskan waktu tiga butir lain yang sebenarnya mudah. Biasakan menandai butir
          yang macet, lanjut ke berikutnya, dan kembali hanya kalau waktu masih ada.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Tiga paket latihan</h2>
        <dl className="grid gap-3">
          {samples.map(({ pack, count }) => (
            <div key={pack.key} className="card-modern p-4">
              <dt className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">{pack.title}</span>
                <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                  {count} soal
                </span>
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {pack.desc}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Contoh butir dari bank soal</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-3">
          Satu contoh per paket, diambil langsung dari bank soal yang dipakai modul ini.
        </p>
        <ol className="space-y-3">
          {samples.map(({ pack, sample }) =>
            sample ? (
              <li key={pack.key} className="card-modern p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  {pack.title}
                </p>
                <p className="text-sm font-semibold leading-relaxed">{sample.questionText}</p>
                <ul className="mt-2 grid grid-cols-2 min-[380px]:grid-cols-3 gap-1.5">
                  {sample.options.map((opt) => (
                    <li
                      key={opt.id}
                      className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)]"
                    >
                      {opt.id}. {opt.text}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">Pembahasan: </span>
                  {sample.explanation}
                </p>
              </li>
            ) : null
          )}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Cara mengerjakan supaya hasilnya terbaca</h2>
        <ul className="space-y-1.5">
          {[
            'Kerjakan satu paket penuh dalam satu duduk; hasil yang terpotong tidak menunjukkan daya tahan yang sebenarnya.',
            'Catat waktu per butir secara kasar — butir di atas 90 detik perlu strategi baru, bukan latihan tambahan.',
            'Baca pembahasan hanya untuk butir yang salah atau yang dijawab dengan menebak.',
            'Ulangi paket yang sama setelah tiga sampai empat hari; kenaikan skor di paket baru belum tentu kenaikan kemampuan.',
          ].map((tip, i) => (
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
        <h2 className="text-sm font-semibold mb-3">Modul terkait</h2>
        <ul className="flex flex-wrap gap-2">
          {[
            { href: '/psikotes', label: 'Semua Tes Psikotes' },
            { href: '/psikotes/kraepelin', label: 'Tes Kraepelin' },
            { href: '/drill/TIU/Analitis', label: 'Drill TIU Analitis' },
            { href: '/simulasi', label: 'Simulasi CAT SKD' },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-block text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
