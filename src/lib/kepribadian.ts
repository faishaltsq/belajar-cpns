import questions from '../data/psikotes_kepribadian.json';
import type {
  KepribadianDimensionKey,
  KepribadianOverallResult,
  KepribadianDimensionScore,
} from './types';

const DIMENSION_META: Record<KepribadianDimensionKey, { label: string; desc: string }> = {
  L: {
    label: 'Kepemimpinan & Inisiatif',
    desc: 'Kemampuan mengambil keputusan, mengarahkan tim, dan proaktif dalam menghadapi tantangan kerja.',
  },
  A: {
    label: 'Daya Juang & Prestasi',
    desc: 'Dorongan untuk bekerja tuntas, pantang menyerah, dan berorientasi pada pencapaian standar tinggi.',
  },
  D: {
    label: 'Ketelitian & Keteraturan',
    desc: 'Kecermatan terhadap detail dokumen, ketertiban administrasi, dan kepatuhan standar kualitas.',
  },
  S: {
    label: 'Kerja Sama & Relasi Sosial',
    desc: 'Kemampuan komunikasi diplomatis, empati sosial, dan sinergi harmonis lintas individu dan tim.',
  },
  R: {
    label: 'Kepatuhan & Integritas Regulasi',
    desc: 'Ketaatan tinggi pada SOP dinas, etika jabatan publik, dan integritas hukum tanpa kompromi.',
  },
};

export function evaluateKepribadianResults(
  answers: Record<number, 'A' | 'B'>
): KepribadianOverallResult {
  const scores: Record<KepribadianDimensionKey, number> = { L: 0, A: 0, D: 0, S: 0, R: 0 };
  const maxPossible: Record<KepribadianDimensionKey, number> = { L: 0, A: 0, D: 0, S: 0, R: 0 };

  for (const q of questions) {
    const dimA = q.optionA.dimension as KepribadianDimensionKey;
    const dimB = q.optionB.dimension as KepribadianDimensionKey;
    if (dimA) maxPossible[dimA] = (maxPossible[dimA] || 0) + 1;
    if (dimB) maxPossible[dimB] = (maxPossible[dimB] || 0) + 1;

    const chosen = answers[q.id];
    if (chosen === 'A' && dimA) scores[dimA] += 1;
    if (chosen === 'B' && dimB) scores[dimB] += 1;
  }

  const dimensions = {} as Record<KepribadianDimensionKey, KepribadianDimensionScore>;
  for (const key of ['L', 'A', 'D', 'S', 'R'] as KepribadianDimensionKey[]) {
    const score = scores[key];
    const max = maxPossible[key] || 1;
    dimensions[key] = {
      key,
      label: DIMENSION_META[key].label,
      score,
      maxScore: max,
      percentage: Math.round((score / max) * 100),
      description: DIMENSION_META[key].desc,
    };
  }

  // Determine top 2 dominant traits
  const sorted = Object.values(dimensions).sort((a, b) => b.percentage - a.percentage);
  const dominantTraits = sorted.slice(0, 2).map((d) => d.label);

  const asnFitSummary = `Profil Anda menunjukkan kekuatan utama pada ${dominantTraits.join(' dan ')}. Sikap kerja ini sangat selaras dengan core values BerAKHLAK aparatur sipil negara dalam penyelenggaraan tugas pelayanan publik dan akuntabilitas kedinasan.`;
  const recommendations = [
    `Pertahankan keunggulan pada aspek ${dominantTraits[0]} dalam penugasan proyek berbasis target.`,
    `Tingkatkan fleksibilitas dan pemahaman pada aspek ${sorted[sorted.length - 1].label} untuk mengoptimalkan performa lintas bidang.`,
  ];

  return {
    totalAnswered: Object.keys(answers).length,
    dimensions,
    dominantTraits,
    asnFitSummary,
    recommendations,
  };
}
