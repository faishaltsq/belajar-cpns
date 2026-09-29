import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/60 bg-white/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-2xl bg-purple-500 flex items-center justify-center font-bold text-white text-sm"
                style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.9)' }}
              >
                C
              </div>
              <span className="font-bold text-lg text-slate-800">CPNSMaster</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Platform latihan mandiri SKD &amp; Psikotes CPNS 2026 dengan sistem skoring dan timer standar CAT BKN resmi.
            </p>
          </div>

          {/* Nav Links */}
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-3">Modul Latihan</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <Link href="/simulasi" className="hover:text-purple-600 transition">
                  Simulasi CAT SKD
                </Link>
              </li>
              <li>
                <Link href="/psikotes/kraepelin" className="hover:text-purple-600 transition">
                  Tes Koran Kraepelin
                </Link>
              </li>
              <li>
                <Link href="/psikotes/penalaran" className="hover:text-purple-600 transition">
                  Tes Penalaran &amp; Spasial
                </Link>
              </li>
              <li>
                <Link href="/psikotes" className="hover:text-purple-600 transition">
                  Semua Tes Psikotes
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Info */}
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-3">Info Seleksi 2026</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Kepmen PANRB 321/2024</li>
              <li>Passing Grade: TWK 65, TIU 80, TKP 166</li>
              <li>Total Soal: 110 Butir / 100 Menit</li>
              <li>Sistem CAT BKN Tanpa Pengurangan Nilai</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-3">Disclaimer</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              CPNSMaster bukan portal resmi BKN atau lembaga pemerintah RI. Seluruh konten dan materi dibuat untuk simulasi dan sarana belajar mandiri.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>&copy; 2026 CPNSMaster. Hak Cipta Dilindungi.</p>
          <p>Dibuat untuk pejuang NIP Indonesia.</p>
        </div>
      </div>
    </footer>
  );
}
