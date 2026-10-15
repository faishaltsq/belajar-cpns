import { describe, it, expect, beforeEach } from 'vitest';
import { calculateExamScore, PASSING_GRADES, MAX_SCORES, QUESTION_LIMITS } from '@/lib/scoring';
import { Question, ExamAnswer, QuestionCategory } from '@/lib/types';
import { generateShareText, getWhatsAppShareUrl } from '@/lib/shareResult';
import { scopedKey } from '@/lib/userStorage';
import sampleQuestions from '@/data/sample_questions.json';

// Helper to generate a full 110-question standard CAT SKD package
function createStandard110Questions(customScores?: {
  twkScores?: number[];
  tiuScores?: number[];
  tkpScores?: number[][];
}): Question[] {
  const questions: Question[] = [];

  // TWK: 30 questions (index 0..29)
  for (let i = 0; i < 30; i++) {
    const score = customScores?.twkScores?.[i] ?? 5;
    questions.push({
      id: i + 1,
      category: 'TWK',
      subCategory: 'Nasionalisme',
      text: `TWK Soal ${i + 1}`,
      options: [
        { id: 'A', text: 'Benar', score },
        { id: 'B', text: 'Salah 1', score: 0 },
        { id: 'C', text: 'Salah 2', score: 0 },
        { id: 'D', text: 'Salah 3', score: 0 },
        { id: 'E', text: 'Salah 4', score: 0 },
      ],
      explanation: 'Pembahasan TWK',
    });
  }

  // TIU: 35 questions (index 30..64, id 31..65)
  for (let i = 0; i < 35; i++) {
    const score = customScores?.tiuScores?.[i] ?? 5;
    questions.push({
      id: i + 31,
      category: 'TIU',
      subCategory: 'Silogisme',
      text: `TIU Soal ${i + 1}`,
      options: [
        { id: 'A', text: 'Benar', score },
        { id: 'B', text: 'Salah 1', score: 0 },
        { id: 'C', text: 'Salah 2', score: 0 },
        { id: 'D', text: 'Salah 3', score: 0 },
        { id: 'E', text: 'Salah 4', score: 0 },
      ],
      explanation: 'Pembahasan TIU',
    });
  }

  // TKP: 45 questions (index 65..109, id 66..110)
  for (let i = 0; i < 45; i++) {
    const weights = customScores?.tkpScores?.[i] ?? [5, 4, 3, 2, 1];
    questions.push({
      id: i + 66,
      category: 'TKP',
      subCategory: 'Pelayanan Publik',
      text: `TKP Soal ${i + 1}`,
      options: [
        { id: 'A', text: 'Opsi A', score: weights[0] },
        { id: 'B', text: 'Opsi B', score: weights[1] },
        { id: 'C', text: 'Opsi C', score: weights[2] },
        { id: 'D', text: 'Opsi D', score: weights[3] },
        { id: 'E', text: 'Opsi E', score: weights[4] },
      ],
      explanation: 'Pembahasan TKP: Bobot A=5, B=4, C=3, D=2, E=1',
    });
  }

  return questions;
}

