import Link from 'next/link';
import { ArrowRight, Clock, Award, Shield, BookOpen, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            C
          </div>
          <span className="font-bold text-lg">CPNSMaster</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white transition"
          >
            Masuk
          </Link>
          <Link
            href="/simulasi/tryout-1"
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
          >
            Mulai Tryout Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
          <span>⚡ Standar Resmi CAT BKN — Kepmen PANRB 321/2024</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Lolos SKD CPNS 2026 dengan{' '}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Simulasi CAT Terlengkap
          </span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
          Latihan 110 soal resmi (TWK, TIU, TKP) dengan sistem skoring dan batas waktu presisi
          100 menit persis seperti ujian CAT sesungguhnya.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/simulasi/tryout-1"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <span>Mulai Simulasi 100 Menit</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-base transition"
          >
            Masuk / Buat Akun
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
          <span><strong className="text-zinc-200">110</strong> Soal Resmi</span>
          <span className="w-px h-4 bg-zinc-800" />
          <span><strong className="text-zinc-200">100</strong> Menit</span>
          <span className="w-px h-4 bg-zinc-800" />
          <span><strong className="text-zinc-200">TWK · TIU · TKP</strong></span>
        </div>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <Clock className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Timer Presisi 100 Menit</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Countdown tahan reload halaman. Peringatan merah saat waktu tersisa kurang dari 5 menit.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <Award className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Penilaian CAT BKN Otomatis</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Skor TWK (PG 65), TIU (PG 80), TKP skala 1–5 (PG 166) — sesuai ambang batas nasional.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <Shield className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Login HP Tanpa Biaya SMS</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Daftar cukup dengan nomor HP dan PIN 6 digit. Tidak ada biaya OTP SMS.
            </p>
          </div>
        </div>

        {/* Passing Grades Table */}
        <div className="mt-16 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 text-left">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-zinc-400" />
            <span>Nilai Ambang Batas SKD CPNS (Kepmen PANRB 321/2024)</span>
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left py-2 font-medium">Kategori</th>
                <th className="text-center py-2 font-medium">Jumlah Soal</th>
                <th className="text-center py-2 font-medium">Nilai Maks</th>
                <th className="text-center py-2 font-medium">Ambang Batas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="text-zinc-200">
                <td className="py-3">TWK</td>
                <td className="text-center py-3">30</td>
                <td className="text-center py-3">150</td>
                <td className="text-center py-3 font-semibold text-blue-400">65</td>
              </tr>
              <tr className="text-zinc-200">
                <td className="py-3">TIU</td>
                <td className="text-center py-3">35</td>
                <td className="text-center py-3">175</td>
                <td className="text-center py-3 font-semibold text-purple-400">80</td>
              </tr>
              <tr className="text-zinc-200">
                <td className="py-3">TKP</td>
                <td className="text-center py-3">45</td>
                <td className="text-center py-3">225</td>
                <td className="text-center py-3 font-semibold text-emerald-400">166</td>
              </tr>
              <tr className="text-zinc-300 font-semibold border-t border-zinc-700">
                <td className="py-3">Total</td>
                <td className="text-center py-3">110</td>
                <td className="text-center py-3">550</td>
                <td className="text-center py-3">311 (Kumulatif)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CTA Footer */}
        <div className="mt-16 text-center">
          <Link
            href="/simulasi/tryout-1"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition"
          >
            <span>Mulai latihan sekarang, gratis</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-xs text-zinc-500">
        <p>CPNSMaster &copy; 2026 &mdash; Platform persiapan SKD CPNS standar BKN. Bukan afiliasi pemerintah.</p>
      </footer>
    </div>
  );
}
