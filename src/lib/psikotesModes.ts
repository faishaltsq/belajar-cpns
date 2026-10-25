/**
 * Konfigurasi mode tes Kraepelin.
 *
 * Dipindahkan dari `app/psikotes/kraepelin/page.tsx` supaya materi penjelas di
 * `data/psikotesContent.ts` membaca angka yang sama dengan runner. Sebelumnya
 * jumlah kolom, durasi, dan panjang deret hanya hidup di dalam komponen client,
 * jadi setiap teks yang menyebut "5 kolom · 30 detik" adalah salinan manual yang
 * bisa menyimpang tanpa ada yang gagal.
 */

export type KraepelinMode = 'kilat' | 'standar' | 'simulasi';

export interface KraepelinModeConfig {
  columns: number;
  durationPerCol: number;
  numbersPerCol: number;
  label: string;
  desc: string;
}

export const KRAEPELIN_MODES: Record<KraepelinMode, KraepelinModeConfig> = {
  kilat: {
    columns: 3,
    durationPerCol: 15,
    numbersPerCol: 20,
    label: 'Latihan Kilat',
    desc: '3 Kolom · 15 detik/kolom (Pemanasan cepat)',
  },
  standar: {
    columns: 5,
    durationPerCol: 30,
    numbersPerCol: 35,
    label: 'Standar Latihan',
    desc: '5 Kolom · 30 detik/kolom (Rekomendasi adaptasi ritme)',
  },
  simulasi: {
    columns: 10,
    durationPerCol: 30,
    numbersPerCol: 45,
    label: 'Simulasi Penuh',
    desc: '10 Kolom · 30 detik/kolom (Uji ketahanan penuh)',
  },
};

/** Total detik pengerjaan satu mode, tanpa hitungan mundur pembuka. */
export function modeTotalSeconds(mode: KraepelinMode): number {
  const cfg = KRAEPELIN_MODES[mode];
  return cfg.columns * cfg.durationPerCol;
}

/** Satu kolom berisi N angka, dan setiap jawaban memakai dua angka. */
export function modePairCount(mode: KraepelinMode): number {
  return KRAEPELIN_MODES[mode].numbersPerCol - 1;
}

/** "45 detik" / "2,5 menit" / "5 menit" — dipakai teks penjelas, bukan runner. */
export function modeDurationLabel(mode: KraepelinMode): string {
  const seconds = modeTotalSeconds(mode);
  if (seconds < 60) return `${seconds} detik`;
  // Format manual: Intl di server bisa berbeda antar build, sedangkan teks ini
  // dirender statis dan harus identik dengan yang dibaca pengguna.
  const minutes = seconds / 60;
  return `${String(minutes).replace('.', ',')} menit`;
}
