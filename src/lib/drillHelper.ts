export interface DrillTopic {
  category: 'TWK' | 'TIU' | 'TKP';
  subCategory: string;
  label: string;
  icon: string;
}

export const DRILL_TOPICS: DrillTopic[] = [
  // TWK
  { category: 'TWK', subCategory: 'Pancasila', label: 'Pilar Pancasila', icon: '🇮🇩' },
  { category: 'TWK', subCategory: 'UUD 1945', label: 'UUD 1945', icon: '📜' },
  { category: 'TWK', subCategory: 'Bela Negara', label: 'Bela Negara', icon: '🛡️' },
  { category: 'TWK', subCategory: 'Nasionalisme', label: 'Nasionalisme', icon: '🌟' },
  { category: 'TWK', subCategory: 'Integritas', label: 'Integritas ASN', icon: '⚖️' },
  { category: 'TWK', subCategory: 'Bahasa Indonesia', label: 'Bahasa Indonesia', icon: '📖' },
  // TIU
  { category: 'TIU', subCategory: 'Analogi', label: 'Analogi Verbal', icon: '🔗' },
  { category: 'TIU', subCategory: 'Silogisme', label: 'Silogisme', icon: '💭' },
  { category: 'TIU', subCategory: 'Analitis', label: 'Analitis', icon: '🔍' },
  { category: 'TIU', subCategory: 'Deret Angka', label: 'Deret Angka', icon: '🔢' },
  { category: 'TIU', subCategory: 'Soal Cerita', label: 'Soal Cerita Hitung', icon: '🧮' },
  { category: 'TIU', subCategory: 'Figural', label: 'Figural / Visual', icon: '🎨' },
  // TKP
  { category: 'TKP', subCategory: 'Pelayanan Publik', label: 'Pelayanan Publik', icon: '🤝' },
  { category: 'TKP', subCategory: 'Profesionalisme', label: 'Profesionalisme', icon: '💼' },
  { category: 'TKP', subCategory: 'Anti-Radikalisme', label: 'Anti-Radikalisme', icon: '☮️' },
  { category: 'TKP', subCategory: 'Jejaring Kerja', label: 'Jejaring Kerja', icon: '🌐' },
  { category: 'TKP', subCategory: 'TIK', label: 'Teknologi Informasi', icon: '💻' },
  { category: 'TKP', subCategory: 'Sosial Budaya', label: 'Sosial & Budaya', icon: '🎭' },
];

export function stripQuestionPrefix(text: string): string {
  return text.replace(/^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\([^)]*\))?\s*:\s*/i, '').trim();
}

export function matchSubCategory(qSub: string | undefined, target: string, text?: string): boolean {
  const t = target.toLowerCase();
  const s = (qSub || '').toLowerCase();
  const txt = (text || '').toLowerCase();
  if (s === t) return true;
  if (t === 'pancasila') return s.includes('pancasila') || txt.includes('pancasila');
  if (t === 'uud 1945') return s.includes('uud') || s.includes('1945') || txt.includes('uud 1945');
  if (t === 'bela negara') return s.includes('bela negara') || txt.includes('bela negara');
  if (t === 'nasionalisme') return s.includes('nasional') || txt.includes('nasionalisme');
  if (t === 'integritas') return s.includes('integritas') || txt.includes('integritas');
  if (t === 'bahasa indonesia') return s.includes('bahasa') || s.includes('indonesia');
  if (t === 'analogi') return s.includes('analogi') || txt.includes('analogi');
  if (t === 'silogisme') return s.includes('silogisme') || txt.includes('kesimpulan');
  if (t === 'analitis') return s.includes('analitis') || txt.includes('urutan');
  if (t === 'deret angka') return s.includes('deret');
  if (t === 'soal cerita') return s.includes('cerita') || s.includes('berhitung');
  if (t === 'pelayanan publik') return s.includes('pelayanan');
  if (t === 'profesionalisme') return s.includes('profesional');
  if (t === 'jejaring kerja') return s.includes('jejaring') || s.includes('kerjasama');
  if (t === 'sosial budaya') return s.includes('sosial') || s.includes('budaya');
  if (t === 'tik') return s.includes('tik') || s.includes('teknologi');
  if (t === 'anti radikalisme') return s.includes('radikal') || s.includes('toleran');
  return false;
}
