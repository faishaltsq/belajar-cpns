# Expand Psychological Assessment (Psikotes) Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Lolos.in's psychological exam suite from two basic exercises into a comprehensive 5-category psychometric battery (Kraepelin, Missing Numbers Kecermatan, Missing Letters Kecermatan, 45-Question Analytical Reasoning, and 5-Dimension Work Style Personality Assessment) with isolated user storage and full analytics.

**Architecture:**
1. Core calculation engines in `src/lib/kecermatan.ts`, `src/lib/kepribadian.ts`, and updated `src/lib/psikotes.ts` handle deterministic randomization, scoring, accuracy, stability variance, and psychological dimension mapping with 100% test coverage.
2. Modular interactive runner pages (`/psikotes/kecermatan-angka`, `/psikotes/kecermatan-huruf`, `/psikotes/penalaran`, `/psikotes/kepribadian`) provide high-performance keyboard-friendly interfaces with real-time feedback and automatic user-scoped local persistence via `src/lib/userStorage.ts`.
3. An upgraded Hub (`/psikotes`) and polymorphic Results View (`/psikotes/hasil?type=...`) deliver deep diagnostic feedback: work speed stability curves, personality radar/bar profiles for ASN job fit, and question-by-question explanations.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `@phosphor-icons/react`, Vitest.

**Spec:** Standard BKN CPNS & BUMN Psychological Battery:
- Tes Kecermatan Angka Hilang (Missing Numbers / 5-key reference table)
- Tes Kecermatan Huruf Hilang (Missing Letters / 5-key reference table)
- Tes Kepribadian Sikap Kerja (PAPI Kostick forced-choice model: Leadership, Achievement, Detail, Sociability, Rule Adherence)
- Tes Penalaran Logika & Spasial (45 questions across 3 curated packages: Number Series, Syllogisms, Spatial Reasoning)
- Tes Koran Kraepelin (Multi-mode durations: Sprint 5-col, Standard 10-col, Real BKN 15-col)

---

## Global Constraints

- Plans must be written in English.
- No government logos (BKN, Garuda, official seals) or overclaims of official government leaks.
- Brand identity: "Lolos.in" text-only, Claude Amber theme (`#faf9f5`, `#c96442`, Outfit font), light mode only.
- Icons from `@phosphor-icons/react` exclusively. No `lucide-react`. No emojis on simulation cards, buttons, or action labels.
- Account isolation: All localStorage data must use `src/lib/userStorage.ts` (`scopedKey`, `getScopedJSON`, `setScopedJSON`) with `lolos_u_<userId>_<feature>` or `lolos_guest_<feature>`.
- Automated test suites in `tests/` must pass with 100% success rate using `vitest run`.
- Zero new external runtime dependencies (use native React + SVG for chart visualizations).

---

## Review Focus

1. **Keyboard listener collisions:** In Kecermatan runners, keyboard inputs (1-5, A-E) must only trigger active inputs and ignore duplicate repeats or inputs during transition pauses.
2. **Deterministic Kecermatan generation:** The 4-item prompt must strictly exclude exactly one item from the 5-item reference table, never pick an item outside the table, and generate non-repeating choices.
3. **Guest vs Authenticated persistence:** Results must save under `scopedKey` so logging in or switching accounts does not bleed test history between users.
4. **Mobile layout responsiveness:** On small touchscreens (<400px), keypad buttons and 5-item reference tables must fit without horizontal scroll or truncated text.
5. **Polymorphic Results rendering:** `/psikotes/hasil` must safely fallback if a user navigates to it without completing a test or with corrupted localStorage.

---

### Task 1: Kecermatan Core Engine (`src/lib/kecermatan.ts`) & Types

**Files:**
- Create: `src/lib/kecermatan.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/kecermatan.test.ts`

**Interfaces:**
- Consumes: None (pure functions).
- Produces:
  - `generateKecermatanTable(type: 'angka' | 'huruf'): KecermatanReferenceTable`
  - `generateKecermatanQuestion(table: KecermatanReferenceTable): KecermatanQuestion`
  - `evaluateKecermatanResults(inputs: KecermatanInput[], totalColumns: number, columnDurationSeconds: number): KecermatanOverallResult`

