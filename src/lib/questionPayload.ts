// Wire-shape helpers for question payloads.
//
// `loadPackage` returns fully-scored questions because the server needs the
// answer key to score a submission. That object must never be serialized
// straight to a client mid-exam: `options[i].score === 5` marks the correct
// answer, and `explanation` states it outright. These helpers define the two
// shapes the API is allowed to emit.

import { Question } from '@/lib/types';

/** What a client may see while the exam is still open. */
export interface PublicQuestion {
  id: number;
  category: Question['category'];
  subCategory: string;
  text: string;
  image?: string;
  options: { id: string; text: string; image?: string }[];
}

/** What a client may see after submitting — adds the key and the reasoning. */
export interface ReviewQuestion extends PublicQuestion {
  options: { id: string; text: string; image?: string; score: number }[];
  explanation: string;
}

/** Strip scores, the key, and the explanation. */
export function toPublicQuestion(q: Question): PublicQuestion {
  return {
    id: q.id,
    category: q.category,
    subCategory: q.subCategory,
    text: q.text,
    ...(q.image ? { image: q.image } : {}),
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      ...(o.image ? { image: o.image } : {}),
    })),
  };
}

export function toPublicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => toPublicQuestion(q));
}

/** Full question including the key — only for a submitted result's owner. */
export function toReviewQuestion(q: Question): ReviewQuestion {
  return {
    ...toPublicQuestion(q),
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      ...(o.image ? { image: o.image } : {}),
      score: o.score,
    })),
    explanation: q.explanation ?? '',
  };
}