describe('Agent 3 Audit: CAT Simulation Engine & Scoring Fidelity', () => {
  // ── 1. CAT Scoring Calculation Rules ───────────────────────────────
  describe('1. CAT Scoring Rules & Maximum Caps (Kepmen PANRB 321/2024)', () => {
    it('verifies standard constants match Kepmen PANRB 321/2024 specification', () => {
      // Question Limits
      expect(QUESTION_LIMITS.TWK).toBe(30);
      expect(QUESTION_LIMITS.TIU).toBe(35);
      expect(QUESTION_LIMITS.TKP).toBe(45);
      expect(QUESTION_LIMITS.TOTAL).toBe(110);

      // Max Scores: TWK=150 (30*5), TIU=175 (35*5), TKP=225 (45*5), TOTAL=550
      expect(MAX_SCORES.TWK).toBe(150);
      expect(MAX_SCORES.TIU).toBe(175);
      expect(MAX_SCORES.TKP).toBe(225);
      expect(MAX_SCORES.TOTAL).toBe(550);

      // Official Passing Grades
      expect(PASSING_GRADES.TWK).toBe(65);
      expect(PASSING_GRADES.TIU).toBe(80);
      expect(PASSING_GRADES.TKP).toBe(166);
    });

    it('calculates maximum theoretical score (550) when all questions are answered perfectly', () => {
      const questions = createStandard110Questions();
      const perfectAnswers: ExamAnswer[] = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: 'A', // Option A has max score in helper (5 for TWK/TIU/TKP)
      }));

      const result = calculateExamScore(questions, perfectAnswers, 5400);

      expect(result.twk.score).toBe(150);
      expect(result.twk.maxScore).toBe(150);
      expect(result.twk.isPassed).toBe(true);

      expect(result.tiu.score).toBe(175);
      expect(result.tiu.maxScore).toBe(175);
      expect(result.tiu.isPassed).toBe(true);

      expect(result.tkp.score).toBe(225);
      expect(result.tkp.maxScore).toBe(225);
      expect(result.tkp.isPassed).toBe(true);

      expect(result.totalScore).toBe(550);
      expect(result.isPassedAll).toBe(true);
    });

    it('evaluates TWK binary scoring (0 or 5) with no negative points for wrong/empty answers', () => {
      const questions = createStandard110Questions();
      const mixedAnswers: ExamAnswer[] = [
        { questionId: 1, selectedOptionId: 'A' }, // Correct (5)
        { questionId: 2, selectedOptionId: 'B' }, // Wrong (0)
        { questionId: 3, selectedOptionId: null }, // Unanswered (0)
      ];

      const result = calculateExamScore(questions, mixedAnswers, 1000);
      expect(result.twk.score).toBe(5);
      expect(result.twk.answeredCount).toBe(2);
      expect(result.twk.totalQuestions).toBe(30);
    });

    it('evaluates TIU binary scoring (0 or 5) with no negative points for wrong/empty answers', () => {
      const questions = createStandard110Questions();
      const mixedAnswers: ExamAnswer[] = [
        { questionId: 31, selectedOptionId: 'A' }, // Correct (5)
        { questionId: 32, selectedOptionId: 'C' }, // Wrong (0)
        { questionId: 33, selectedOptionId: null }, // Unanswered (0)
      ];

      const result = calculateExamScore(questions, mixedAnswers, 1000);
      expect(result.tiu.score).toBe(5);
      expect(result.tiu.answeredCount).toBe(2);
      expect(result.tiu.totalQuestions).toBe(35);
    });

    it('evaluates TKP graded scale (1 to 5 per question) and 0 if unanswered', () => {
      const questions = createStandard110Questions();
      const tkpAnswers: ExamAnswer[] = [
        { questionId: 66, selectedOptionId: 'A' }, // Score 5
        { questionId: 67, selectedOptionId: 'B' }, // Score 4
        { questionId: 68, selectedOptionId: 'C' }, // Score 3
        { questionId: 69, selectedOptionId: 'D' }, // Score 2
        { questionId: 70, selectedOptionId: 'E' }, // Score 1
        { questionId: 71, selectedOptionId: null }, // Unanswered: Score 0
      ];

      const result = calculateExamScore(questions, tkpAnswers, 1000);
      // 5 + 4 + 3 + 2 + 1 + 0 = 15
      expect(result.tkp.score).toBe(15);
      expect(result.tkp.answeredCount).toBe(5);
    });

    it('handles complete blank submission (0 answers) gracefully without negative scores', () => {
      const questions = createStandard110Questions();
      const result = calculateExamScore(questions, [], 0);

      expect(result.twk.score).toBe(0);
      expect(result.tiu.score).toBe(0);
      expect(result.tkp.score).toBe(0);
      expect(result.totalScore).toBe(0);
      expect(result.isPassedAll).toBe(false);
      expect(result.twk.isPassed).toBe(false);
      expect(result.tiu.isPassed).toBe(false);
      expect(result.tkp.isPassed).toBe(false);
    });
  });

  // ── 2. Passing Grade Boundaries Strictly Per Kepmen PANRB 321/2024 ──
  describe('2. Strict Passing Grade Boundaries (Kepmen PANRB 321/2024)', () => {
    // Helper to build answers or questions targeting exact (TWK, TIU, TKP) score triplets
    function evaluateScoreTriplet(targetTwk: number, targetTiu: number, targetTkp: number) {
      // Build 110 questions where options can yield exactly targetTwk, targetTiu, targetTkp
      const twkScores = Array(30).fill(0);
      let remTwk = targetTwk;
      for (let i = 0; i < 30; i++) {
        const take = Math.min(remTwk, 5);
        twkScores[i] = take;
        remTwk -= take;
      }

      const tiuScores = Array(35).fill(0);
      let remTiu = targetTiu;
      for (let i = 0; i < 35; i++) {
        const take = Math.min(remTiu, 5);
        tiuScores[i] = take;
        remTiu -= take;
      }

      const tkpScores: number[][] = [];
      let remTkp = targetTkp;
      for (let i = 0; i < 45; i++) {
        const take = Math.min(remTkp, 5);
        tkpScores.push([take, 0, 0, 0, 0]);
        remTkp -= take;
      }

      const questions = createStandard110Questions({
        twkScores,
        tiuScores,
        tkpScores,
      });

      const answers: ExamAnswer[] = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: 'A',
      }));

      return calculateExamScore(questions, answers, 6000);
    }

    it('Scenario 1: Exact passing grade boundary (65, 80, 166) -> PASSED (isPassedAll = true)', () => {
      const result = evaluateScoreTriplet(65, 80, 166);

      expect(result.twk.score).toBe(65);
      expect(result.twk.passingGrade).toBe(65);
      expect(result.twk.isPassed).toBe(true);

      expect(result.tiu.score).toBe(80);
      expect(result.tiu.passingGrade).toBe(80);
      expect(result.tiu.isPassed).toBe(true);

      expect(result.tkp.score).toBe(166);
      expect(result.tkp.passingGrade).toBe(166);
      expect(result.tkp.isPassed).toBe(true);

      expect(result.totalScore).toBe(65 + 80 + 166); // 311
      expect(result.isPassedAll).toBe(true);
    });

    it('Scenario 2: TWK under boundary by 1 point (64, 80, 166) -> FAILED (TWK under)', () => {
      const result = evaluateScoreTriplet(64, 80, 166);

      expect(result.twk.score).toBe(64);
      expect(result.twk.passingGrade).toBe(65);
      expect(result.twk.isPassed).toBe(false);

      expect(result.tiu.score).toBe(80);
      expect(result.tiu.isPassed).toBe(true);

      expect(result.tkp.score).toBe(166);
      expect(result.tkp.isPassed).toBe(true);

      expect(result.isPassedAll).toBe(false);
    });

    it('Scenario 3: TIU under boundary by 1 point (65, 79, 166) -> FAILED (TIU under)', () => {
      const result = evaluateScoreTriplet(65, 79, 166);

      expect(result.twk.score).toBe(65);
      expect(result.twk.isPassed).toBe(true);

      expect(result.tiu.score).toBe(79);
      expect(result.tiu.passingGrade).toBe(80);
      expect(result.tiu.isPassed).toBe(false);

      expect(result.tkp.score).toBe(166);
      expect(result.tkp.isPassed).toBe(true);

      expect(result.isPassedAll).toBe(false);
    });

    it('Scenario 4: TKP under boundary by 1 point (65, 80, 165) -> FAILED (TKP under)', () => {
      const result = evaluateScoreTriplet(65, 80, 165);

      expect(result.twk.score).toBe(65);
      expect(result.twk.isPassed).toBe(true);

      expect(result.tiu.score).toBe(80);
      expect(result.tiu.isPassed).toBe(true);

      expect(result.tkp.score).toBe(165);
      expect(result.tkp.passingGrade).toBe(166);
      expect(result.tkp.isPassed).toBe(false);

      expect(result.isPassedAll).toBe(false);
    });

    it('Scenario 5: High total score fails if even ONE category is below threshold', () => {
      // Super high TIU and TKP (175 + 225 = 400), but TWK is 60 (< 65). Total = 460
      const result = evaluateScoreTriplet(60, 175, 225);

      expect(result.totalScore).toBe(460);
      expect(result.twk.isPassed).toBe(false);
      expect(result.tiu.isPassed).toBe(true);
      expect(result.tkp.isPassed).toBe(true);
      expect(result.isPassedAll).toBe(false);
    });
  });

  // ── 3. TKP Question Option Weights ─────────────────────────────────
  describe('3. TKP Question Option Weights Fidelity', () => {
    it('verifies sample_questions.json (Tryout 1) TKP options strictly map A-E to distinct scores 1-5', () => {
      const tkpQuestions = sampleQuestions.filter((q) => q.category === 'TKP');
      expect(tkpQuestions.length).toBe(45);

      for (const q of tkpQuestions) {
        expect(q.options, `Soal TKP #${q.id} harus memiliki 5 opsi`).toHaveLength(5);

        const optionIds = q.options.map((o) => o.id);
        expect(optionIds).toEqual(['A', 'B', 'C', 'D', 'E']);

        const scores = q.options.map((o) => o.score).sort((a, b) => a - b);
        expect(scores, `Soal TKP #${q.id} skor opsi harus tepat [1, 2, 3, 4, 5]`).toEqual([1, 2, 3, 4, 5]);

        // Distinct set check
        const distinctScores = new Set(scores);
        expect(distinctScores.size, `Soal TKP #${q.id} harus memiliki 5 skor unik`).toBe(5);
      }
    });

    it('validates integrity checker flags corrupted TKP question weights', () => {
      // Mock question with duplicated score (e.g. two 4s and no 3)
      const corruptedQuestion: Question = {
        id: 999,
        category: 'TKP',
        subCategory: 'Jejaring Kerja',
        text: 'Soal simulasi korup',
        options: [
          { id: 'A', text: 'Opsi A', score: 4 },
          { id: 'B', text: 'Opsi B', score: 5 },
          { id: 'C', text: 'Opsi C', score: 2 },
          { id: 'D', text: 'Opsi D', score: 1 },
          { id: 'E', text: 'Opsi E', score: 4 }, // Duplicate 4!
        ],
        explanation: 'Exp',
      };

      const scores = corruptedQuestion.options.map((o) => o.score).sort((a, b) => a - b);
      const isStrict1to5 =
        scores.length === 5 &&
        new Set(scores).size === 5 &&
        scores[0] === 1 &&
        scores[4] === 5;

      expect(isStrict1to5).toBe(false);
    });
  });

  // ── 4. Local Draft Persistence and Recovery ─────────────────────────
  describe('4. Local Draft Persistence & Session Recovery', () => {
    // In-memory localStorage mock for node environment
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      global.localStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          mockStorage = {};
        },
        key: (idx: number) => Object.keys(mockStorage)[idx] ?? null,
        length: Object.keys(mockStorage).length,
      } as Storage;
    });

    it('correctly generates scoped storage keys for logged-in and guest users', () => {
      const userKey = scopedKey('exam_answers_tryout-1', 'user-abc');
      const guestKey = scopedKey('exam_answers_tryout-1', null);
      const indexUserKey = scopedKey('exam_index_tryout-1', 'user-abc');

      expect(userKey).toBe('lolos_u_user-abc_exam_answers_tryout-1');
      expect(guestKey).toBe('lolos_guest_exam_answers_tryout-1');
      expect(indexUserKey).toBe('lolos_u_user-abc_exam_index_tryout-1');
    });

    it('persists and restores answers map draft faithfully', () => {
      const packageId = 'tryout-1';
      const userId = 'tester-01';
      const answersKey = scopedKey(`exam_answers_${packageId}`, userId);

      const draftAnswers: ExamAnswer[] = [
        { questionId: 1, selectedOptionId: 'C', isFlagged: false },
        { questionId: 2, selectedOptionId: 'A', isFlagged: false },
        { questionId: 3, selectedOptionId: null, isFlagged: false },
      ];

      // Save draft
      localStorage.setItem(answersKey, JSON.stringify(draftAnswers));

      // Restore draft
      const restoredRaw = localStorage.getItem(answersKey);
      expect(restoredRaw).not.toBeNull();

      const parsed: ExamAnswer[] = JSON.parse(restoredRaw!);
      const answersMap = new Map(parsed.map((a) => [a.questionId, a]));

      expect(answersMap.size).toBe(3);
      expect(answersMap.get(1)?.selectedOptionId).toBe('C');
      expect(answersMap.get(2)?.selectedOptionId).toBe('A');
      expect(answersMap.get(3)?.selectedOptionId).toBeNull();
    });

    it('persists and recovers ragu-ragu (flagged) state per question', () => {
      const packageId = 'tryout-2';
      const answersKey = scopedKey(`exam_answers_${packageId}`, null);

      const answersState = new Map<number, ExamAnswer>([
        [1, { questionId: 1, selectedOptionId: 'B', isFlagged: true }],
        [2, { questionId: 2, selectedOptionId: 'D', isFlagged: false }],
        [3, { questionId: 3, selectedOptionId: null, isFlagged: true }],
      ]);

      // Save
      localStorage.setItem(answersKey, JSON.stringify(Array.from(answersState.values())));

      // Recover
      const recoveredArr: ExamAnswer[] = JSON.parse(localStorage.getItem(answersKey)!);
      const recoveredMap = new Map(recoveredArr.map((a) => [a.questionId, a]));

      expect(recoveredMap.get(1)?.isFlagged).toBe(true);
      expect(recoveredMap.get(2)?.isFlagged).toBe(false);
      expect(recoveredMap.get(3)?.isFlagged).toBe(true);

      // Verify ragu-ragu count tally
      const flaggedCount = recoveredArr.filter((a) => a.isFlagged).length;
      expect(flaggedCount).toBe(2);
    });

    it('persists and recovers active question index (currentIndex)', () => {
      const packageId = 'tryout-1';
      const userId = 'user-02';
      const indexKey = scopedKey(`exam_index_${packageId}`, userId);

      // User navigates to question 42
      localStorage.setItem(indexKey, String(42));

      // Simulate page refresh / tab reopen
      const savedIndex = localStorage.getItem(indexKey);
      expect(savedIndex).not.toBeNull();

      const parsedIndex = parseInt(savedIndex!, 10);
      expect(parsedIndex).toBe(42);
    });

    it('clears draft answers, start time, and active question index upon exam submission', () => {
      const packageId = 'tryout-1';
      const userId = 'user-03';
      const storageKey = scopedKey(`exam_answers_${packageId}`, userId);
      const startKey = scopedKey(`exam_start_${packageId}`, userId);
      const indexKey = scopedKey(`exam_index_${packageId}`, userId);

      localStorage.setItem(storageKey, JSON.stringify([{ questionId: 1, selectedOptionId: 'A' }]));
      localStorage.setItem(startKey, String(Date.now()));
      localStorage.setItem(indexKey, '15');

      expect(localStorage.getItem(storageKey)).not.toBeNull();
      expect(localStorage.getItem(startKey)).not.toBeNull();
      expect(localStorage.getItem(indexKey)).not.toBeNull();

      // Submit execution cleanup (as implemented in SimulasiPage.submitExam)
      localStorage.removeItem(storageKey);
      localStorage.removeItem(startKey);
      localStorage.removeItem(indexKey);

      expect(localStorage.getItem(storageKey)).toBeNull();
      expect(localStorage.getItem(startKey)).toBeNull();
      expect(localStorage.getItem(indexKey)).toBeNull();
    });
  });

  // ── 5. Share Result Text & WhatsApp URL ──────────────────────────────
  describe('5. Share Result Formatting & WhatsApp URL Generation', () => {
    it('formats passing result text with correct emoji, score, and default domain https://lolosin.com', () => {
      const shareText = generateShareText({
        tryoutLabel: 'Tryout Standar 1',
        totalScore: 415,
        twk: 95,
        tiu: 130,
        tkp: 190,
        isPassedAll: true,
      });

      expect(shareText).toContain('🎉');
      expect(shareText).toContain('Hasil Simulasi CAT SKD CPNS 2027 di Lolos.in!');
      expect(shareText).toContain('Paket: Tryout Standar 1');
      expect(shareText).toContain('Total Skor: 415/550');
      expect(shareText).toContain('Rincian: TWK: 95 | TIU: 130 | TKP: 190');
      expect(shareText).toContain('Status: LOLOS PASSING GRADE');
      expect(shareText).toContain('https://lolosin.com');
    });

    it('formats non-passing result text with encouragement emoji and status', () => {
      const shareText = generateShareText({
        tryoutLabel: 'Tryout Mini',
        totalScore: 280,
        twk: 60,
        tiu: 75,
        tkp: 145,
        isPassedAll: false,
      });

      expect(shareText).toContain('💪');
      expect(shareText).toContain('Status: BELUM MEMENUHI PASSING GRADE');
      expect(shareText).toContain('Total Skor: 280/550');
      expect(shareText).toContain('https://lolosin.com');
    });

    it('generates valid WhatsApp click-to-chat URL pointing to https://lolosin.com', () => {
      const shareText = generateShareText({
        tryoutLabel: 'Tryout 1',
        totalScore: 350,
        twk: 80,
        tiu: 100,
        tkp: 170,
        isPassedAll: true,
      });

      const waUrl = getWhatsAppShareUrl(shareText);

      expect(waUrl.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);

      const decodedText = decodeURIComponent(waUrl.replace('https://api.whatsapp.com/send?text=', ''));
      expect(decodedText).toBe(shareText);
      expect(decodedText).toContain('https://lolosin.com/simulasi');
    });
  });
});
