import Link from 'next/link';
import { JOURNEY_DAYS } from '@/data/journeySchedule';

/**
 * Blok konten server-rendered untuk halaman roadmap. Runner-nya client-only
 * (progres dibaca dari localStorage), sehingga HTML awal hanya berisi teks
 * "Memuat perjalanan belajar..." tanpa <h1>. Komponen ini merender seluruh
 * kurikulum 30 hari di HTML pertama: satu-satunya bagian halaman ini yang
 * memang layak diindeks, dan isinya berbeda di tiap baris.
 */

const PHASES = [1, 2, 3] as const;

const PHASE_TITLE: Record<(typeof PHASES)[number], string> = {
  1: 'Fase 1 — Fondasi TWK dan Pilar Kebangsaan (Hari 1–10)',
  2: 'Fase 2 — Trik Cepat dan Logika TIU (Hari 11–20)',
  3: 'Fase 3 — TKP dan Simulasi Penuh (Hari 21–30)',
};

const PHASE_INTRO: Record<(typeof PHASES)[number], string> = {
  1: 'Sepuluh hari pertama menutup seluruh materi TWK yang punya batas nilai sendiri di SKD. Urutannya sengaja dimulai dari Pancasila dan UUD 1945 karena dua subtopik itu menyumbang porsi soal terbesar, lalu bergerak ke sejarah, perundang-undangan, integritas ASN, dan bahasa Indonesia.',
  2: 'Fase ini tidak menambah materi baru, melainkan memindahkan hitungan ke kertas coret. Setiap hari memasangkan satu trik dengan satu sesi drill supaya rumusnya langsung dipakai di soal, bukan cuma dibaca. Penutup fase memakai soal salah dari sepuluh hari sebelumnya sebagai bahan ulang.',
  3: 'Fase terakhir menaikkan skor TKP — bagian yang paling sering diabaikan padahal bobotnya 45 butir — lalu menutup dengan dua simulasi penuh 110 butir. Di antara keduanya ada Kraepelin untuk mengukur ketahanan konsentrasi dan satu hari khusus membaca ulang hasil tryout.',
};

export default function JourneyOverview() {
  const total = JOURNEY_DAYS.length;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-[var(--foreground)]">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        Roadmap Belajar CPNS 30 Hari: Kurikulum SKD Lengkap per Fase
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        Kurikulum ini membagi persiapan SKD menjadi {total} hari, masing-masing 15–25 menit,
        dengan satu tugas konkret per hari. Tidak ada hari yang isinya &ldquo;baca materi&rdquo;
        saja: setiap hari berakhir pada satu aktivitas yang bisa dicentang — buka satu set
        kartu, kerjakan sepuluh butir drill, atau jalankan satu simulasi. Progres disimpan per
        akun, jadi urutannya bisa ditinggal dan dilanjutkan kapan saja.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Cara memakai roadmap ini</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-2.5">
          Ikuti urutan fasenya, tetapi jangan mengejar tanggal. Yang menentukan kelulusan adalah
          tiga ambang batas per kategori, bukan jumlah hari yang sudah dicentang: TWK 65, TIU 80,
          dan TKP 166. Kalau setelah Fase 2 skor TIU-mu masih jauh di bawah 80, mengulang tiga
          hari TIU lebih berguna daripada memaksa masuk Fase 3 sesuai jadwal.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          Tandai hari sebagai selesai hanya setelah aktivitasnya benar-benar dijalankan. Tombol
          &ldquo;Sudah Mengerjakan Hari Ini&rdquo; dipakai untuk menjaga streak, dan streak itu
          sendiri berguna justru karena memaksa kontak harian dengan soal — bukan karena angkanya
          punya nilai di mata panitia.
        </p>
      </section>

      {PHASES.map((phase) => {
        const days = JOURNEY_DAYS.filter((d) => d.phase === phase);
        return (
          <section key={phase} className="mt-8">
            <h2 className="text-lg font-semibold mb-2">{PHASE_TITLE[phase]}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)] mb-3">
              {PHASE_INTRO[phase]}
            </p>
            <ol className="space-y-2">
              {days.map((day) => (
                <li key={day.day} className="card-modern p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold">
                      <span className="text-[var(--muted-foreground)] font-normal">
                        Hari {day.day} ·{' '}
                      </span>
                      {day.title}
                    </p>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] shrink-0">
                      {day.category} · {day.estimatedMinutes} mnt
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {day.description}
                  </p>
                  <Link
                    href={day.actionUrl}
                    className="mt-1.5 inline-block text-[11px] font-semibold text-[var(--primary)]"
                  >
                    {day.actionLabel} →
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section className="mt-10 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-semibold mb-3">Modul pendukung</h2>
        <ul className="flex flex-wrap gap-2">
          {[
            { href: '/flashcard', label: 'Flashcard Hafalan' },
            { href: '/drill', label: 'Latihan Kilat per Subtopik' },
            { href: '/simulasi', label: 'Simulasi CAT SKD' },
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
