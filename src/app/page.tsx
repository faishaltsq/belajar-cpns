import Link from 'next/link';
import { ArrowRight, Timer, Trophy, ShieldCheck, BookOpen, CaretRight } from '@phosphor-icons/react/dist/ssr';

export default function LandingPage() {
  return (
    <div className="min-h-screen selection:bg-purple-300 selection:text-purple-900">
      {/* Top Navbar */}
      <nav className="border-b border-white/40 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto bg-white/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center font-bold text-white text-sm"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.9)' }}>
            C
          </div>
          <span className="font-bold text-lg text-slate-800">CPNSMaster</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-800 transition"
          >
            Masuk
          </Link>
          <Link
            href="/simulasi/tryout-1"
            className="px-4 py-2 rounded-xl text-sm bg-purple-500 hover:bg-purple-400 text-white font-medium transition clay-button"
          >
            Mulai Tryout Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium mb-6">
          <span>⚡ Standar Resmi CAT BKN — Kepmen PANRB 321/2024</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-slate-800">
          Lolos SKD CPNS 2026 dengan{' '}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
            Simulasi CAT Terlengkap
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
          Latihan 110 soal resmi (TWK, TIU, TKP) dengan sistem skoring dan batas waktu presisi
          100 menit persis seperti ujian CAT sesungguhnya.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/simulasi/tryout-1"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-base flex items-center justify-center gap-2 transition clay-button"
          >
            <span>Mulai Simulasi 100 Menit</span>
            <ArrowRight className="w-5 h-5" weight="bold" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl clay-card-flat text-slate-600 font-semibold text-base transition"
          >
            Masuk / Buat Akun
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-400">
          <span><strong className="text-slate-700">110</strong> Soal Resmi</span>
          <span className="w-px h-4 bg-slate-300" />
          <span><strong className="text-slate-700">100</strong> Menit</span>
          <span className="w-px h-4 bg-slate-300" />
          <span><strong className="text-slate-700">TWK · TIU · TKP</strong></span>
        </div>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="clay-card p-6">
            <Timer className="w-8 h-8 text-blue-500 mb-4" weight="duotone" />
            <h3 className="font-bold text-lg mb-2 text-slate-800">Timer Presisi 100 Menit</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Countdown tahan reload halaman. Peringatan merah saat waktu tersisa kurang dari 5 menit.
            </p>
          </div>

          <div className="clay-card p-6">
            <Trophy className="w-8 h-8 text-emerald-500 mb-4" weight="duotone" />
            <h3 className="font-bold text-lg mb-2 text-slate-800">Penilaian CAT BKN Otomatis</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Skor TWK (PG 65), TIU (PG 80), TKP skala 1–5 (PG 166) — sesuai ambang batas nasional.
            </p>
          </div>

          <div className="clay-card p-6">
            <ShieldCheck className="w-8 h-8 text-purple-500 mb-4" weight="duotone" />
            <h3 className="font-bold text-lg mb-2 text-slate-800">Login HP Tanpa Biaya SMS</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Daftar cukup dengan nomor HP dan PIN 6 digit. Tidak ada biaya OTP SMS.
            </p>
          </div>
        </div>

        {/* Passing Grades Table */}
        <div className="mt-16 clay-card p-6 text-left">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2 text-slate-800">
            <BookOpen className="w-5 h-5 text-slate-500" weight="duotone" />
            <span>Nilai Ambang Batas SKD CPNS (Kepmen PANRB 321/2024)</span>
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="text-left py-2 font-medium">Kategori</th>
                <th className="text-center py-2 font-medium">Jumlah Soal</th>
                <th className="text-center py-2 font-medium">Nilai Maks</th>
                <th className="text-center py-2 font-medium">Ambang Batas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="text-slate-700">
                <td className="py-3">TWK</td>
                <td className="text-center py-3">30</td>
                <td className="text-center py-3">150</td>
                <td className="text-center py-3 font-semibold text-blue-500">65</td>
              </tr>
              <tr className="text-slate-700">
                <td className="py-3">TIU</td>
                <td className="text-center py-3">35</td>
                <td className="text-center py-3">175</td>
                <td className="text-center py-3 font-semibold text-purple-500">80</td>
              </tr>
              <tr className="text-slate-700">
                <td className="py-3">TKP</td>
                <td className="text-center py-3">45</td>
                <td className="text-center py-3">225</td>
                <td className="text-center py-3 font-semibold text-emerald-500">166</td>
              </tr>
              <tr className="text-slate-600 font-semibold border-t border-slate-200">
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
            className="inline-flex items-center gap-2 text-purple-500 hover:text-purple-400 font-medium text-sm transition"
          >
            <span>Mulai latihan sekarang, gratis</span>
            <CaretRight className="w-4 h-4" weight="bold" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/40 px-6 py-8 text-center text-xs text-slate-400">
        <p>CPNSMaster &copy; 2026 &mdash; Platform persiapan SKD CPNS standar BKN. Bukan afiliasi pemerintah.</p>
      </footer>
    </div>
  );
}
