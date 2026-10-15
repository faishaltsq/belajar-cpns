# Audit Findings Report — Agent 3: Core CAT Simulation Engine & Scoring Fidelity

**Date:** 2026-10-15  
**Auditor:** Agent 3 (CAT Simulation Engine & Scoring Fidelity Specialist)  
**Target:** Lolos.in (`https://lolosin.com`) & Local Repository (`belajar-cpns-saas`)  
**Status:** ⚠️ CONDITIONALLY PASSED — Core Engine Verified 100% Compliant; 255 Question Bank Weighting Defects Discovered in Packages 22 & 25–34  

---

## 1. Executive Summary

A comprehensive quality assurance and scoring fidelity audit was performed on the core Computer Assisted Test (CAT) simulation engine, passing grade evaluation logic, draft state recovery, result sharing pipelines, and the complete question bank repository of Lolos.in.

The simulation scoring engine strictly adheres to **Kepmen PANRB No. 321 Tahun 2024** for the Seleksi Kompetensi Dasar (SKD) CPNS:
- **TWK:** 30 questions, binary score (5 for correct, 0 for wrong/unanswered), Passing Grade = 65, Max = 150.
- **TIU:** 35 questions, binary score (5 for correct, 0 for wrong/unanswered), Passing Grade = 80, Max = 175.
- **TKP:** 45 questions, graded scale (1 to 5 per option, 0 for unanswered), Passing Grade = 166, Max = 225.
- **Total Standard:** 110 questions, Passing Grade Sum = 311, Max Score = 550, Duration = 100 minutes (6,000s).

A test suite of 21 tests was implemented in `tests/qa-agent-exam-engine.test.ts`. All 21 tests pass.

A live audit was conducted against production (`https://lolosin.com/api/packages` and `https://lolosin.com/api/questions/[id]`) covering all **37 packages (3,898 questions)**, followed by browser automation verifying live DOM rendering, countdown timer, option selection, ragu-ragu toggling, and localStorage draft hydration.

### Key Audit Findings Overview
1. **Engine Compliance:** 100% compliant with Kepmen PANRB 321/2024. Exact boundaries (65, 80, 166) pass; any sub-threshold score (64, 80, 166), (65, 79, 166), or (65, 80, 165) fails immediately.
2. **Draft Recovery Enhanced:** Fixed `src/app/simulasi/[id]/page.tsx` to persist and restore `currentIndex` (`exam_index_${id}`), ensuring users refreshing the exam return to their active question index.
3. **Question Bank Scoring Defects (Found & Documented):**
   - **249 TKP questions** across 11 packages (`tryout-22` and `tryout-25` through `tryout-34`) contain duplicate option scores (e.g. `[1, 1, 2, 3, 5]` or `[1, 2, 4, 4, 5]`) instead of strict 1..5 distributions.
   - **6 TWK/TIU questions** across packages 26, 27, 28, 29, 30 have all options scored `0`, preventing students from receiving points even when selecting the correct answer stated in the explanation.

---

## 2. Audit Scope & Target Components

| Component | Path | Responsibility |
|---|---|---|
| **CAT Simulation Page** | `src/app/simulasi/[id]/page.tsx` | Exam session state, timer, keyboard shortcuts, autosave draft, BKN layout, exam submission |
| **Exam Result & Review** | `src/app/simulasi/hasil/[resultId]/page.tsx` | Score breakdown cards, subcategory diagnostics, question review, PDF print, social share |
| **Scoring Engine** | `src/lib/scoring.ts` | PANRB 321/2024 calculation, category score results, passing grade threshold evaluation |
| **Package Loader** | `src/lib/loadPackage.ts` | Neon DB question loader, static JSON fallback, figural image override mapper, package catalog metadata |
| **Result Sharing** | `src/lib/shareResult.ts` | Formatted WhatsApp share text generator, domain URL resolution (`https://lolosin.com`) |
| **User Storage Scoping** | `src/lib/userStorage.ts` | Multi-tenant draft isolation (`lolos_u_<id>_` vs `lolos_guest_`) |
| **Time Tracking** | `src/lib/timeTracker.ts` | Per-question time expenditure event logging |

