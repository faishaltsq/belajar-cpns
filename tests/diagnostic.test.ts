import { describe, it, expect } from 'vitest';
import { calculateSubcategoryDiagnostic } from '@/lib/diagnostic';
import { Question, ExamAnswer } from '@/lib/types';

describe('calculateSubcategoryDiagnostic', () => {
  const dummyQuestions: Question[] = [
    {
      id: 1,
      category: 'TWK',
      subCategory: 'Bela Negara',
      text: 'Soal 1',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
    {
      id: 2,
      category: 'TWK',
      subCategory: 'Bela Negara',
      text: 'Soal 2',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
    {
      id: 3,
      category: 'TIU',
      subCategory: 'Silogisme',
      text: 'Soal 3',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
    {
      id: 4,
      category: 'TKP',
      subCategory: 'Pelayanan Publik',
      text: 'Soal 4 TKP',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 4 },
        { id: 'C', text: 'C', score: 1 },
      ],
      explanation: 'Ket TKP',
    },
  ];

  it('mengidentifikasi subkategori terlemah dan terkuat dengan benar', () => {
    // User jawab benar soal 1 (Bela Negara), salah soal 2 (Bela Negara), salah soal 3 (Silogisme), skor 5 soal 4 (TKP)
    const answers: ExamAnswer[] = [
      { questionId: 1, selectedOptionId: 'A' },
      { questionId: 2, selectedOptionId: 'B' },
      { questionId: 3, selectedOptionId: 'B' },
      { questionId: 4, selectedOptionId: 'A' },
    ];

    const report = calculateSubcategoryDiagnostic(dummyQuestions, answers);
    expect(report.allSubcategories).toHaveLength(3);

    const silogisme = report.allSubcategories.find((s) => s.name === 'Silogisme');
    expect(silogisme?.accuracyPercent).toBe(0);
    expect(silogisme?.status).toBe('LEMAH');

    const belaNegara = report.allSubcategories.find((s) => s.name === 'Bela Negara');
    expect(belaNegara?.accuracyPercent).toBe(50);
    expect(belaNegara?.status).toBe('LEMAH');

    const pelayanan = report.allSubcategories.find((s) => s.name === 'Pelayanan Publik');
    expect(pelayanan?.accuracyPercent).toBe(100);
    expect(pelayanan?.status).toBe('KUAT');

    expect(report.weakestSubcategories[0].name).toBe('Silogisme');
    expect(report.strongestSubcategories[0].name).toBe('Pelayanan Publik');
    expect(report.recommendationNote).toContain('Silogisme');
  });

  it('menangani jawaban kosong tanpa melempar error', () => {
    const report = calculateSubcategoryDiagnostic(dummyQuestions, []);
    expect(report.allSubcategories).toHaveLength(3);
    expect(report.weakestSubcategories).toHaveLength(3);
    expect(report.allSubcategories.every((s) => s.accuracyPercent === 0)).toBe(true);
  });
});
