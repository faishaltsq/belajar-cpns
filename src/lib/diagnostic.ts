import {
  Question,
  ExamAnswer,
  SubcategoryStat,
  SubcategoryDiagnosticReport,
} from '@/lib/types';

export function calculateSubcategoryDiagnostic(
  questions: Question[],
  answers: ExamAnswer[]
): SubcategoryDiagnosticReport {
  const ansMap = new Map<number, string | null>();
  answers.forEach((a) => ansMap.set(a.questionId, a.selectedOptionId));

  const statsMap = new Map<
    string,
    {
      name: string;
      category: Question['category'];
      total: number;
      correct: number;
      earned: number;
      max: number;
    }
  >();

  for (const q of questions) {
    const sub = q.subCategory || 'Umum';
    const key = `${q.category}:${sub}`;

    if (!statsMap.has(key)) {
      statsMap.set(key, { name: sub, category: q.category, total: 0, correct: 0, earned: 0, max: 0 });
    }

    const item = statsMap.get(key)!;
    item.total += 1;

    const maxScore = Math.max(...q.options.map((o) => o.score ?? 0));
    item.max += maxScore;

    const chosenId = ansMap.get(q.id) ?? null;
    const chosenOpt = q.options.find((o) => o.id === chosenId);
    const score = chosenOpt ? (chosenOpt.score ?? 0) : 0;
    item.earned += score;

    // "Benar" = skor tertinggi opsi (5 untuk TWK/TIU, >=4 dianggap baik untuk TKP)
    if (q.category === 'TKP') {
      if (score >= 4) item.correct += 1;
    } else {
      if (score === maxScore && maxScore > 0) item.correct += 1;
    }
  }

  const allSubcategories: SubcategoryStat[] = Array.from(statsMap.values()).map((s) => {
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    let status: SubcategoryStat['status'] = 'SEDANG';
    if (accuracy >= 80) status = 'KUAT';
    else if (accuracy < 60) status = 'LEMAH';

    return {
      name: s.name,
      category: s.category,
      total: s.total,
      correct: s.correct,
      earnedScore: s.earned,
      maxScore: s.max,
      accuracyPercent: accuracy,
      status,
    };
  });

  const weakestSubcategories = [...allSubcategories]
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 3);

  const strongestSubcategories = [...allSubcategories]
    .sort((a, b) => b.accuracyPercent - a.accuracyPercent)
    .slice(0, 3);

  const weakNames = weakestSubcategories
    .filter((w) => w.status === 'LEMAH')
    .map((w) => w.name);

  const recommendationNote =
    weakNames.length > 0
      ? `Prioritas belajar: Perdalam materi ${weakNames.join(', ')} untuk mendongkrak skor Passing Grade.`
      : 'Performa merata di semua subtopik, pertahankan latihan rutin!';

  return { weakestSubcategories, strongestSubcategories, allSubcategories, recommendationNote };
}
