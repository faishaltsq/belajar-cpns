/**
 * Tanggal "terakhir diubah" untuk tiap kelompok halaman, dipakai sitemap
 * sebagai `lastModified`.
 *
 * Kenapa konstanta eksplisit, bukan `new Date()`: Vercel tidak menyertakan
 * `.git` saat build, jadi tanggal commit per berkas tidak bisa dibaca di sana.
 * Dengan `new Date()` seluruh 66 URL berubah pada setiap deploy — termasuk
 * deploy yang hanya menyentuh README — dan Google mengabaikan `lastmod` yang
 * selalu bernilai "sekarang". Tanggal di bawah ini hanya bergerak ketika isinya
 * benar-benar berubah.
 *
 * Aturan pakai: ubah tanggal kelompok terkait pada commit yang mengubah isi
 * halaman itu. Jangan diubah untuk commit yang tidak mengubah isi halaman.
 */
export const CONTENT_UPDATED = {
  /** src/app/page.tsx — beranda. */
  home: '2026-10-21',
  /** src/app/simulasi/page.tsx — katalog paket tryout. */
  simulasi: '2026-10-21',
  /** src/data/tryoutSeo.ts — isi tiap halaman /simulasi/[id]. */
  tryout: '2026-10-17',
  /** src/app/drill/page.tsx — indeks latihan kilat. */
  drillIndex: '2026-10-11',
  /** src/data/drillContent.ts — materi tiap /drill/[kategori]/[subtopik]. */
  drill: '2026-10-17',
  /** src/app/psikotes/page.tsx — hub psikotes. */
  psikotesIndex: '2026-10-13',
  /** Halaman tes psikotes individual (Kraepelin, kecermatan, kepribadian). */
  psikotes: '2026-10-17',
  /** src/data/psikotes_penalaran.json — bank soal tes penalaran. */
  penalaran: '2026-10-22',
  /** src/data/flashcards.ts — isi halaman flashcard. */
  flashcard: '2026-10-22',
  /** src/data/journeySchedule.ts — kurikulum halaman roadmap. */
  journey: '2026-10-22',
} as const;
