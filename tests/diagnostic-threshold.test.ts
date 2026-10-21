import { describe, it, expect } from 'vitest';
import { calculateSubcategoryDiagnostic } from '@/lib/diagnostic';
import { ExamAnswer, Question } from '@/lib/types';

/**
 * The diagnostic may only call a topic weak when there is enough answered work
 * to say so. Below the threshold every subtopic reads 0%, and calling those
 * weak would be an invention rather than a measurement.
 */
function paper(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    category: i % 2 === 0 ? 'TWK' : 'TIU',
    subCategory: i % 2 === 0 ? 'Bela Negara' : 'Silogisme',
    text: `Soal ${i + 1}`,
    options: [
      { id: 'A', text: 'A', score: 5 },
      { id: 'B', text: 'B', score: 0 },
    ],
    explanation: 'Ket',
  })) as Question[];
}

const RIGHT: ExamAnswer[] = [];

describe('calculateSubcategoryDiagnostic — data threshold', () => {
  it('reports no conclusion when nothing was answered', () => {
    const report = calculateSubcategoryDiagnostic(paper(20), RIGHT);

    expect(report.insufficientData).toBe(true);
    expect(report.answeredCount).toBe(0);
    expect(report.recommendationNote).toBe(
      'Kerjakan lebih banyak latihan untuk melihat analisis kemampuanmu.'
    );
  });

  it('still reports no conclusion just under the threshold', () => {
    const answers = Array.from({ length: 9 }, (_, i) => ({
      questionId: i + 1,
      selectedOptionId: 'B',
    }));

    const report = calculateSubcategoryDiagnostic(paper(20), answers);

    expect(report.answeredCount).toBe(9);
    expect(report.insufficientData).toBe(true);
    expect(report.recommendationNote).toBe(
      'Kerjakan lebih banyak latihan untuk melihat analisis kemampuanmu.'
    );
  });

  it('names weak topics once there is enough answered work', () => {
    const answers = Array.from({ length: 10 }, (_, i) => ({
      questionId: i + 1,
      selectedOptionId: 'B', // every answer wrong → all subtopics at 0%
    }));

    const report = calculateSubcategoryDiagnostic(paper(20), answers);

    expect(report.answeredCount).toBe(10);
    expect(report.insufficientData).toBe(false);
    expect(report.recommendationNote).toMatch(/Prioritas belajar/);
    expect(report.recommendationNote).toContain('Bela Negara');
    expect(report.recommendationNote).toContain('Silogisme');
  });

  it('ignores skipped questions when counting the evidence', () => {
    const answers: ExamAnswer[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ questionId: i + 1, selectedOptionId: 'A' })),
      { questionId: 9, selectedOptionId: null },
      { questionId: 10, selectedOptionId: null },
    ];

    const report = calculateSubcategoryDiagnostic(paper(20), answers as ExamAnswer[]);

    expect(report.answeredCount).toBe(8);
    expect(report.insufficientData).toBe(true);
  });
});
