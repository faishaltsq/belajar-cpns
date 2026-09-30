import Link from 'next/link';
import {
  ArrowRight,
  Timer,
  Trophy,
  Brain,
  GridFour,
  CheckCircle,
  Question,
  TrendUp,
  Fire,
} from '@phosphor-icons/react/dist/ssr';
import MiniTryout from '@/components/MiniTryout';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden selection:bg-purple-300 selection:text-purple-900 pb-16">
      {/* Aurora Glow Backdrop */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(167, 139, 250, 0.45) 0%, rgba(56, 189, 248, 0.3) 50%, rgba(52, 211, 153, 0.15) 100%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* HERO SECTION */}
        <section className="pt-12 sm:pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full clay-card-flat text-xs font-semibold text-purple-700 mb-6 border border-purple-200">
            <Fire size={14} weight="fill" className="text-amber-500" />
            <span>Update Soal SKD &amp; Psikotes BKN 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-slate-800 max-w-4xl mx-auto">
            Lolos SKD &amp; Psikotes CPNS 2026 dengan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500">
              Simulasi CAT Terlengkap
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Persiapan tuntas 110 butir SKD (TWK, TIU, TKP) dengan timer presisi 100 menit, penilaian otomatis BKN resmi, plus tes koran Kraepelin dan penalaran spasial.
          </p>

          {/* Live Ticker Pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 text-xs text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>3.420+ peserta sedang latihan hari ini</span>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/simulasi"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-base flex items-center justify-center gap-2 clay-button"
            >
              <span>Mulai Tryout SKD (100 Menit)</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
            <Link
              href="/psikotes"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base flex items-center justify-center gap-2 clay-button"
            >
              <span>Coba Tes Psikotes</span>
              <Brain size={18} weight="bold" />
            </Link>
          </div>

          {/* Stats Row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-base">110</span>
              <span>Soal SKD</span>
            </div>
            <span className="hidden sm:inline w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-base">100</span>
              <span>Menit Ujian</span>
            </div>
            <span className="hidden sm:inline w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-base">Kraepelin &amp; Penalaran</span>
              <span>Psikotes</span>
            </div>
            <span className="hidden sm:inline w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              <span>Penilaian BKN Resmi</span>
            </div>
          </div>
        </section>

        {/* MODUL PILIHAN SHOWCASE (Card Grid) */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Modul Belajar &amp; Simulasi Terpadu
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Pilih tes yang ingin Anda latih untuk memperkuat persiapan seleksi CPNS 2026
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Simulasi CAT */}
            <div className="clay-card p-6 flex flex-col justify-between border-t-4 border-t-blue-400">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <Timer size={26} weight="duotone" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                  SKD Resmi BKN
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">
                  Simulasi CAT SKD
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Latihan 110 butir soal gabungan TWK, TIU, dan TKP. Fitur timer sinkron, ragu-ragu, dan perankingan passing grade instan.
                </p>
              </div>
              <Link
                href="/simulasi"
                className="clay-button bg-blue-500 hover:bg-blue-400 text-white text-xs py-2.5 px-4 text-center block mt-2"
              >
                Buka Simulasi CAT &rarr;
              </Link>
            </div>

            {/* Card 2: Tes Koran Kraepelin / Pauli */}
            <div className="clay-card p-6 flex flex-col justify-between border-t-4 border-t-purple-400">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <GridFour size={26} weight="duotone" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
                  Psikotes Kecepatan
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">
                  Tes Koran Kraepelin
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Latihan penjumlahan angka berkolom dengan batas waktu per kolom. Mengukur ketahanan, kecepatan, dan stabilitas konsentrasi.
                </p>
              </div>
              <Link
                href="/psikotes/kraepelin"
                className="clay-button bg-purple-500 hover:bg-purple-400 text-white text-xs py-2.5 px-4 text-center block mt-2"
              >
                Mulai Kraepelin &rarr;
              </Link>
            </div>

            {/* Card 3: Penalaran & Spasial */}
            <div className="clay-card p-6 flex flex-col justify-between border-t-4 border-t-emerald-400">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Brain size={26} weight="duotone" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
                  Psikotes Logika
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">
                  Tes Penalaran &amp; Spasial
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Uji kemampuan berpikir analitis, silogisme, pola deret angka, serta rotasi bentuk spasial 2D &amp; 3D secara presisi.
                </p>
              </div>
              <Link
                href="/psikotes/penalaran"
                className="clay-button bg-emerald-500 hover:bg-emerald-400 text-white text-xs py-2.5 px-4 text-center block mt-2"
              >
                Mulai Tes Penalaran &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* INTERACTIVE MINI TRYOUT WIDGET */}
        <section className="py-12">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Coba Sekarang
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
              Uji Pengetahuan Singkat Anda
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Jawab langsung contoh soal di bawah ini dan periksa kebenaran jawabanmu:
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <MiniTryout />
          </div>
        </section>

        {/* PASSING GRADE TABLE */}
        <section className="py-12">
          <div className="clay-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Nilai Ambang Batas SKD CPNS 2026
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sesuai Keputusan Menteri PANRB No. 321 Tahun 2024 untuk Formasi Umum
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                Kepmen PANRB 321/2024
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-xs">
                    <th className="text-left py-3 font-semibold">Subtes</th>
                    <th className="text-center py-3 font-semibold">Jumlah Soal</th>
                    <th className="text-center py-3 font-semibold">Bobot Benar</th>
                    <th className="text-center py-3 font-semibold">Nilai Maksimal</th>
                    <th className="text-center py-3 font-semibold">Passing Grade (PG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <tr>
                    <td className="py-3.5 font-medium">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold mr-2 text-xs">
                        TWK
                      </span>
                      Tes Wawasan Kebangsaan
                    </td>
                    <td className="text-center py-3.5">30 butir</td>
                    <td className="text-center py-3.5">5 (Salah 0)</td>
                    <td className="text-center py-3.5">150</td>
                    <td className="text-center py-3.5 font-bold text-blue-600">65</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-700 font-bold mr-2 text-xs">
                        TIU
                      </span>
                      Tes Inteligensia Umum
                    </td>
                    <td className="text-center py-3.5">35 butir</td>
                    <td className="text-center py-3.5">5 (Salah 0)</td>
                    <td className="text-center py-3.5">175</td>
                    <td className="text-center py-3.5 font-bold text-purple-600">80</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold mr-2 text-xs">
                        TKP
                      </span>
                      Tes Karakteristik Pribadi
                    </td>
                    <td className="text-center py-3.5">45 butir</td>
                    <td className="text-center py-3.5">Skala 1 - 5</td>
                    <td className="text-center py-3.5">225</td>
                    <td className="text-center py-3.5 font-bold text-emerald-600">166</td>
                  </tr>
                  <tr className="bg-white/40 font-bold text-slate-800">
                    <td className="py-3.5 px-2">Total Kumulatif</td>
                    <td className="text-center py-3.5">110 butir</td>
                    <td className="text-center py-3.5">-</td>
                    <td className="text-center py-3.5">550</td>
                    <td className="text-center py-3.5 text-purple-700">311</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF / LEADERBOARD MINI PREVIEW */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Peringkat Teratas Tryout Minggu Ini
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Peserta dengan nilai tertinggi di simulasi CAT SKD CPNSMaster
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Top 1 */}
            <div className="clay-card p-5 flex items-center gap-4 relative overflow-hidden border-l-4 border-l-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm">
                #1
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm truncate">Rizky P.</span>
                  <span className="font-extrabold text-amber-600 text-sm">482</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Tujuan: BKN Pusat</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>TWK 110</span> &bull; <span>TIU 145</span> &bull; <span>TKP 227</span>
                </div>
              </div>
            </div>

            {/* Top 2 */}
            <div className="clay-card p-5 flex items-center gap-4 relative overflow-hidden border-l-4 border-l-slate-400">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                #2
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm truncate">Dinda S.</span>
                  <span className="font-extrabold text-purple-600 text-sm">471</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Tujuan: Kemenkeu RI</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>TWK 105</span> &bull; <span>TIU 150</span> &bull; <span>TKP 216</span>
                </div>
              </div>
            </div>

            {/* Top 3 */}
            <div className="clay-card p-5 flex items-center gap-4 relative overflow-hidden border-l-4 border-l-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center font-bold text-amber-900 text-sm">
                #3
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm truncate">Fajar W.</span>
                  <span className="font-extrabold text-emerald-600 text-sm">465</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Tujuan: Kejaksaan Agung</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>TWK 95</span> &bull; <span>TIU 155</span> &bull; <span>TKP 215</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Semua hal seputar format ujian, passing grade, dan sistem penilaian CAT BKN
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="clay-card p-5">
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <Question size={18} weight="fill" className="text-purple-500" />
                Berapa passing grade resmi SKD CPNS 2026?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Berdasarkan Kepmen PANRB No. 321/2024, nilai ambang batas umum adalah TWK 65, TIU 80, dan TKP 166. Anda wajib memenuhi nilai minimal di ketiga kategori tersebut secara bersamaan untuk dinyatakan lolos ambang batas.
              </p>
            </div>

            <div className="clay-card p-5">
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <Question size={18} weight="fill" className="text-purple-500" />
                Berapa lama durasi ujian SKD sesungguhnya?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Waktu pengerjaan adalah 100 menit untuk total 110 butir soal bagi pelamar umum, atau 130 menit khusus bagi pelamar penyandang disabilitas.
              </p>
            </div>

            <div className="clay-card p-5">
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <Question size={18} weight="fill" className="text-purple-500" />
                Apakah ada sistem nilai minus jika jawaban salah?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tidak ada sistem minus di sistem CAT BKN. Untuk TWK dan TIU, jawaban benar bernilai 5 dan salah bernilai 0. Sedangkan untuk TKP, setiap pilihan bernilai antara 1 sampai 5. Pastikan semua soal terisi.
              </p>
            </div>

            <div className="clay-card p-5">
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <Question size={18} weight="fill" className="text-purple-500" />
                Apa manfaat latihan Tes Kraepelin dan Penalaran?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selain SKD, tahapan Seleksi Kompetensi Bidang (SKB) di berbagai kementerian dan instansi mewajibkan Psikotes. Tes Kraepelin mengukur daya tahan dan konsistensi kerja, sedangkan penalaran analitis mengukur ketajaman logika.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CTA */}
        <section className="py-12 text-center">
          <div className="clay-card p-8 sm:p-12 max-w-3xl mx-auto bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10">
            <Trophy size={48} weight="duotone" className="text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Siap Raih NIP Impian di Seleksi CPNS 2026?
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed">
              Mulai uji kemampuanmu sekarang juga. Simulasi langsung dari browser tanpa perlu install aplikasi.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/simulasi"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm flex items-center justify-center gap-2 clay-button"
              >
                <span>Mulai Tryout Gratis Sekarang</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href="/psikotes"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl clay-card-flat text-slate-700 font-semibold text-sm hover:text-purple-600 transition"
              >
                Jelajahi Tes Psikotes
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