---

## 3. Deep Dive Findings & Verifications

### 3.1 Scoring Fidelity & Kepmen PANRB 321/2024 Boundaries

The evaluation function `calculateExamScore(questions, answers, durationSeconds)` was tested against exact mathematical thresholds:

$$\text{isPassedAll} = (\text{score}_{\text{TWK}} \ge 65) \land (\text{score}_{\text{TIU}} \ge 80) \land (\text{score}_{\text{TKP}} \ge 166)$$

#### Strict Boundary Verification Matrix:
| Test Scenario | TWK Score | TIU Score | TKP Score | Total Score | Result | Evaluation Status |
|---|---|---|---|---|---|---|
| **Perfect Score** | 150 | 175 | 225 | 550 | **PASSED** | ✅ `isPassedAll: true` |
| **Exact Boundary** | **65** | **80** | **166** | **311** | **PASSED** | ✅ `isPassedAll: true` (Strict edge) |
| **TWK Under Boundary** | **64** | 80 | 166 | 310 | **FAILED** | ❌ `twk.isPassed: false`, `isPassedAll: false` |
| **TIU Under Boundary** | 65 | **79** | 166 | 310 | **FAILED** | ❌ `tiu.isPassed: false`, `isPassedAll: false` |
| **TKP Under Boundary** | 65 | 80 | **165** | 310 | **FAILED** | ❌ `tkp.isPassed: false`, `isPassedAll: false` |
| **High Total, Single Fail** | 60 | 175 | 225 | 460 | **FAILED** | ❌ `twk.isPassed: false`, `isPassedAll: false` |
| **Blank Submission** | 0 | 0 | 0 | 0 | **FAILED** | ❌ `isPassedAll: false` (Zero negative points) |

#### Rules Verified:
1. **No Negative Marking:** Wrong answers in TWK and TIU award exactly 0 points (never negative).
2. **TKP Blank Penalty:** Unanswered TKP questions award 0 points, whereas attempted options award 1 to 5.
3. **Proportional Dynamic Thresholds for Non-Standard Tests:** For mini tryouts (e.g. `tryout-mini` with 10 questions each), `calculateExamScore` dynamically recalculates max scores and thresholds using `PG_RATIO` while preserving the exact 110-question standard for all standard packages.

---

### 3.2 Draft Persistence & Session Recovery

#### Draft Architecture:
- Authenticated user storage key: `lolos_u_<userId>_exam_answers_<packageId>`
- Guest user storage key: `lolos_guest_exam_answers_<packageId>`
- Start timestamp key: `lolos_[scope]_exam_start_<packageId>`
- Active index key: `lolos_[scope]_exam_index_<packageId>`

#### Verification Results:
1. **Answers Map:** Deserializes into `Map<number, ExamAnswer>` with intact `questionId` and `selectedOptionId`.
2. **Ragu-Ragu (Flag) Map:** Toggling flag updates `isFlagged: true/false`. Flags survive JSON serialization, page refresh, and correctly update summary counts in the question navigation grid.
3. **Active Index Recovery (Bug Fix Applied):**
   - **Pre-audit behavior:** `currentIndex` was stored in memory state only (`useState(0)`). On browser refresh, the user was reset to question 1.
   - **Fix implemented:** Added `indexKey` to `src/app/simulasi/[id]/page.tsx`. Current index is autosaved on navigation and restored on hydration.
4. **Submission Cleanup:** Upon `submitExam()`, `storageKey`, `startKey`, and `indexKey` are purged from `localStorage`, preventing stale drafts from leaking into subsequent exam sessions.

---

### 3.3 Share Result Text & WhatsApp Integration

`generateShareText` and `getWhatsAppShareUrl` were audited in `src/lib/shareResult.ts`:
- **Passing Result Text:** Formats with `🎉 Hasil Simulasi CAT SKD CPNS 2027 di Lolos.in!`, includes `Total Skor: X/550`, category breakdown `TWK: X | TIU: Y | TKP: Z`, and `Status: LOLOS PASSING GRADE`.
- **Failing Result Text:** Formats with `💪`, encouraging message, and `Status: BELUM MEMENUHI PASSING GRADE`.
- **Canonical Domain:** Correctly defaults to `https://lolosin.com/simulasi`.
- **WhatsApp Click-to-Chat URL:** Generates `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`. Verified URI encoding handles newlines, emojis (`🎉`, `💪`), and pipe separators (`|`) cleanly.

