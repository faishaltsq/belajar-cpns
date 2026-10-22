import Link from 'next/link';
import { FLASHCARD_DATA } from '@/data/flashcards';

/**
 * Blok konten server-rendered untuk halaman flashcard. Runner-nya berjalan
 * penuh di client (deck di-shuffle dari localStorage), jadi HTML awalnya hanya
 * berisi teks "Memuat kartu..." tanpa <h1> — halaman itu lalu terbaca sebagai
 * halaman kosong oleh crawler. Komponen ini memberi teks materi nyata di HTML
 * pertama, mengikuti pola yang sama dengan DrillTopicContent/TryoutContent.
 */

const CATEGORY_ORDER = ['TWK', 'TIU', 'TKP'] as const;

const CATEGORY_TITLE: Record<(typeof CATEGORY_ORDER)[number], string> = {
  TWK: 'TWK — Hafalan Pasal, Pilar Negara, dan Sejarah',
  TIU: 'TIU — Rumus Cepat Hitung dan Logika Verbal',
  TKP: 'TKP — Kata Kunci Perilaku dan Skor 5',
};

/** Delapan kartu contoh, diambil merata dari tiga kategori. */
function sampleCards() {
  const perCategory = Math.max(1, Math.floor(8 / CATEGORY_ORDER.length));
  return CATEGORY_ORDER.flatMap((cat) =>
    FLASHCARD_DATA.filter((c) => c.category === cat).slice(0, perCategory)
  );
}

export default function FlashcardOverview() {
  const total = FLASHCARD_DATA.length;
  const samples = sampleCards();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-[var(--foreground)]">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        Flashcard Hafalan CPNS 2027: Ringkasan Materi TWK, TIU, dan TKP
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        Ada {total} kartu hafalan yang dipakai modul ini, dibagi ke tiga kategori SKD. Setiap
        kartu memuat satu butir materi yang harus keluar dari ingatan tanpa berpikir — pasal
        UUD 1945, konversi pecahan ke persen, atau kata kunci perilaku TKP. Sisi depan kartu
        berisi pemicu, sisi belakang berisi jawaban yang harus kamu hafal persis.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Kenapa memakai kartu, bukan membaca ulang</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-2.5">
          Membaca ulang modul terasa produktif tetapi meninggalkan ilusi paham: teksnya
          dikenali, bukan diingat. Kartu memaksa otak mengambil jawaban dari memori sebelum
          jawabannya ditampilkan, dan pengambilan itulah yang menguatkan ingatan. Karena itu
          satu sesi kartu 15 menit biasanya lebih terasa berat — dan lebih berdampak — daripada
          satu jam membaca materi yang sama.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          Kartu yang sudah kamu tandai tuntas dikeluarkan dari tumpukan, lalu muncul lagi pada
          putaran berikutnya. Tumpukan diacak ulang setiap hari dengan seed tanggal, jadi urutan
          kartu tidak pernah sama dan kamu tidak menghafal posisi, melainkan isinya.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Sebaran kartu per kategori</h2>
        <dl className="grid gap-3">
          {CATEGORY_ORDER.map((cat) => {
            const cards = FLASHCARD_DATA.filter((c) => c.category === cat);
            const subtopics = Array.from(new Set(cards.map((c) => c.subTopic)));
            return (
              <div key={cat} className="card-modern p-4">
                <dt className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">{CATEGORY_TITLE[cat]}</span>
                  <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                    {cards.length} kartu
                  </span>
                </dt>
                <dd className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {subtopics.join(' · ')}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Contoh isi kartu</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-3">
          Berikut beberapa kartu apa adanya, supaya kamu tahu tingkat detail yang diharapkan
          saat menghafal.
        </p>
        <ul className="grid gap-2.5">
          {samples.map((card) => (
            <li key={card.id} className="card-modern p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                {card.category} · {card.subTopic}
              </p>
              <p className="text-sm font-semibold">{card.front}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {card.back}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Kapan sebaiknya memakai kartu ini</h2>
        <ul className="space-y-1.5">
          {[
            'Sebelum tidur, untuk materi hafalan murni seperti pasal, butir Pancasila, dan hierarki peraturan.',
            'Saat menunggu atau di perjalanan, karena satu putaran kartu tidak butuh kertas dan pena.',
            'Sehari sebelum tryout, khusus kategori yang progresnya masih di bawah 70 persen.',
            'Setelah mengerjakan drill, untuk menutup soal yang salah karena lupa materi, bukan karena salah hitung.',
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
        <h2 className="text-sm font-semibold mb-3">Lanjutkan ke modul lain</h2>
        <ul className="flex flex-wrap gap-2">
          {[
            { href: '/drill', label: 'Latihan Kilat per Subtopik' },
            { href: '/simulasi', label: 'Simulasi CAT SKD' },
            { href: '/journey', label: 'Roadmap Belajar 30 Hari' },
            { href: '/psikotes', label: 'Tes Psikotes' },
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
