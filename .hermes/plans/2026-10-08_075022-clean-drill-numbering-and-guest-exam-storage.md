# Implementation Plan: Clean Drill Question Numbering & Discard Unauthenticated Guest Exam History

## Goal
Remove redundant "Soal nomor X (Kategori):" prefixes in Drill/Latihan Kilat questions so they render clean text, and prevent tryout sessions taken by unauthenticated/guest users from persisting to the permanent Riwayat page (`/riwayat`).

---

## Current Context & Assumptions
- **Redundant Question Prefix in Drill**:
  - `src/data/packages/tryout-1.json`, `tryout-mini.json`, and `sample_questions.json` have question texts explicitly prefixed with strings like `Soal nomor 1 (Nasionalisme): ...` or `Soal nomor 1: ...`.
  - In Latihan Kilat (`src/app/drill/[category]/[subCategory]/page.tsx`), questions are randomized and filtered by category/subcategory. Because questions are random, the hardcoded "Soal nomor X" prefix looks unnatural and confusing.
  - Furthermore, `src/app/drill/[category]/[subCategory]/page.tsx` line 269 displays `soal {currentIndex + 1} dari {questions.length}` in pause modals, which is an in-app counter, but the question body itself contains the hardcoded string.
- **Guest Exam History Leaking to `/riwayat`**:
  - When a guest submits an exam in `src/app/simulasi/[id]/page.tsx`, `submitExam` saves the result to `scopedKey('exam_result_${resultId}', null)` (`lolos_guest_exam_result_...`).
  - In `src/app/riwayat/page.tsx`, `loadExamData()` iterates through all keys starting with `scopedKey('exam_result_', userId)`.
  - When a guest visits `/riwayat`, `userId` is null, so it loads all `lolos_guest_exam_result_*` and displays them in the Riwayat table.
  - The requirement states: **If the user is not logged in, no tryout results should be retained in the history (everything is temporary / only in memory or session-only for viewing the immediate score screen, but not saved in `/riwayat`)**.

---

## Architecture / Proposed Approach
1. **Sanitize Drill Question Text (Clean & Robust)**:
   - Create or use a regex utility or inline cleaner:
     `text.replace(/^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\([^)]*\))?\s*:\s*/i, '')`
   - In `src/app/drill/[category]/[subCategory]/page.tsx`, apply this sanitizer to `currentQ.text` (and optionally in question pre-processing upon fetch) so all questions loaded for Latihan Kilat have cleanly formatted prompts without prefix artifacts.
   - Also sanitize question files if suitable, but runtime regex guarantees clean text across existing and future packages.
2. **Restrict History to Authenticated Users Only**:
   - In `src/app/riwayat/page.tsx`:
     - If `!userId` (user is a guest), do **NOT** populate `history` or `drafts`. Keep both lists empty: `setHistory([]); setDrafts([]);`.
     - Automatically clean up any legacy `lolos_guest_exam_*` keys from `localStorage` to ensure a completely pristine state.
3. **Session-Only Storage for Guest Exam Result View**:
   - In `src/app/simulasi/[id]/page.tsx` and `src/app/simulasi/hasil/[resultId]/page.tsx`:
     - Guests still need to view the score immediately after clicking "Selesai" (`router.push('/simulasi/hasil/${resultId}')`).
     - To achieve this without polluting permanent history, store guest results in `sessionStorage` (or mark them temporary), OR in `HasilPage` allow reading from sessionStorage/localStorage, while `/riwayat` strictly gates display behind `if (!userId) return;`.
     - When a guest leaves or refreshes away, history remains clean.

---

## Step-by-Step Tasks

### Task 1: Clean Question Numbering Prefix in Drill / Latihan Kilat
**File:** `src/app/drill/[category]/[subCategory]/page.tsx`
- Define a helper function `stripQuestionPrefix(text: string): string`:
  ```ts
  function stripQuestionPrefix(text: string): string {
    return text.replace(/^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\([^)]*\))?\s*:\s*/i, '').trim();
  }
  ```
- Apply `stripQuestionPrefix` when mapping loaded questions in `fetch('/api/questions/tryout-1')`:
  ```ts
  const cleanedQuestions = all.map(q => ({
    ...q,
    text: stripQuestionPrefix(q.text),
  }));
  ```
- Also apply `stripQuestionPrefix` in the render card `{currentQ.text}` as a safeguard.

**Verification:**
- Load `/drill/TWK/Nasionalisme`.
- Verify question text begins directly with the scenario (e.g. "Seorang PNS menemukan rekan kerjanya..."), without any "Soal nomor 1 (Nasionalisme):" prefix.

---

### Task 2: Block Guest Exam History in `src/app/riwayat/page.tsx`
**File:** `src/app/riwayat/page.tsx`
- In `loadExamData()`:
  - Add an early return if `!userId`:
    ```ts
    if (!userId) {
      setHistory([]);
      setDrafts([]);
      return;
    }
    ```
- In the guest detection effect (`useEffect` watching `user, userLoading`):
  - In addition to showing `GuestLimitModal`, purge any lingering `lolos_guest_exam_*` keys in `localStorage` so guest data is completely temporary:
    ```ts
    if (!user && !userLoading) {
      setShowGuestModal(true);
      // Bersihkan riwayat temporary guest dari localStorage
      try {
        const guestKeys = Object.keys(localStorage).filter(k => k.startsWith('lolos_guest_exam_'));
        guestKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
    ```

**Verification:**
- Open `/riwayat` without logging in.
- Verify Riwayat Tryout section is completely empty and prompts registration/login.

---

### Task 3: Use Temporary Storage for Guest Results in `simulasi/[id]` & `simulasi/hasil/[resultId]`
**File:** `src/app/simulasi/[id]/page.tsx` & `src/app/simulasi/hasil/[resultId]/page.tsx`
- In `src/app/simulasi/[id]/page.tsx` (`submitExam`):
  - If `!userId` (guest user):
    - Save exam results into `sessionStorage` instead of `localStorage` (or with a temporary key prefix `session_exam_result_`).
    - This ensures the result is only accessible for the immediate `/hasil` review session and disappears when the tab/browser is closed.
- In `src/app/simulasi/hasil/[resultId]/page.tsx`:
  - When loading results for guest, check `sessionStorage` first, then fallback to `localStorage`.

**Verification:**
- As a guest, finish a free tryout (`tryout-mini` or `tryout-1`).
- Submit → verify `/simulasi/hasil/...` displays the score and breakdown correctly.
- Navigate to `/riwayat` → verify Riwayat is EMPTY.
- Close tab and reopen → temporary guest data is gone.

---

## Tests & Validation
1. **Verification Command**:
   - `npm run build` to confirm zero TypeScript or bundler errors.
2. **Behavioral Test Cases**:
   - Case A: Open any drill topic → confirm question text has no "Soal nomor X" prefix.
   - Case B: Guest completes tryout → Result page loads properly.
   - Case C: Guest navigates to `/riwayat` → 0 items shown, no guest tryout stored.
   - Case D: Registered user logs in → past tryouts show up as expected.

---

## Risks, Tradeoffs, and Open Questions
- **Regex Coverage for Question Prefixes**:
  - The regex `^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\([^)]*\))?\s*:\s*` covers patterns like:
    - "Soal nomor 1:"
    - "Soal no. 1:"
    - "Soal nomor 1 (Nasionalisme):"
    - "Soal no 1 (Integritas) :"
  - If any questions use a slightly different pattern, the regex will safely leave the original string intact without corrupting text.
