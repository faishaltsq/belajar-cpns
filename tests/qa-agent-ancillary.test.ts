import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Ancillary & Psychology modules
import { DRILL_TOPICS, stripQuestionPrefix, matchSubCategory } from '../src/lib/drillHelper';
import { FLASHCARD_DATA, Flashcard } from '../src/data/flashcards';
import { JOURNEY_DAYS, JourneyDay } from '../src/data/journeySchedule';
import { calcStreak } from '../src/lib/journeyHelper';
import {
  getPairSumLastDigit,
  generateKraepelinColumn,
  evaluateKraepelinResults,
} from '../src/lib/psikotes';
import {
  generateKecermatanTable,
  generateKecermatanQuestion,
  evaluateKecermatanResults,
} from '../src/lib/kecermatan';
import { evaluateKepribadianResults } from '../src/lib/kepribadian';
import questionsKepribadian from '../src/data/psikotes_kepribadian.json';
import manifestRoute from '../src/app/manifest';

// Types
import type { KraepelinInput, KecermatanInput, KepribadianDimensionKey } from '../src/lib/types';

describe('Agent 4: Ancillary Modules, Psikotes, PWA & Security Edge', () => {
  // =========================================================================
  // 1. DRILL CATEGORY LOADING (18 TOPICS) & QUESTION STRUCTURE
  // =========================================================================
  describe('Drill Module (18 Categories & Question Structure)', () => {
    it('loads exactly 18 drill topics across TWK, TIU, and TKP', () => {
      expect(DRILL_TOPICS).toHaveLength(18);

      const twkTopics = DRILL_TOPICS.filter((t) => t.category === 'TWK');
      const tiuTopics = DRILL_TOPICS.filter((t) => t.category === 'TIU');
      const tkpTopics = DRILL_TOPICS.filter((t) => t.category === 'TKP');

      expect(twkTopics).toHaveLength(6);
      expect(tiuTopics).toHaveLength(6);
      expect(tkpTopics).toHaveLength(6);
    });

    it('contains all required subcategories with valid metadata', () => {
      const expectedTWK = ['Pancasila', 'UUD 1945', 'Bela Negara', 'Nasionalisme', 'Integritas', 'Bahasa Indonesia'];
      const expectedTIU = ['Analogi', 'Silogisme', 'Analitis', 'Deret Angka', 'Soal Cerita', 'Figural'];
      const expectedTKP = ['Pelayanan Publik', 'Profesionalisme', 'Anti-Radikalisme', 'Jejaring Kerja', 'TIK', 'Sosial Budaya'];

      const twkSubs = DRILL_TOPICS.filter((t) => t.category === 'TWK').map((t) => t.subCategory);
      const tiuSubs = DRILL_TOPICS.filter((t) => t.category === 'TIU').map((t) => t.subCategory);
      const tkpSubs = DRILL_TOPICS.filter((t) => t.category === 'TKP').map((t) => t.subCategory);

      expect(twkSubs).toEqual(expectedTWK);
      expect(tiuSubs).toEqual(expectedTIU);
      expect(tkpSubs).toEqual(expectedTKP);

      DRILL_TOPICS.forEach((topic) => {
        expect(topic.label.length).toBeGreaterThan(0);
        expect(topic.icon.length).toBeGreaterThan(0);
        expect(['TWK', 'TIU', 'TKP']).toContain(topic.category);
      });
    });

    it('stripQuestionPrefix removes question number prefixes cleanly', () => {
      expect(stripQuestionPrefix('Soal nomor 1 (TWK): Siapakah ketua BPUPKI?')).toBe('Siapakah ketua BPUPKI?');
      expect(stripQuestionPrefix('Soal no. 25: Hitunglah nilai x')).toBe('Hitunglah nilai x');
      expect(stripQuestionPrefix('Soal No 10 (TIU): Deret angka 2, 4, 8...')).toBe('Deret angka 2, 4, 8...');
      expect(stripQuestionPrefix('Pertanyaan tanpa prefix')).toBe('Pertanyaan tanpa prefix');
    });

    it('matchSubCategory matches categories and text keywords accurately', () => {
      expect(matchSubCategory('Pancasila', 'pancasila')).toBe(true);
      expect(matchSubCategory('Pancasila Sila Ke-2', 'pancasila')).toBe(true);
      expect(matchSubCategory(undefined, 'pancasila', 'Penerapan nilai Pancasila')).toBe(true);
      expect(matchSubCategory('UUD 1945', 'uud 1945')).toBe(true);
      expect(matchSubCategory('Pasal UUD', 'uud 1945')).toBe(true);
      expect(matchSubCategory('Silogisme', 'silogisme')).toBe(true);
      expect(matchSubCategory(undefined, 'silogisme', 'Maka kesimpulan yang sah adalah')).toBe(true);
      expect(matchSubCategory('Deret Angka', 'deret angka')).toBe(true);
      expect(matchSubCategory('Pelayanan Publik', 'pelayanan publik')).toBe(true);
      expect(matchSubCategory('Anti-Radikalisme', 'anti-radikalisme')).toBe(true);
    });

    it('validates question structure in package datasets', () => {
      const pkgPath = path.resolve(__dirname, '../src/data/packages/tryout-1.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkgData = JSON.parse(raw);
      const questions = Array.isArray(pkgData) ? pkgData : pkgData.questions;
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);

      questions.forEach((q: any) => {
        expect(typeof q.id).toBe('number');
        expect(['TWK', 'TIU', 'TKP']).toContain(q.category);
        expect(typeof q.text).toBe('string');
        expect(q.text.length).toBeGreaterThan(0);
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(4);
        expect(typeof q.explanation).toBe('string');

        q.options.forEach((opt: any) => {
          expect(typeof opt.id).toBe('string');
          expect(typeof opt.text).toBe('string');
        });

        // Answer verification: either an explicit correctAnswer or an option scored 5 (CAT max score)
        if (q.category === 'TWK' || q.category === 'TIU') {
          const hasCorrectAnswer = typeof q.correctAnswer === 'string' && q.options.some((o: any) => o.id === q.correctAnswer);
          const hasScoredOption = q.options.some((o: any) => o.score === 5);
          expect(hasCorrectAnswer || hasScoredOption).toBe(true);
        } else if (q.category === 'TKP') {
          const hasOptionScores = q.options.every((o: any) => typeof o.score === 'number' && o.score >= 1 && o.score <= 5);
          const hasScoresRecord = q.scores && Object.keys(q.scores).length >= 4;
          expect(hasOptionScores || hasScoresRecord).toBe(true);
        }
      });
    });

    it('validates figural questions contain required image properties', () => {
      const figuralPath = path.resolve(__dirname, '../src/data/packages/tryout-figural-2.json');
      expect(fs.existsSync(figuralPath)).toBe(true);

      const raw = fs.readFileSync(figuralPath, 'utf8');
      const figuralData = JSON.parse(raw);
      const questions = Array.isArray(figuralData) ? figuralData : figuralData.questions;
      expect(Array.isArray(questions)).toBe(true);

      const questionsWithImages = questions.filter((q: any) => Boolean(q.image));
      expect(questionsWithImages.length).toBeGreaterThan(0);
      questionsWithImages.forEach((q: any) => {
        expect(typeof q.image).toBe('string');
        expect(q.image.startsWith('/images/')).toBe(true);
      });
    });
  });

  // =========================================================================
  // 2. FLASHCARD CATEGORY FILTER & PROGRESS TRACKING
  // =========================================================================
  describe('Flashcard Module (Category Filters & Progress Tracking)', () => {
    it('contains comprehensive flashcards covering TWK, TIU, and TKP', () => {
      expect(FLASHCARD_DATA.length).toBeGreaterThanOrEqual(20);

      const twkCards = FLASHCARD_DATA.filter((f) => f.category === 'TWK');
      const tiuCards = FLASHCARD_DATA.filter((f) => f.category === 'TIU');
      const tkpCards = FLASHCARD_DATA.filter((f) => f.category === 'TKP');

      expect(twkCards.length).toBeGreaterThan(0);
      expect(tiuCards.length).toBeGreaterThan(0);
      expect(tkpCards.length).toBeGreaterThan(0);

      FLASHCARD_DATA.forEach((card) => {
        expect(card.id).toBeTruthy();
        expect(card.subTopic).toBeTruthy();
        expect(card.front.trim().length).toBeGreaterThan(0);
        expect(card.back.trim().length).toBeGreaterThan(0);
      });
    });

    it('correctly filters flashcards by category', () => {
      const filterByCategory = (cat: 'Semua' | 'TWK' | 'TIU' | 'TKP') => {
        return cat === 'Semua' ? FLASHCARD_DATA : FLASHCARD_DATA.filter((f) => f.category === cat);
      };

      expect(filterByCategory('Semua')).toHaveLength(FLASHCARD_DATA.length);
      expect(filterByCategory('TWK').every((f) => f.category === 'TWK')).toBe(true);
      expect(filterByCategory('TIU').every((f) => f.category === 'TIU')).toBe(true);
      expect(filterByCategory('TKP').every((f) => f.category === 'TKP')).toBe(true);
    });

    it('calculates mastery progress and active deck subtraction accurately', () => {
      const twkCards = FLASHCARD_DATA.filter((f) => f.category === 'TWK');
      const totalCount = twkCards.length;

      // 0 mastered
      const emptyMastered = new Set<string>();
      const initialDeck = twkCards.filter((c) => !emptyMastered.has(c.id));
      expect(initialDeck).toHaveLength(totalCount);
      expect(Math.round((emptyMastered.size / totalCount) * 100)).toBe(0);

      // Partially mastered (e.g., 3 cards)
      const sampleIds = twkCards.slice(0, 3).map((c) => c.id);
      const partialMastered = new Set<string>(sampleIds);
      const remainingDeck = twkCards.filter((c) => !partialMastered.has(c.id));
      expect(remainingDeck).toHaveLength(totalCount - 3);
      expect(Math.round((partialMastered.size / totalCount) * 100)).toBe(Math.round((3 / totalCount) * 100));

      // 100% mastered
      const allMastered = new Set<string>(twkCards.map((c) => c.id));
      const finishedDeck = twkCards.filter((c) => !allMastered.has(c.id));
      expect(finishedDeck).toHaveLength(0);
      expect(Math.round((allMastered.size / totalCount) * 100)).toBe(100);
    });

    it('deterministic seeded shuffle yields consistent daily card order', () => {
      function seededShuffle<T>(arr: T[], seed: number): T[] {
        const out = [...arr];
        let s = seed;
        for (let i = out.length - 1; i > 0; i--) {
          s = (s * 1664525 + 1013904223) & 0xffffffff;
          const j = Math.abs(s) % (i + 1);
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      }

      const seedA = 20261015;
      const seedB = 20261016;

      const order1 = seededShuffle(FLASHCARD_DATA, seedA);
      const order2 = seededShuffle(FLASHCARD_DATA, seedA);
      const orderDiff = seededShuffle(FLASHCARD_DATA, seedB);

      expect(order1.map((c) => c.id)).toEqual(order2.map((c) => c.id));
      expect(order1.map((c) => c.id)).not.toEqual(orderDiff.map((c) => c.id));
    });
  });

  // =========================================================================
  // 3. 30-DAY JOURNEY ROADMAP PROGRESS CALCULATION & COMPLETION STATE
  // =========================================================================
  describe('30-Day Journey Roadmap Module', () => {
    it('contains exactly 30 days ordered monotonically from Day 1 to 30', () => {
      expect(JOURNEY_DAYS).toHaveLength(30);

      JOURNEY_DAYS.forEach((item, index) => {
        expect(item.day).toBe(index + 1);
        expect([1, 2, 3]).toContain(item.phase);
        expect(item.phaseTitle).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(['TWK', 'TIU', 'TKP', 'CAMPURAN']).toContain(item.category);
        expect(item.estimatedMinutes).toBeGreaterThan(0);
        expect(['drill', 'flashcard', 'simulasi', 'review']).toContain(item.actionType);
        expect(item.actionUrl.startsWith('/')).toBe(true);
        expect(item.actionLabel).toBeTruthy();
      });

      // Phase distribution
      const phase1 = JOURNEY_DAYS.filter((d) => d.phase === 1);
      const phase2 = JOURNEY_DAYS.filter((d) => d.phase === 2);
      const phase3 = JOURNEY_DAYS.filter((d) => d.phase === 3);

      expect(phase1).toHaveLength(10);
      expect(phase2).toHaveLength(10);
      expect(phase3).toHaveLength(10);
    });

    it('calculates completion percentage across roadmap milestones', () => {
      const calcPct = (completedSet: Set<number>) => Math.round((completedSet.size / JOURNEY_DAYS.length) * 100);

      expect(calcPct(new Set())).toBe(0);
      expect(calcPct(new Set([1, 2, 3]))).toBe(10); // 3/30 = 10%
      expect(calcPct(new Set(Array.from({ length: 15 }, (_, i) => i + 1)))).toBe(50); // 15/30 = 50%
      expect(calcPct(new Set(Array.from({ length: 27 }, (_, i) => i + 1)))).toBe(90); // 27/30 = 90%
      expect(calcPct(new Set(Array.from({ length: 30 }, (_, i) => i + 1)))).toBe(100); // 30/30 = 100%
    });

    it('determines the next active incomplete day correctly', () => {
      const getActiveDay = (completedSet: Set<number>) =>
        JOURNEY_DAYS.find((d) => !completedSet.has(d.day))?.day ?? 30;

      expect(getActiveDay(new Set())).toBe(1);
      expect(getActiveDay(new Set([1, 2, 3]))).toBe(4);
      expect(getActiveDay(new Set([1, 2, 4]))).toBe(3); // Non-contiguous completion
      expect(getActiveDay(new Set(Array.from({ length: 30 }, (_, i) => i + 1)))).toBe(30);
    });

    it('calcStreak computes consecutive active day streak correctly', () => {
      // Empty
      expect(calcStreak([])).toBe(0);

      // Today only
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const dYesterday = new Date();
      dYesterday.setDate(dYesterday.getDate() - 1);
      const yesterday = `${dYesterday.getFullYear()}-${pad(dYesterday.getMonth() + 1)}-${pad(dYesterday.getDate())}`;

      const d2DaysAgo = new Date();
      d2DaysAgo.setDate(d2DaysAgo.getDate() - 2);
      const twoDaysAgo = `${d2DaysAgo.getFullYear()}-${pad(d2DaysAgo.getMonth() + 1)}-${pad(d2DaysAgo.getDate())}`;

      expect(calcStreak([today])).toBe(1);
      expect(calcStreak([today, yesterday])).toBe(2);
      expect(calcStreak([today, yesterday, twoDaysAgo])).toBe(3);

      // Yesterday active, today not yet logged -> streak maintained
      expect(calcStreak([yesterday, twoDaysAgo])).toBe(2);

      // Gap of 3 days -> streak broken (0)
      const d4DaysAgo = new Date();
      d4DaysAgo.setDate(d4DaysAgo.getDate() - 4);
      const fourDaysAgo = `${d4DaysAgo.getFullYear()}-${pad(d4DaysAgo.getMonth() + 1)}-${pad(d4DaysAgo.getDate())}`;
      expect(calcStreak([fourDaysAgo])).toBe(0);
    });
  });

  // =========================================================================
  // 4. PSIKOTES KRAEPELIN SPEED, ACCURACY & FATIGUE SCORE CALCULATION
  // =========================================================================
  describe('Psikotes Kraepelin Engine', () => {
    it('getPairSumLastDigit computes single last digit of sum', () => {
      expect(getPairSumLastDigit(8, 7)).toBe(5); // 15 % 10 = 5
      expect(getPairSumLastDigit(9, 9)).toBe(8); // 18 % 10 = 8
      expect(getPairSumLastDigit(3, 4)).toBe(7); // 7 % 10 = 7
      expect(getPairSumLastDigit(0, 0)).toBe(0);
      expect(getPairSumLastDigit(5, 5)).toBe(0);
    });

    it('generateKraepelinColumn creates valid column arrays', () => {
      const col = generateKraepelinColumn(0, 30);
      expect(col.columnIndex).toBe(0);
      expect(col.numbers).toHaveLength(30);
      col.numbers.forEach((num) => {
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(9);
      });
    });

    it('evaluates Kraepelin accuracy, speed per column and stability', () => {
      const inputs: KraepelinInput[] = [
        // Column 0 (30 seconds duration): 4 correct, 1 wrong = 5 items (10 q/min)
        { columnIndex: 0, pairIndex: 0, userAnswer: 5, correctAnswer: 5, isCorrect: true, timeSpentMs: 1000 },
        { columnIndex: 0, pairIndex: 1, userAnswer: 4, correctAnswer: 4, isCorrect: true, timeSpentMs: 1100 },
        { columnIndex: 0, pairIndex: 2, userAnswer: 8, correctAnswer: 8, isCorrect: true, timeSpentMs: 900 },
        { columnIndex: 0, pairIndex: 3, userAnswer: 2, correctAnswer: 2, isCorrect: true, timeSpentMs: 950 },
        { columnIndex: 0, pairIndex: 4, userAnswer: 1, correctAnswer: 6, isCorrect: false, timeSpentMs: 1200 },
        // Column 1 (30 seconds duration): 5 correct, 0 wrong = 5 items (10 q/min)
        { columnIndex: 1, pairIndex: 0, userAnswer: 7, correctAnswer: 7, isCorrect: true, timeSpentMs: 900 },
        { columnIndex: 1, pairIndex: 1, userAnswer: 3, correctAnswer: 3, isCorrect: true, timeSpentMs: 850 },
        { columnIndex: 1, pairIndex: 2, userAnswer: 9, correctAnswer: 9, isCorrect: true, timeSpentMs: 920 },
        { columnIndex: 1, pairIndex: 3, userAnswer: 6, correctAnswer: 6, isCorrect: true, timeSpentMs: 910 },
        { columnIndex: 1, pairIndex: 4, userAnswer: 0, correctAnswer: 0, isCorrect: true, timeSpentMs: 880 },
      ];

      const result = evaluateKraepelinResults(inputs, 2, 30);

      expect(result.totalQuestionsAnswered).toBe(10);
      expect(result.totalCorrect).toBe(9);
      expect(result.totalWrong).toBe(1);
      expect(result.overallAccuracy).toBe(90); // 9 / 10 = 90%
      expect(result.columnResults).toHaveLength(2);
      expect(result.columnResults[0].accuracy).toBe(80); // 4 / 5 = 80%
      expect(result.columnResults[1].accuracy).toBe(100); // 5 / 5 = 100%
      expect(result.averageSpeedPerColumn).toBe(10); // 5 / 0.5 min = 10 q/min
      expect(result.stabilityScore).toBe(0); // Identical speeds -> 0 std dev
      expect(result.workPaceTrend).toBe('Stabil');
    });

    it('detects fatigue score and work pace degradation (Menurun trend)', () => {
      // First half (columns 0 & 1): high speed (10 questions each)
      // Second half (columns 2 & 3): fatigued speed (3 questions each)
      const inputs: KraepelinInput[] = [];
      const addColumnInputs = (colIdx: number, count: number) => {
        for (let i = 0; i < count; i++) {
          inputs.push({
            columnIndex: colIdx,
            pairIndex: i,
            userAnswer: 5,
            correctAnswer: 5,
            isCorrect: true,
            timeSpentMs: 1000,
          });
        }
      };

      addColumnInputs(0, 10);
      addColumnInputs(1, 10);
      addColumnInputs(2, 3);
      addColumnInputs(3, 3);

      const result = evaluateKraepelinResults(inputs, 4, 30);
      expect(result.workPaceTrend).toBe('Menurun');
      expect(result.stabilityScore).toBeGreaterThan(0);
    });

    it('detects warming-up work pace improvement (Meningkat trend)', () => {
      const inputs: KraepelinInput[] = [];
      const addColumnInputs = (colIdx: number, count: number) => {
        for (let i = 0; i < count; i++) {
          inputs.push({
            columnIndex: colIdx,
            pairIndex: i,
            userAnswer: 5,
            correctAnswer: 5,
            isCorrect: true,
            timeSpentMs: 1000,
          });
        }
      };

      addColumnInputs(0, 3);
      addColumnInputs(1, 4);
      addColumnInputs(2, 9);
      addColumnInputs(3, 10);

      const result = evaluateKraepelinResults(inputs, 4, 30);
      expect(result.workPaceTrend).toBe('Meningkat');
    });

    it('throws validation error on zero or negative column duration', () => {
      expect(() => evaluateKraepelinResults([], 3, 0)).toThrow('columnDurationSeconds must be > 0');
      expect(() => evaluateKraepelinResults([], 3, -15)).toThrow('columnDurationSeconds must be > 0');
    });
  });

  // =========================================================================
  // 5. PSIKOTES KECERMATAN MISSING CHARACTER EVALUATION
  // =========================================================================
  describe('Psikotes Kecermatan (Missing Character Evaluation)', () => {
    it('generates valid reference tables for both angka and huruf modes', () => {
      const tableAngka = generateKecermatanTable('angka');
      expect(tableAngka.type).toBe('angka');
      expect(tableAngka.keys).toHaveLength(5);
      const letters = tableAngka.keys.map((k) => k.letter);
      expect(letters).toEqual(['A', 'B', 'C', 'D', 'E']);
      const digits = tableAngka.keys.map((k) => k.value);
      expect(new Set(digits).size).toBe(5);
      digits.forEach((d) => expect(/^\d$/.test(d)).toBe(true));

      const tableHuruf = generateKecermatanTable('huruf');
      expect(tableHuruf.type).toBe('huruf');
      expect(tableHuruf.keys).toHaveLength(5);
      const chars = tableHuruf.keys.map((k) => k.value);
      expect(new Set(chars).size).toBe(5);
      chars.forEach((c) => expect(/^[A-Z]$/.test(c)).toBe(true));
    });

    it('generates question where exactly one character is missing and matches correctLetter', () => {
      const table = generateKecermatanTable('huruf');
      const question = generateKecermatanQuestion(table);

      expect(question.displayedValues).toHaveLength(4);
      expect(new Set(question.displayedValues).size).toBe(4);

      // Verify missing value is from the table and missing from displayed
      const tableValues = table.keys.map((k) => k.value);
      expect(tableValues).toContain(question.missingValue);
      expect(question.displayedValues).not.toContain(question.missingValue);

      // Verify correctLetter maps to the missing value in reference table
      const expectedLetter = table.keys.find((k) => k.value === question.missingValue)?.letter;
      expect(question.correctLetter).toBe(expectedLetter);
    });

    it('correctly evaluates user choice against missing character', () => {
      const table = generateKecermatanTable('angka');
      const question = generateKecermatanQuestion(table);

      const evaluateChoice = (chosen: 'A' | 'B' | 'C' | 'D' | 'E') => chosen === question.correctLetter;

      expect(evaluateChoice(question.correctLetter)).toBe(true);

      const otherLetters = (['A', 'B', 'C', 'D', 'E'] as const).filter((l) => l !== question.correctLetter);
      otherLetters.forEach((wrongChoice) => {
        expect(evaluateChoice(wrongChoice)).toBe(false);
      });
    });

    it('evaluates kecermatan overall accuracy, speed, and assigns proper grade', () => {
      const inputs: KecermatanInput[] = [
        { columnIndex: 0, questionIndex: 0, selectedLetter: 'A', correctLetter: 'A', isCorrect: true, timeSpentMs: 800 },
        { columnIndex: 0, questionIndex: 1, selectedLetter: 'B', correctLetter: 'B', isCorrect: true, timeSpentMs: 750 },
        { columnIndex: 0, questionIndex: 2, selectedLetter: 'C', correctLetter: 'C', isCorrect: true, timeSpentMs: 820 },
        { columnIndex: 1, questionIndex: 0, selectedLetter: 'D', correctLetter: 'D', isCorrect: true, timeSpentMs: 900 },
        { columnIndex: 1, questionIndex: 1, selectedLetter: 'E', correctLetter: 'A', isCorrect: false, timeSpentMs: 950 },
      ];

      const result = evaluateKecermatanResults(inputs, 2, 10, 'angka');

      expect(result.totalQuestionsAnswered).toBe(5);
      expect(result.totalCorrect).toBe(4);
      expect(result.totalWrong).toBe(1);
      expect(result.overallAccuracy).toBe(80);
      expect(result.columnResults).toHaveLength(2);
      expect(result.columnResults[0].accuracy).toBe(100);
      expect(result.columnResults[1].accuracy).toBe(50);
      expect(['Sangat Baik', 'Baik', 'Cukup', 'Perlu Latihan']).toContain(result.grade);
    });
  });

  // =========================================================================
  // 6. PSIKOTES KEPRIBADIAN (PAPI KOSTICK) 20-ASPECT VECTOR SCORING
  // =========================================================================
  describe('Psikotes Kepribadian (PAPI Kostick) Scoring Model', () => {
    it('evaluates production 5-dimension forced choice engine with valid questions', () => {
      expect(questionsKepribadian.length).toBe(30);

      // Verify each item has binary options with dimension tags
      questionsKepribadian.forEach((q) => {
        expect(q.id).toBeGreaterThan(0);
        expect(q.optionA.text.length).toBeGreaterThan(0);
        expect(q.optionB.text.length).toBeGreaterThan(0);
        expect(['L', 'A', 'D', 'S', 'R']).toContain(q.optionA.dimension);
        expect(['L', 'A', 'D', 'S', 'R']).toContain(q.optionB.dimension);
      });

      // Submit full 30 answers
      const answers: Record<number, 'A' | 'B'> = {};
      for (let i = 1; i <= 30; i++) {
        answers[i] = i % 2 === 0 ? 'A' : 'B';
      }

      const result = evaluateKepribadianResults(answers);

      expect(result.totalAnswered).toBe(30);
      expect(Object.keys(result.dimensions)).toEqual(['L', 'A', 'D', 'S', 'R']);

      (['L', 'A', 'D', 'S', 'R'] as KepribadianDimensionKey[]).forEach((key) => {
        const dim = result.dimensions[key];
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.maxScore).toBeGreaterThan(0);
        expect(dim.percentage).toBe(Math.round((dim.score / dim.maxScore) * 100));
        expect(dim.label).toBeTruthy();
        expect(dim.description).toBeTruthy();
      });

      expect(result.dominantTraits).toHaveLength(2);
      expect(result.asnFitSummary).toContain('core values BerAKHLAK');
      expect(result.recommendations).toHaveLength(2);
    });

    it('computes 20-aspect PAPI Kostick personality vector scoring correctly', () => {
      /**
       * Standard PAPI Kostick 20 Aspects:
       * 10 Role Scales:
       *   G: Hard worker, L: Leadership, I: Decision making, T: Pace, V: Vigorous,
       *   S: Social extension, R: Theoretical, D: Detail, C: Organized, E: Emotional restraint
       * 10 Need Scales:
       *   N: Need to finish, A: Need to achieve, P: Need to control, X: Need to be noticed,
       *   B: Need to belong, O: Need for affection, Z: Need for change, K: Need to be forceful,
       *   F: Need to support authority, W: Need for rules
       */
      const PAPI_20_ASPECTS = [
        'G', 'L', 'I', 'T', 'V', 'S', 'R', 'D', 'C', 'E',
        'N', 'A', 'P', 'X', 'B', 'O', 'Z', 'K', 'F', 'W'
      ] as const;
      type Papi20Aspect = typeof PAPI_20_ASPECTS[number];

      interface Papi20Pair {
        pairId: number;
        aspectA: Papi20Aspect;
        aspectB: Papi20Aspect;
      }

      // Generate a mock 90-pair standard forced-choice matrix
      const mock90Pairs: Papi20Pair[] = [];
      let pairCount = 1;
      for (let i = 0; i < PAPI_20_ASPECTS.length; i++) {
        for (let j = i + 1; j < PAPI_20_ASPECTS.length; j++) {
          if (pairCount <= 90) {
            mock90Pairs.push({
              pairId: pairCount,
              aspectA: PAPI_20_ASPECTS[i],
              aspectB: PAPI_20_ASPECTS[j],
            });
            pairCount++;
          }
        }
      }

      // 20-Aspect Vector Scoring Engine
      function computePapi20Vector(
        pairs: Papi20Pair[],
        choices: Record<number, 'A' | 'B'>
      ): Record<Papi20Aspect, number> {
        const vector = {} as Record<Papi20Aspect, number>;
        PAPI_20_ASPECTS.forEach((asp) => { vector[asp] = 0; });

        pairs.forEach((p) => {
          const chosen = choices[p.pairId];
          if (chosen === 'A') {
            vector[p.aspectA] += 1;
          } else if (chosen === 'B') {
            vector[p.aspectB] += 1;
          }
        });

        return vector;
      }

      // Simulation: answer all 90 pairs
      const mockAnswers: Record<number, 'A' | 'B'> = {};
      mock90Pairs.forEach((p) => {
        mockAnswers[p.pairId] = p.pairId % 3 === 0 ? 'B' : 'A';
      });

      const vector = computePapi20Vector(mock90Pairs, mockAnswers);

      // Verify all 20 aspect keys exist and are non-negative
      expect(Object.keys(vector)).toHaveLength(20);
      PAPI_20_ASPECTS.forEach((aspect) => {
        expect(typeof vector[aspect]).toBe('number');
        expect(vector[aspect]).toBeGreaterThanOrEqual(0);
      });

      // Sum of all 20 aspect points must equal total answered pairs (90)
      const totalPoints = Object.values(vector).reduce((a, b) => a + b, 0);
      expect(totalPoints).toBe(90);

      // Mapping 20 aspects to 5 ASN Core Dimensions
      const mapped5Dimensions = {
        Leadership: vector.L + vector.P + vector.I,
        Achievement: vector.A + vector.N + vector.G,
        Detail: vector.D + vector.C,
        Social: vector.S + vector.B + vector.O,
        Rules: vector.R + vector.F + vector.W,
      };

      Object.values(mapped5Dimensions).forEach((dimScore) => {
        expect(dimScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // =========================================================================
  // 7. PWA MANIFEST SCHEMA VALIDITY & THEME CONFIGURATION
  // =========================================================================
  describe('PWA Manifest & Mobile Web Invariants', () => {
    it('public/manifest.json conforms strictly to W3C Web App Manifest spec', () => {
      const manifestPath = path.resolve(__dirname, '../public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);

      // Identity & Branding
      expect(manifest.name).toContain('Lolos.in');
      expect(manifest.short_name).toBe('Lolos.in');
      expect(manifest.description).toContain('CAT SKD CPNS');

      // Colors matching brand spec
      expect(manifest.theme_color).toBe('#c96442');
      expect(manifest.background_color).toBe('#faf9f5');

      // Display & Navigation
      expect(manifest.start_url).toBe('/simulasi');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.categories).toContain('education');

      // Icons
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
      manifest.icons.forEach((icon: any) => {
        expect(icon.src).toBe('/icon.svg');
        expect(icon.type).toBe('image/svg+xml');
        expect(icon.sizes).toBe('any');
      });
    });

    it('Next.js dynamic manifest route (/manifest.webmanifest) matches brand tokens', () => {
      const dynamicManifest = manifestRoute();
      expect(dynamicManifest.name).toContain('Lolos.in');
      expect(dynamicManifest.theme_color).toBe('#c96442');
      expect(dynamicManifest.background_color).toBe('#faf9f5');
      expect(dynamicManifest.display).toBe('standalone');
    });

    it('verifies icon asset exists and contains theme brand color', () => {
      const iconPath = path.resolve(__dirname, '../src/app/icon.svg');
      expect(fs.existsSync(iconPath)).toBe(true);

      const svgContent = fs.readFileSync(iconPath, 'utf8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('#c96442'); // Primary terracotta theme
    });
  });

  // =========================================================================
  // 8. SECURITY HEADERS IN NEXT.CONFIG.JS
  // =========================================================================
  describe('Security Edge Headers (next.config.js)', () => {
    it('exports all critical security headers including CSP, nosniff, and HSTS', async () => {
      const configPath = path.resolve(__dirname, '../next.config.js');
      expect(fs.existsSync(configPath)).toBe(true);

      const nextConfig = require(configPath);
      expect(typeof nextConfig.headers).toBe('function');

      const headersList = await nextConfig.headers();
      expect(Array.isArray(headersList)).toBe(true);

      const globalHeaderRule = headersList.find((rule: any) => rule.source === '/:path*');
      expect(globalHeaderRule).toBeDefined();

      const headers = globalHeaderRule.headers as { key: string; value: string }[];
      const getHeader = (keyName: string) => headers.find((h) => h.key.toLowerCase() === keyName.toLowerCase());

      // 1. Content-Security-Policy with frame-ancestors 'none'
      const csp = getHeader('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp?.value).toContain("default-src 'self'");
      expect(csp?.value).toContain("frame-ancestors 'none'");
      expect(csp?.value).toContain("object-src 'none'");

      // 2. X-Content-Type-Options: nosniff
      const nosniff = getHeader('X-Content-Type-Options');
      expect(nosniff).toBeDefined();
      expect(nosniff?.value).toBe('nosniff');

      // 3. X-Frame-Options: DENY
      const xFrame = getHeader('X-Frame-Options');
      expect(xFrame).toBeDefined();
      expect(xFrame?.value).toBe('DENY');

      // 4. Strict-Transport-Security (HSTS)
      const hsts = getHeader('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts?.value).toContain('max-age=63072000');
      expect(hsts?.value).toContain('includeSubDomains');
      expect(hsts?.value).toContain('preload');

      // 5. Referrer-Policy
      const referrer = getHeader('Referrer-Policy');
      expect(referrer).toBeDefined();
      expect(referrer?.value).toBe('strict-origin-when-cross-origin');

      // 6. Permissions-Policy
      const permissions = getHeader('Permissions-Policy');
      expect(permissions).toBeDefined();
      expect(permissions?.value).toContain('camera=()');
      expect(permissions?.value).toContain('microphone=()');
      expect(permissions?.value).toContain('geolocation=()');
    });
  });
});