- [ ] **Step 1: Write the failing test in `tests/kecermatan.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateKecermatanTable,
  generateKecermatanQuestion,
  evaluateKecermatanResults,
} from '../src/lib/kecermatan';
import type { KecermatanInput } from '../src/lib/types';

describe('generateKecermatanTable', () => {
  it('generates 5 distinct digits for angka mode', () => {
    const table = generateKecermatanTable('angka');
    expect(table.keys).toHaveLength(5);
    const options = ['A', 'B', 'C', 'D', 'E'];
    expect(table.keys.map((k) => k.letter)).toEqual(options);
    const values = table.keys.map((k) => k.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(5);
    values.forEach((v) => expect(/^\d$/.test(v)).toBe(true));
  });

  it('generates 5 distinct uppercase letters for huruf mode', () => {
    const table = generateKecermatanTable('huruf');
    expect(table.keys).toHaveLength(5);
    const values = table.keys.map((k) => k.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(5);
    values.forEach((v) => expect(/^[A-Z]$/.test(v)).toBe(true));
  });
});

describe('generateKecermatanQuestion', () => {
  it('generates 4 items with exactly one missing from table', () => {
    const table = generateKecermatanTable('angka');
    const q = generateKecermatanQuestion(table);
    expect(q.displayedValues).toHaveLength(4);
    const tableValues = table.keys.map((k) => k.value);
    
    // Exactly one value from table is missing
    const missing = tableValues.find((v) => !q.displayedValues.includes(v));
    expect(missing).toBeDefined();
    expect(q.correctLetter).toBe(table.keys.find((k) => k.value === missing)?.letter);
  });
});

describe('evaluateKecermatanResults', () => {
  it('calculates accuracy, speed, and stability across columns', () => {
    const inputs: KecermatanInput[] = [
      { columnIndex: 0, questionIndex: 0, selectedLetter: 'A', correctLetter: 'A', isCorrect: true, timeSpentMs: 1200 },
      { columnIndex: 0, questionIndex: 1, selectedLetter: 'B', correctLetter: 'C', isCorrect: false, timeSpentMs: 1100 },
      { columnIndex: 1, questionIndex: 0, selectedLetter: 'D', correctLetter: 'D', isCorrect: true, timeSpentMs: 1000 },
    ];
    const result = evaluateKecermatanResults(inputs, 2, 60);
    expect(result.totalQuestionsAnswered).toBe(3);
    expect(result.totalCorrect).toBe(2);
    expect(result.totalWrong).toBe(1);
    expect(result.overallAccuracy).toBe(67);
    expect(result.columnResults).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npx vitest run tests/kecermatan.test.ts`  
Expected: FAIL with "Cannot find module '../src/lib/kecermatan'"

- [ ] **Step 3: Add type definitions in `src/lib/types.ts`**

Add to `src/lib/types.ts`:
```typescript
export interface KecermatanKeyItem {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  value: string;
}

export interface KecermatanReferenceTable {
  type: 'angka' | 'huruf';
  keys: KecermatanKeyItem[];
}

export interface KecermatanQuestion {
  displayedValues: string[];
  missingValue: string;
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface KecermatanInput {
  columnIndex: number;
  questionIndex: number;
  selectedLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface KecermatanColumnResult {
  columnIndex: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  speedPerMinute: number;
}

export interface KecermatanOverallResult {
  type: 'angka' | 'huruf';
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  averageSpeedPerColumn: number;
  stabilityScore: number;
  columnResults: KecermatanColumnResult[];
  grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Latihan';
}
```

- [ ] **Step 4: Implement `src/lib/kecermatan.ts`**