---

### 3.4 Live Production Package Audit (`https://lolosin.com`)

Live audit of all 37 packages returned by `GET https://lolosin.com/api/packages`:

| Package ID | Section | Expected | Actual | TWK | TIU | TKP | Bad Options | Bad TWK/TIU | Bad TKP | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `tryout-mini` | starter | 30 | 30 | 10 | 10 | 10 | 0 | 0 | 0 | ✅ Clean |
| `tryout-1` | starter | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-2` | starter | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-3` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-4` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-5` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-6` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-7` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-figural` | special | 46 | 46 | 0 | 46 | 0 | 0 | 0 | 0 | ✅ Clean |
| `tryout-figural-2` | special | 82 | 82 | 0 | 82 | 0 | 0 | 0 | 0 | ✅ Clean |
| `tryout-8` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-9` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-10` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-11` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-12` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-13` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-14` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-15` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-16` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-17` | standard | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-18` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-19` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-20` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-21` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-22` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **3** | ⚠️ TKP duplicates |
| `tryout-23` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-24` | hots | 110 | 110 | 30 | 35 | 45 | 0 | 0 | 0 | ✅ Clean |
| `tryout-25` | drill | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **23** | ⚠️ TKP duplicates |
| `tryout-26` | drill | 110 | 110 | 30 | 35 | 45 | 0 | **1** | **29** | ⚠️ Zero score & TKP |
| `tryout-27` | drill | 110 | 110 | 30 | 35 | 45 | 0 | **1** | **26** | ⚠️ Zero score & TKP |
| `tryout-28` | drill | 110 | 110 | 30 | 35 | 45 | 0 | **1** | **25** | ⚠️ Zero score & TKP |
| `tryout-29` | drill | 110 | 110 | 30 | 35 | 45 | 0 | **1** | **29** | ⚠️ Zero score & TKP |
| `tryout-30` | drill | 110 | 110 | 30 | 35 | 45 | 0 | **2** | **24** | ⚠️ Zero score & TKP |
| `tryout-31` | drill | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **23** | ⚠️ TKP duplicates |
| `tryout-32` | drill | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **23** | ⚠️ TKP duplicates |
| `tryout-33` | drill | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **25** | ⚠️ TKP duplicates |
| `tryout-34` | drill | 110 | 110 | 30 | 35 | 45 | 0 | 0 | **19** | ⚠️ TKP duplicates |
| **TOTAL** | — | **3,898** | **3,898** | **1,030** | **1,338** | **1,530** | **0** | **6** | **249** | — |

---

## 4. Defect Analysis & Root Causes

### 4.1 Defect 1: Zero-Scored TWK/TIU Questions (6 Questions)
In 6 questions, all five options (`A`, `B`, `C`, `D`, `E`) have `score: 0`. Any candidate selecting the correct option is awarded 0 points.

1. **`tryout-26` Q#61 (TIU):**
   - Question: *"Jika x/y = 2/3 dan y/z = 3/4, berapakah nilai dari x/z?"*
   - Options: `A: 2/3 (0), B: 3/4 (0), C: 1/3 (0), D: 1/2 (0), E: 3/5 (0)`
   - Explanation: `(x/y) * (y/z) = (2/3) * (3/4) = 2/4 = 1/2` (Option D).
   - Expected: Option D must have `score: 5`.

2. **`tryout-27` Q#56 (TIU):**
   - Question: *"Hasil penjumlahan dari 250 pon + 6,75 ton + 36.000 ons + 15 kuintal + 1.500 dag"*
   - Options: All scored 0.

3. **`tryout-28` Q#53 (TIU):**
   - Question: *"Roby berencana mengikuti empat sesi kelas yang tidak bentrok dengan jadwal latihan basket..."*
   - Options: All scored 0.

