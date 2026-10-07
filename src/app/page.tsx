import Link from 'next/link';
import {
  ArrowRight,
  Timer,
  Trophy,
  Brain,
  GridFour,
  CheckCircle,
  Question,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import MiniTryout from '@/components/MiniTryout';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-[var(--foreground)]" style={{ backgroundColor: 'var(--background)' }}>
      {/* Background warm radial gradient */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(201, 100, 66, 0.2) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20">
        {/* HERO SECTION */}
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-[var(--foreground)]">
            Persiapan Lolos SKD CPNS 2026 Lebih Terukur.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] leading-relaxed max-w-2xl mx-auto">
            Simulasi CAT 110 butir dengan sistem skoring otomatis, timer 100 menit, dan modul psikotes Kraepelin serta penalaran analitis.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/simulasi"
              className="btn-primary w-full sm:w-auto text-sm px-6 py-3"
            >
              <span>Mulai Simulasi CAT</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              href="/psikotes"
              className="btn-secondary w-full sm:w-auto text-sm px-6 py-3"
            >
              <Brain size={16} weight="duotone" />
              <span>Tes Psikotes &amp; Kraepelin</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div
            className="mt-12 py-3 px-6 rounded-full inline-flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--muted-foreground)]"
            style={{ boxShadow: '0 0 0 1px var(--border)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[var(--foreground)]">36 Paket</span>
              <span>(3.816 Soal)</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[var(--foreground)]">100 Menit</span>
              <span>Timer CAT</span>
            </div>
          </div>
        </section>

        {/* MODUL GRID */}
        <section className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tiga Modul Ujian Terintegrasi
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Latihan terarah untuk tahapan Seleksi Kompetensi Dasar dan Psikotes SKB.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Simulasi CAT */}
            <div className="card-modern p-6 flex flex-col justify-between">
              <div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--primary)] mb-4"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                >
                  <Timer size={20} weight="duotone" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Simulasi CAT SKD
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Simulasi CAT SKD
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  110 butir soal gabungan TWK, TIU, dan TKP dengan timer sinkron, ragu-ragu, dan perankingan passing grade instan.
                </p>
              </div>
              <Link
                href="/simulasi"
                className="btn-secondary text-xs w-full py-2.5"
              >
                Pilih Paket Tryout &rarr;
              </Link>
            </div>

            {/* Card 2: Kraepelin */}
            <div className="card-modern p-6 flex flex-col justify-between">
              <div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--primary)] mb-4"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                >
                  <GridFour size={20} weight="duotone" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Psikotes Kecepatan
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Tes Koran Kraepelin
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  Penjumlahan angka bertingkat dengan batas waktu per kolom. Mengukur kecepatan kerja, ketelitian, dan stabilitas konsentrasi.
                </p>
              </div>
              <Link
                href="/psikotes/kraepelin"
                className="btn-secondary text-xs w-full py-2.5"
              >
                Mulai Kraepelin &rarr;
              </Link>
            </div>

            {/* Card 3: Penalaran */}
            <div className="card-modern p-6 flex flex-col justify-between">
              <div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--primary)] mb-4"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                >
                  <Brain size={20} weight="duotone" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Psikotes Logika
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Penalaran &amp; Spasial
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  Uji kemampuan berpikir analitis, silogisme, pola deret angka berjenjang, dan rotasi visual spasial secara terukur.
                </p>
              </div>
              <Link
                href="/psikotes/penalaran"
                className="btn-secondary text-xs w-full py-2.5"
              >
                Mulai Penalaran &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* FITUR AKSELERASI BELAJAR */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Akselerasi Belajar Cerdas
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Tiga fitur personal untuk belajar lebih terarah, efisien, dan tidak membuang waktu.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Journey */}
            <div className="card-modern p-6 flex flex-col justify-between" style={{ borderTop: '3px solid #c96442' }}>
              <div>
                <div className="text-3xl mb-3">🗺️</div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  30 Hari Terstruktur
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Roadmap Belajar Harian
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  Kurikulum 30 hari terstruktur: TWK → TIU → TKP → Simulasi Penuh. Cukup 15–20 menit sehari, centang hari yang sudah selesai.
                </p>
              </div>
              <Link href="/journey" className="btn-secondary text-xs w-full py-2.5">
                Mulai Roadmap 30 Hari →
              </Link>
            </div>

            {/* Flashcard */}
            <div className="card-modern p-6 flex flex-col justify-between" style={{ borderTop: '3px solid #8b5cf6' }}>
              <div>
                <div className="text-3xl mb-3">🃏</div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Hafalan Cepat
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Flashcard Interaktif
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  38 kartu hafalan kunci: Pasal UUD 1945, pecahan istimewa, silogisme, dan formula skor 5 TKP. Flip kartu, tandai yang sudah hafal.
                </p>
              </div>
              <Link href="/flashcard" className="btn-secondary text-xs w-full py-2.5">
                Buka Flashcard →
              </Link>
            </div>

            {/* Ulang Soal Salah */}
            <div className="card-modern p-6 flex flex-col justify-between" style={{ borderTop: '3px solid #f59e0b' }}>
              <div>
                <div className="text-3xl mb-3">⚡</div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Drill Adaptif
                </span>
                <h3 className="font-semibold text-lg text-[var(--foreground)] mt-1 mb-2">
                  Ulang Soal Salah
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-6">
                  Sistem otomatis mengumpulkan soal yang pernah kamu jawab salah dari semua tryout, lalu menyajikannya sebagai sesi drill khusus.
                </p>
              </div>
              <Link href="/drill/ulang-salah" className="btn-secondary text-xs w-full py-2.5">
                Latih Soal Salah →
              </Link>
            </div>
          </div>
        </section>

        {/* INTERACTIVE MINI TRYOUT */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Sampel Soal Gratis
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Uji Cepat Kemampuan Anda
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Jawab langsung soal simulasi di bawah untuk melihat feedback instan:
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <MiniTryout />
          </div>
        </section>

        {/* PASSING GRADE TABLE */}
        <section className="mt-20">
          <div className="card-modern p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Nilai Ambang Batas SKD CPNS 2026
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Keputusan Menteri PANRB No. 321 Tahun 2024 untuk Formasi Umum
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full badge-neutral text-xs font-semibold">
                Kepmen PANRB 321/2024
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-2.5 font-medium">Subtes</th>
                    <th className="py-2.5 text-center font-medium">Jumlah Soal</th>
                    <th className="py-2.5 text-center font-medium">Bobot Nilai</th>
                    <th className="py-2.5 text-center font-medium">Nilai Maksimal</th>
                    <th className="py-2.5 text-center font-semibold text-[var(--foreground)]">Passing Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  <tr>
                    <td className="py-3 font-medium">
                      <span className="font-semibold text-[var(--foreground)]">TWK</span> — Wawasan Kebangsaan
                    </td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">30</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">Benar 5, Salah 0</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">150</td>
                    <td className="py-3 text-center font-bold text-[var(--foreground)]">65</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">
                      <span className="font-semibold text-[var(--foreground)]">TIU</span> — Inteligensia Umum
                    </td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">35</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">Benar 5, Salah 0</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">175</td>
                    <td className="py-3 text-center font-bold text-[var(--foreground)]">80</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">
                      <span className="font-semibold text-[var(--foreground)]">TKP</span> — Karakteristik Pribadi
                    </td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">45</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">Skala 1 - 5</td>
                    <td className="py-3 text-center text-[var(--muted-foreground)]">225</td>
                    <td className="py-3 text-center font-bold text-[var(--foreground)]">166</td>
                  </tr>
                  <tr className="font-semibold" style={{ background: 'var(--muted)' }}>
                    <td className="py-3 px-2">Total Kumulatif</td>
                    <td className="py-3 text-center">110 Butir</td>
                    <td className="py-3 text-center">-</td>
                    <td className="py-3 text-center">550</td>
                    <td className="py-3 text-center text-[var(--foreground)] font-bold">311</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Hal penting seputar pelaksanaan ujian CAT SKD dan Psikotes CPNS.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {[
              {
                q: 'Berapa passing grade resmi SKD CPNS 2026?',
                a: 'Sesuai Kepmen PANRB 321/2024, nilai ambang batas umum: TWK 65, TIU 80, dan TKP 166. Anda wajib melampaui batas minimal di ketiga kategori secara bersamaan.',
              },
              {
                q: 'Berapa lama durasi pengerjaan ujian?',
                a: 'Total waktu 100 menit untuk 110 butir soal bagi pelamar umum, atau 130 menit untuk pelamar berkebutuhan khusus.',
              },
              {
                q: 'Apakah ada pengurangan nilai (sistem minus) jika salah?',
                a: 'Tidak ada sistem minus di sistem CAT BKN resmi. Soal TWK dan TIU bernilai 5 jika benar dan 0 jika salah. TKP selalu bernilai antara 1 sampai 5. Sangat disarankan menjawab seluruh soal.',
              },
              {
                q: 'Apakah soal di platform ini sesuai kisi-kisi terbaru?',
                a: 'Seluruh paket disusun mengacu pada kisi-kisi BKN dan materi aktual seleksi CPNS, mencakup pilar negara, integritas ASN, logika analogi, numerik, dan jejaring kerja.',
              },
            ].map((faq, i) => (
              <div key={i} className="card-modern p-5">
                <h4 className="font-semibold text-sm text-[var(--foreground)] mb-1.5 flex items-center gap-2">
                  <Question size={16} className="text-[var(--muted-foreground)] shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="mt-20 text-center">
          <div
            className="card-modern p-8 sm:p-12 max-w-2xl mx-auto"
            style={{
              background: 'radial-gradient(circle at top, #faf9f5 0%, var(--card) 100%)',
            }}
          >
            <Trophy size={36} weight="duotone" className="mx-auto mb-3 text-[var(--primary)]" />
            <h2 className="text-2xl font-bold tracking-tight">
              Siap Memulai Latihan Hari Ini?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-2 max-w-md mx-auto leading-relaxed">
              Pilih dari 6 paket tryout lengkap atau latih ketahanan psikotes Kraepelin Anda sekarang tanpa biaya.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/simulasi" className="btn-primary text-sm px-6 py-2.5 w-full sm:w-auto">
                Buka Semua Tryout
              </Link>
              <Link href="/psikotes" className="btn-secondary text-sm px-6 py-2.5 w-full sm:w-auto">
                Jelajahi Psikotes
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