```typescript
import type {
  KecermatanKeyItem,
  KecermatanReferenceTable,
  KecermatanQuestion,
  KecermatanInput,
  KecermatanColumnResult,
  KecermatanOverallResult,
} from './types';

const LETTERS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
const ALPHABET_POOL = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateKecermatanTable(type: 'angka' | 'huruf'): KecermatanReferenceTable {
  if (type === 'angka') {
    const digits = shuffle(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']).slice(0, 5);
    const keys: KecermatanKeyItem[] = LETTERS.map((letter, i) => ({
      letter,
      value: digits[i],
    }));
    return { type, keys };
  } else {
    const chars = shuffle(ALPHABET_POOL).slice(0, 5);
    const keys: KecermatanKeyItem[] = LETTERS.map((letter, i) => ({
      letter,
      value: chars[i],
    }));
    return { type, keys };
  }
}

export function generateKecermatanQuestion(table: KecermatanReferenceTable): KecermatanQuestion {
  const missingIndex = Math.floor(Math.random() * table.keys.length);
  const missingKey = table.keys[missingIndex];
  const remainingKeys = table.keys.filter((_, i) => i !== missingIndex);
  const displayedValues = shuffle(remainingKeys.map((k) => k.value));

  return {
    displayedValues,
    missingValue: missingKey.value,
    correctLetter: missingKey.letter,
  };
}

export function evaluateKecermatanResults(
  inputs: KecermatanInput[],
  totalColumns: number,
  columnDurationSeconds: number,
  type: 'angka' | 'huruf' = 'angka'
): KecermatanOverallResult {
  if (columnDurationSeconds <= 0) throw new Error('columnDurationSeconds must be > 0');

  const byColumn = new Map<number, KecermatanInput[]>();
  for (const inp of inputs) {
    const arr = byColumn.get(inp.columnIndex) ?? [];
    arr.push(inp);
    byColumn.set(inp.columnIndex, arr);
  }

  const columnResults: KecermatanColumnResult[] = [];
  const speeds: number[] = [];

  for (let ci = 0; ci < totalColumns; ci++) {
    const colInputs = byColumn.get(ci) ?? [];
    const correct = colInputs.filter((i) => i.isCorrect).length;
    const wrong = colInputs.length - correct;
    const accuracy = colInputs.length > 0 ? Math.round((correct / colInputs.length) * 100) : 0;
    const speedPerMinute = Math.round((colInputs.length / (columnDurationSeconds / 60)) * 10) / 10;

    speeds.push(speedPerMinute);
    columnResults.push({
      columnIndex: ci,
      totalAttempts: colInputs.length,
      correctCount: correct,
      wrongCount: wrong,
      accuracy,
      speedPerMinute,
    });
  }

  const totalCorrect = inputs.filter((i) => i.isCorrect).length;
  const totalWrong = inputs.length - totalCorrect;
  const overallAccuracy = inputs.length > 0 ? Math.round((totalCorrect / inputs.length) * 100) : 0;
  const avgSpeed = speeds.length > 0 ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10 : 0;

  const mean = avgSpeed;
  const variance = speeds.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (speeds.length || 1);
  const stabilityScore = Math.round(Math.sqrt(variance) * 100) / 100;

  let grade: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Latihan' = 'Perlu Latihan';
  if (overallAccuracy >= 90 && avgSpeed >= 35) {
    grade = 'Sangat Baik';
  } else if (overallAccuracy >= 80 && avgSpeed >= 25) {
    grade = 'Baik';
  } else if (overallAccuracy >= 65) {
    grade = 'Cukup';
  }

  return {
    type,
    totalQuestionsAnswered: inputs.length,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    averageSpeedPerColumn: avgSpeed,
    stabilityScore,
    columnResults,
    grade,
  };
}
```

- [ ] **Step 5: Run tests and verify PASS**

Run: `cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npx vitest run tests/kecermatan.test.ts`  
Expected: PASS (3 tests passed)

---

### Task 2: PAPI Kostick Personality Engine (`src/lib/kepribadian.ts`) & Question Data

**Files:**
- Create: `src/data/psikotes_kepribadian.json`
- Create: `src/lib/kepribadian.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/kepribadian.test.ts`

**Interfaces:**
- Consumes: `src/data/psikotes_kepribadian.json`
- Produces:
  - `evaluateKepribadianResults(answers: Record<number, 'A' | 'B'>): KepribadianOverallResult`

- [ ] **Step 1: Create `src/data/psikotes_kepribadian.json` with 30 high-yield forced-choice pairs**

Create `src/data/psikotes_kepribadian.json` with structured items evaluating dimensions:
`L` (Leadership), `A` (Achievement), `D` (Detail & Order), `S` (Social & Teamwork), `R` (Rule & Integrity).

- [ ] **Step 2: Write failing test in `tests/kepribadian.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateKepribadianResults } from '../src/lib/kepribadian';

describe('evaluateKepribadianResults', () => {
  it('correctly aggregates scores across the 5 work dimensions', () => {
    const answers: Record<number, 'A' | 'B'> = {
      1: 'A',
      2: 'A',
      3: 'A',
    };
    const result = evaluateKepribadianResults(answers);
    expect(result.dimensions.A.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.D.score).toBeGreaterThanOrEqual(1);
    expect(result.dimensions.R.score).toBeGreaterThanOrEqual(1);
    expect(result.dominantTraits.length).toBeGreaterThan(0);
    expect(result.asnFitSummary).toBeDefined();
  });
});
```

- [ ] **Step 3: Implement `src/lib/kepribadian.ts` and add types in `src/lib/types.ts`**

Add to `src/lib/types.ts`:
```typescript
export type KepribadianDimensionKey = 'L' | 'A' | 'D' | 'S' | 'R';

export interface KepribadianDimensionScore {
  key: KepribadianDimensionKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  description: string;
}

export interface KepribadianOverallResult {
  totalAnswered: number;
  dimensions: Record<KepribadianDimensionKey, KepribadianDimensionScore>;
  dominantTraits: string[];
  asnFitSummary: string;
  recommendations: string[];
}
```

