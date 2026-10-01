// src/lib/examMode.ts
// Tipe dan helper untuk Mode Tryout Resmi vs Mode Latihan Mandiri

export type ExamType = 'official' | 'practice';

export interface ExamModeConfig {
  type: ExamType;
  label: string;
  description: string;
  canPause: boolean;
  strictTimer: boolean;
  detectTabSwitch: boolean;
  requestFullscreen: boolean;
  publishToLeaderboard: boolean;
}

export const EXAM_MODES: Record<ExamType, ExamModeConfig> = {
  official: {
    type: 'official',
    label: '🏆 Mode Tryout Resmi',
    description:
      'Simulasi kondisi ujian BKN sesungguhnya. Timer ketat tidak bisa dijeda. Perpindahan tab dicatat. Hasil masuk Leaderboard Nasional.',
    canPause: false,
    strictTimer: true,
    detectTabSwitch: true,
    requestFullscreen: true,
    publishToLeaderboard: true,
  },
  practice: {
    type: 'practice',
    label: '📖 Mode Latihan Mandiri',
    description:
      'Belajar tanpa tekanan. Bisa jeda kapan saja, simpan draf, dan lanjutkan nanti. Hasil tidak dicatat ke Leaderboard.',
    canPause: true,
    strictTimer: false,
    detectTabSwitch: false,
    requestFullscreen: false,
    publishToLeaderboard: false,
  },
};

/** Simpan preferensi mode exam ke localStorage */
export function saveExamMode(packageId: string, mode: ExamType) {
  localStorage.setItem(`exam_mode_${packageId}`, mode);
}

/** Baca preferensi mode exam dari localStorage, null jika belum dipilih */
export function loadExamMode(packageId: string): ExamType | null {
  const val = localStorage.getItem(`exam_mode_${packageId}`);
  if (val === 'official' || val === 'practice') return val;
  return null;
}