4. **`tryout-29` Q#26 (TWK):**
   - Question: *"Ketetapan MPR mengenai Pedoman Penghayatan dan Pengamalan Pancasila (Ekaprasetia Pancakarsa) disahkan pada tanggal..."*
   - Options: All scored 0 (`A: 20 Maret 1978`, `B: 21 Maret 1978`, `C: 22 Maret 1978`, `D: 23 Maret 1978`, `E: 24 Maret 1978`). Tap MPR No. II/MPR/1978 disahkan 22 Maret 1978 (Option C).

5. **`tryout-30` Q#32 (TIU):**
   - Question: *"Seorang karyawan mengatur penempatan ruang kerja staf..."*
   - Options: All scored 0. Explanation specifies Option C (`1, 2, dan 3`).

6. **`tryout-30` Q#52 (TIU):**
   - Question: *"Ruang kerja yang letaknya paling jauh dari Pak Bono..."*
   - Options: All scored 0. Explanation specifies Option E (`Pak Dedi`).

### 4.2 Defect 2: Duplicate TKP Option Weights (249 Questions)
In `tryout-22` (3 questions) and `tryout-25` through `tryout-34` (19 to 29 questions per package), TKP questions feature duplicate option weights (e.g. `[1, 1, 2, 3, 5]` or `[1, 2, 4, 4, 5]`) instead of strict permutations of `{1, 2, 3, 4, 5}`.

**Root Cause:**
In the OCR/batch-generation script that created the Drill series (`tryout-25..34`), option scores were mapped via an incomplete heuristic, despite the correct scores being present in the explanation text:
- Example from `tryout-25` Q#66:
  `Explanation: "... Pilihan Jawaban dan Poin Nilai: A = 2, B = 5, C = 4, D = 1, E = 3."`
  Options in JSON: `A: 4, B: 5, C: 2, D: 1, E: 4` (scores 2 and 3 omitted, score 4 duplicated).

---

## 5. Live Browser Verification Summary

Automated browser session executed via Chrome DevTools Protocol on `https://lolosin.com`:
1. Navigated to `https://lolosin.com/simulasi/tryout-1`.
2. Loaded 110 questions in Official Mode with synchronized countdown timer (100:00).
3. Option Selection: Selected Option D on Question 1. Inspected browser `localStorage` under `lolos_guest_exam_answers_tryout-1`; verified record `[{"questionId":1,"selectedOptionId":"D","isFlagged":false}]` was written instantly.
4. Ragu-Ragu Toggle: Toggled the Ragu checkbox. Verified `localStorage` updated to `[{"questionId":1,"selectedOptionId":"D","isFlagged":true}]`.
5. Full Page Reload & Recovery: Executed `window.location.reload()`. Verified that upon reload, Question 1 restored Option D as selected, and the Ragu-Ragu checkbox remained checked.
6. Local storage cleaned up post-test.

---

## 6. Recommendations & Action Items

| Priority | Component | Recommendation |
|---|---|---|
| **P1 — High** | `src/data/packages/tryout-26..30.json` | Correct the 6 TWK/TIU questions where all option scores are `0` to set `score: 5` on the correct option. |
| **P1 — High** | `src/data/packages/tryout-22, 25..34.json` | Execute an automated regex score parser across explanations (`A = X, B = Y, C = Z, D = W, E = V` / `A: X, B: Y...`) to rectify all 249 TKP questions to strictly unique 1..5 scores. |
| **P2 — Medium** | `src/lib/loadPackage.ts` | Add a runtime validation fallback in `loadPackage()` that normalizes TKP options to unique `{1, 2, 3, 4, 5}` when duplicate scores are detected from JSON. |
| **P3 — Low** | Pre-commit Hook | Add a test in CI (`tests/qa-agent-exam-engine.test.ts`) that asserts all packages in `src/data/packages/*.json` pass strict TKP permutation checks before deployment. |

---

## 7. Sign-off

The core CAT simulation engine, passing grade logic, timer controls, draft persistence, and WhatsApp sharing are **verified and robust**. Implementing the recommendations in Section 6 will guarantee 100% scoring fidelity across all 3,898 questions platform-wide.