Implement in `src/lib/kepribadian.ts`:
```typescript
import questions from '@/data/psikotes_kepribadian.json';
import type {
  KepribadianDimensionKey,
  KepribadianOverallResult,
  KepribadianDimensionScore,
} from './types';

const DIMENSION_META: Record<KepribadianDimensionKey, { label: string; desc: string }> = {
  L: { label: 'Kepemimpinan & Inisiatif', desc: 'Kemampuan mengambil keputusan, mengarahkan tim, dan proaktif dalam situasi kerja.' },
  A: { label: 'Daya Juang & Prestasi', desc: 'Dorongan untuk bekerja tuntas, pantang menyerah, dan memiliki standar kualitas tinggi.' },
  D: { label: 'Ketelitian & Keteraturan', desc: 'Kecermatan terhadap detail, sistematika kerja rapi, dan konsistensi operasional.' },
  S: { label: 'Kerja Sama & Relasi Sosial', desc: 'Kemampuan komunikasi persuasif, empati, dan keharmonisan relasi lintas unit.' },
  R: { label: 'Kepatuhan & Integritas Regulasi', desc: 'Loyalitas terhadap SOP, etika birokrasi, dan kepatuhan terhadap aturan dinas.' },
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

  const sorted = Object.values(dimensions).sort((a, b) => b.percentage - a.percentage);
  const dominantTraits = sorted.slice(0, 2).map((d) => d.label);

  const asnFitSummary = `Profil Anda menunjukkan kekuatan utama pada ${dominantTraits.join(' dan ')}. Sikap kerja ini sangat selaras dengan tuntutan ASN dalam pelayanan publik yang berorientasi mutu dan akuntabilitas.`;
  const recommendations = [
    `Pertahankan keunggulan pada aspek ${dominantTraits[0]} dalam penugasan berbasis tim.`,
    `Tingkatkan fokus pada aspek ${sorted[sorted.length - 1].label} untuk mengoptimalkan fleksibilitas kerja birokrasi.`,
  ];

  return {
    totalAnswered: Object.keys(answers).length,
    dimensions,
    dominantTraits,
    asnFitSummary,
    recommendations,
  };
}
```

- [ ] **Step 4: Run tests and verify PASS**

Run: `cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npx vitest run tests/kepribadian.test.ts`  
Expected: PASS

---

### Task 3: Expand Reasoning & Spatial Question Bank (`src/data/psikotes_penalaran.json`)

**Files:**
- Create: `src/data/psikotes_penalaran.json`
- Modify: `src/app/psikotes/penalaran/page.tsx`
- Test: `tests/penalaran.test.ts`

**Interfaces:**
- Consumes: None.
- Produces: 45 verified test items divided into:
  - `paket-deret` (15 questions)
  - `paket-silogisme` (15 questions)
  - `paket-spasial` (15 questions)

