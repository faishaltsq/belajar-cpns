import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      className="mt-24 w-full"
      style={{
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--muted-foreground)'
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--foreground)' }}>
                Lolos<span style={{ color: 'var(--primary)' }}>.in</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              Platform simulasi CAT SKD dan latihan psikotes berbasis standar BKN untuk pejuang NIP 2026.
            </p>
          </div>

          {/* Modul Latihan */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Modul Latihan
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link href="/simulasi" className="hover:text-[var(--foreground)] transition-colors">Simulasi CAT SKD</Link></li>
              <li><Link href="/psikotes/kraepelin" className="hover:text-[var(--foreground)] transition-colors">Tes Koran Kraepelin</Link></li>
              <li><Link href="/psikotes/penalaran" className="hover:text-[var(--foreground)] transition-colors">Tes Penalaran &amp; Spasial</Link></li>
              <li><Link href="/psikotes" className="hover:text-[var(--foreground)] transition-colors">Semua Tes Psikotes</Link></li>
            </ul>
          </div>

          {/* Info Seleksi */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Info Seleksi 2026
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>Kepmen PANRB 321/2024</li>
              <li>Passing Grade: TWK 65, TIU 80, TKP 166</li>
              <li>Total Soal: 110 Butir / 100 Menit</li>
              <li>Sistem CAT BKN Tanpa Pengurangan Nilai</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Disclaimer
            </h4>
            <p className="text-xs leading-relaxed">
              Lolos.in bukan portal resmi BKN atau lembaga pemerintah RI. Seluruh konten dibuat untuk simulasi dan sarana belajar mandiri.
            </p>
          </div>
        </div>

        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p>&copy; 2026 Lolos.in. Hak cipta dilindungi.</p>
          <p>Dibuat untuk pejuang NIP Indonesia.</p>
        </div>
      </div>
    </footer>
  );
}