- [ ] **Step 1: Write test validating question format and answer keys in `tests/penalaran.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import questions from '../src/data/psikotes_penalaran.json';

describe('psikotes_penalaran dataset', () => {
  it('contains at least 45 verified questions', () => {
    expect(questions.length).toBeGreaterThanOrEqual(45);
  });

  it('every question has valid structure, options, exactly one correct answer, and explanation', () => {
    questions.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.category).toMatch(/deret|silogisme|spasial/);
      expect(q.questionText).toBeTruthy();
      expect(q.options).toHaveLength(5);
      const correctOpts = q.options.filter((o: any) => o.score === 1);
      expect(correctOpts).toHaveLength(1);
      expect(q.explanation).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Create `src/data/psikotes_penalaran.json` with 45 realistic CPNS/BUMN questions**

Fill with 15 questions per category (detailed patterns, rational explanations, verified answers).

- [ ] **Step 3: Run test to verify dataset integrity**

Run: `cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npx vitest run tests/penalaran.test.ts`  
Expected: PASS

---

### Task 4: Interactive Kecermatan Test Runners (`/psikotes/kecermatan-angka` & `/psikotes/kecermatan-huruf`)

**Files:**
- Create: `src/components/psikotes/KecermatanTableBar.tsx`
- Create: `src/components/psikotes/KecermatanKeypad.tsx`
- Create: `src/app/psikotes/kecermatan-angka/page.tsx`
- Create: `src/app/psikotes/kecermatan-huruf/page.tsx`

**Interfaces:**
- Consumes: `src/lib/kecermatan.ts`, `src/lib/userStorage.ts`
- Produces:
  - High-speed interactive test runner with countdown, column timers, keyboard handlers (A-E & 1-5), and auto-saving to `setScopedJSON('psikotes_kecermatan_result')`.

- [ ] **Step 1: Create `src/components/psikotes/KecermatanTableBar.tsx`**

Displays the 5-key reference table (`A: value`, `B: value`, etc.) pinned at the top in high-contrast card styling.

- [ ] **Step 2: Create `src/components/psikotes/KecermatanKeypad.tsx`**

Provides 5 buttons (A, B, C, D, E) for click/touch and binds `keydown` for '1'..'5' and 'a'..'e' with active pulse styling.

- [ ] **Step 3: Implement `src/app/psikotes/kecermatan-angka/page.tsx`**

Instantiates `generateKecermatanTable('angka')`, handles 5 columns of 60 seconds each, gathers `KecermatanInput[]`, saves via `setScopedJSON('psikotes_kecermatan_result')`, and redirects to `/psikotes/hasil?type=kecermatan-angka`.

- [ ] **Step 4: Implement `src/app/psikotes/kecermatan-huruf/page.tsx`**

Instantiates `generateKecermatanTable('huruf')` with letter-pool reference keys, routes to `/psikotes/hasil?type=kecermatan-huruf`.

---

### Task 5: Interactive Personality Runner (`/psikotes/kepribadian/page.tsx`)

**Files:**
- Create: `src/app/psikotes/kepribadian/page.tsx`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: `src/data/psikotes_kepribadian.json`, `src/lib/kepribadian.ts`
- Produces:
  - 30-item forced-choice step-by-step runner with progress indicator, review ability, keyboard shortcuts (`ArrowLeft` / `A`, `ArrowRight` / `B`), auto-saving result to `psikotes_kepribadian_result`, redirecting to `/psikotes/hasil?type=kepribadian`.

---

### Task 6: Enhanced Multi-Mode Kraepelin Runner (`/psikotes/kraepelin/page.tsx`)

**Files:**
- Modify: `src/app/psikotes/kraepelin/page.tsx`

**Interfaces:**
- Consumes: `generateKraepelinColumn`, `evaluateKraepelinResults`
- Produces:
  - Pre-start mode picker modal:
    - **Mode Kilat:** 5 kolom × 15s (~1.5m)
    - **Mode Standar:** 10 kolom × 20s (~3.5m)
    - **Mode Tantangan BKN:** 15 kolom × 30s (~7.5m)
  - Configurable duration & column counts based on user selection.

---

### Task 7: Comprehensive Results View (`/psikotes/hasil/page.tsx`) & Hub Revamp (`/psikotes/page.tsx`)

**Files:**
- Create: `src/components/psikotes/KecermatanChart.tsx`
- Create: `src/components/psikotes/PersonalityProfileView.tsx`
- Modify: `src/app/psikotes/hasil/page.tsx`
- Modify: `src/app/psikotes/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: All psikotes result payloads stored in `userStorage.ts`.
- Produces:
  - Rich diagnostics for Kecermatan (speed bar chart per column, accuracy %, stability index).
  - Rich diagnostics for Kepribadian (5-dimension horizontal progress bars, ASN profile fit, recommendations).
  - Categorized Hub with badges and clear CTA buttons across all 5 modules.

- [ ] **Step 1: Implement `KecermatanChart.tsx` with clean SVG polyline and column breakdown table.**
- [ ] **Step 2: Implement `PersonalityProfileView.tsx` with colored dimension bars and trait highlights.**
- [ ] **Step 3: Update `src/app/psikotes/hasil/page.tsx` to handle all query types dynamically.**
- [ ] **Step 4: Update `src/app/psikotes/page.tsx` into 3 categorized sections.**
- [ ] **Step 5: Update `src/app/sitemap.ts` and `src/components/Footer.tsx` with new routes.**

---

## Verification & Quality Gates

Run complete automated test suite and production build:
```bash
# 1. Run all unit tests
cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npm test

# 2. Run Next.js production build check
cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas" && npm run build
```

Expected output:
- Vitest: 24+ test files passed (255+ tests passed).
- Next.js build: Successfully compiled without type errors or broken links.

---

## Risks & Tradeoffs

| Risk | Mitigation |
|---|---|
| Large JSON question dataset bloating bundle | Use Next.js dynamic imports or localized client component imports per page. |
| Browser timer throttling when tab is inactive | Track timestamps via `Date.now() - startTime` instead of relying on `setInterval` tick count alone. |
| User navigation away mid-session | Provide prompt/draft preservation via `userStorage.ts` so users don't lose test progress accidentally. |
| High-speed keystrokes causing accidental double-submit | Add 150ms debounce guard on consecutive keypad input actions. |
