# Implementation Plan: Tryout Mode Rules (Official Strict Exit & Practice Resume)

## Goal
Enforce realistic exam constraints where Official Mode (`official`) cannot be paused or resumed (warning on refresh/navigation with mandatory submission or forfeit without saving), while Practice Mode (`practice`) saves drafts that can be seamlessly resumed from both the History page (`/riwayat`) and the Tryout Package list (`/simulasi`).

---

## Current Context & Assumptions
- **Current State**:
  - `src/app/simulasi/[id]/page.tsx` supports both `'official'` and `'practice'` exam types.
  - Answers and timers are auto-saved to localStorage (`exam_answers_[id]`, `exam_start_[id]`, `exam_mode_[id]`).
  - `ExitExamModal.tsx` currently offers two options to *all* users regardless of mode: "Simpan Draf & Lanjut Nanti" and "Kumpulkan & Nilai Sekarang".
  - Refreshing or accidental back navigation triggers `beforeunload` or `popstate`, but doesn't distinguish between official mode (which should strictly forbid drafts and warn of forfeit/submission) and practice mode.
  - The packages page (`src/app/simulasi/page.tsx`) only shows "Mulai Tryout" on every unlocked card and has no awareness of existing saved drafts.
  - The history page (`src/app/riwayat/page.tsx`) already parses drafts from `exam_answers_*`, but does not filter out invalid/official drafts if an official session was interrupted.

---

## Architecture / Proposed Approach
1. **Differentiate Exit Modal & Navigation Guard per Mode**:
   - For **Official Mode**: Remove the "Simpan Draf" option. Display a high-visibility warning banner stating that Official CAT simulations cannot be repeated or paused. The user must choose between **"Kumpulkan & Nilai Sekarang"** (grade immediately) or **"Keluar & Batalkan Ujian (Skor Hangus)"** (cleans up storage so the tryout is abandoned without saving).
   - For **Practice Mode**: Retain "Simpan Draf & Lanjut Nanti" (saves progress and returns safely) alongside "Kumpulkan Sekarang".
2. **Logo & Navigation Interception**:
   - In `SimulasiPage`, clicking the header brand logo ("Lolos.in") or exit buttons must open `ExitExamModal` instead of navigating directly away.
3. **Tryout Catalog Draft Awareness (`/simulasi`)**:
   - In `src/app/simulasi/page.tsx`, read scoped drafts from localStorage during hydration. For packages with an active practice draft, change the card CTA button from "Mulai Tryout" to **"Lanjutkan Simulasi"** with a badge indicating draft progress (e.g. `X/110 Terjawab`).
4. **History Page Refinement (`/riwayat`)**:
   - Ensure the draft section in `/riwayat` strictly handles practice drafts and cleans up abandoned official drafts.

---

## Step-by-Step Tasks

### Task 1: Update `ExitExamModal` to support mode-aware actions & warnings
**File:** `src/components/ExitExamModal.tsx`
- Add `examType: 'official' | 'practice'` prop.
- Add `onAbandon: () => void` prop for official mode (forfeits and cleans up without grading).
- When `examType === 'official'`:
  - Show warning badge/alert: *"Mode Tryout Resmi mensimulasikan tes CAT BKN asli. Ujian TIDAK DAPAT dijeda atau disimpan sebagai draf. Jika Anda keluar sekarang tanpa mengumpulkan, pengerjaan akan dibatalkan dan jawaban tidak tersimpan."*
  - Hide "Simpan Draf & Lanjut Nanti".
  - Show primary action: **"Kumpulkan & Nilai Sekarang"** (hijau/emerald).
  - Show secondary action: **"Keluar & Batalkan Ujian (Skor Hangus)"** (merah/rose).
  - Show cancel action: **"Batal & Lanjutkan Ujian"**.
- When `examType === 'practice'`:
  - Keep "Simpan Draf & Lanjut Nanti" and "Kumpulkan & Nilai Sekarang".

**Verification:**
Run TypeScript check or Vitest to verify component type contract.

---

### Task 2: Implement Strict Navigation Guard & Interception in `src/app/simulasi/[id]/page.tsx`
**File:** `src/app/simulasi/[id]/page.tsx`
- Intercept header brand/home click: make the "Lolos.in" text/logo trigger `setShowExitModal(true)` if clicked, or render it as an inert button rather than a live link to prevent accidental exits.
- Implement `handleAbandonExam`:
  - Clears `exam_answers_${params.id}`, `exam_start_${params.id}`, and `exam_mode_${params.id}` from localStorage.
  - Redirects user back to `/simulasi` with no score recorded.
- In `handleBeforeUnload`:
  - If `examType === 'official'`, customize `e.returnValue` so browsers prompt user with native confirmation dialog.
- Pass `examType={examType}` and `onAbandon={handleAbandonExam}` to `ExitExamModal`.

**Verification:**
Test that `SimulasiPage` passes all props and handles both exit options cleanly without runtime errors.

---

### Task 3: Display "Lanjutkan Simulasi" on Package Cards in `src/app/simulasi/page.tsx`
**File:** `src/app/simulasi/page.tsx`
- Import `scopedKey` from `@/lib/userStorage` and `useUser` from `@/lib/useUser`.
- In a `useEffect` hook after mount / hydration:
  - Iterate through localStorage keys starting with `scopedKey('exam_answers_', userId)`.
  - For each package, inspect `exam_mode_${pkgId}` and answers count.
  - If answers count > 0 and mode is `'practice'` (or has draft answers):
    - Record active draft info in a state map: `{ [packageId: string]: { answeredCount: number } }`.
- In `renderCard(pkg: PkgItem)`:
  - If `activeDrafts[pkg.id]` exists:
    - Display an amber pill/badge: `Draft: ${draft.answeredCount} Soal Disimpan`.
    - Change button label from `Mulai Tryout` to `Lanjutkan Simulasi`.
    - Change icon to `Play` (fill) or keep `ArrowRight` with distinctive highlight color.

**Verification:**
Test building the page with Next.js build or Vitest to verify no hydration mismatch occurs.

---

### Task 4: Synchronize & Clean Drafts in `src/app/riwayat/page.tsx`
**File:** `src/app/riwayat/page.tsx`
- In `loadExamData()`:
  - Check `scopedKey('exam_mode_${packageId}', userId)`.
  - Only show drafts where mode is `'practice'` (or legacy unassigned drafts).
  - If a draft is marked `'official'`, purge it automatically because official sessions cannot be resumed as drafts.

**Verification:**
Run `npm run build` to confirm zero lint or type errors across the entire project.

---

## Tests & Validation
1. **Unit / Integration Tests**:
   - Write a Vitest test in `src/components/__tests__/ExitExamModal.test.tsx` verifying:
     - In `'official'` mode, "Simpan Draf" is NOT rendered; "Kumpulkan & Nilai Sekarang" and "Keluar & Batalkan Ujian" are rendered.
     - In `'practice'` mode, "Simpan Draf & Lanjut Nanti" IS rendered.
2. **Build Test**:
   - Run `npm run build` in bash to confirm Next.js compiles without type or bundling errors.
3. **Manual Validation Scenario**:
   - Start Tryout in Official Mode → Click Exit → Modal displays strict warnings without draft option.
   - Start Tryout in Practice Mode → Answer 5 questions → Click Exit → Save Draft → Check `/simulasi` (button says "Lanjutkan Simulasi" with draft badge) → Check `/riwayat` (draft shows up with resume button).

---

---

### Task 5 (BUG FIX — PRIORITY): Fix "Hasil ujian tidak ditemukan" race condition in `HasilPage`
**File:** `src/app/simulasi/hasil/[resultId]/page.tsx`

**Root Cause:**
`HasilPage` mounts and immediately runs its `useEffect` while `useUser()` is still loading (`user = null`).
At that moment `userId = null`, so `scopedKey(...)` looks for `lolos_guest_exam_result_...` instead of
`lolos_u_ABC_exam_result_...` (where the result was actually saved by `submitExam`). The key is not found,
`setNotFound(true)` fires, and the error screen renders — even though the data exists under the correct scoped key.
When `useUser()` resolves later, the `useEffect` re-runs and finds the correct key, but `notFound = true`
is already in state and the component is rendering the error state instead.

**Fix — guard `setNotFound(true)` behind `!userLoading`:**

Change the `useEffect` in `HasilPage`:
```tsx
// BEFORE (buggy)
useEffect(() => {
  try {
    const raw = localStorage.getItem(scopedKey(`exam_result_${params.resultId}`, userId));
    if (raw) {
      setResult(JSON.parse(raw));
    } else {
      setNotFound(true);         // ← fires immediately with userId=null while auth is loading!
    }
    ...
  } catch {
    setNotFound(true);
  }
}, [params.resultId, userId]);

// AFTER (fixed)
useEffect(() => {
  if (userLoading) return;       // ← wait until auth resolves before deciding "not found"
  try {
    const raw = localStorage.getItem(scopedKey(`exam_result_${params.resultId}`, userId));
    if (raw) {
      setResult(JSON.parse(raw));
      setNotFound(false);        // reset in case previous render had set it
    } else {
      // Also try guest key as fallback (for users who were logged out during exam)
      const guestRaw = localStorage.getItem(scopedKey(`exam_result_${params.resultId}`, null));
      if (guestRaw) {
        setResult(JSON.parse(guestRaw));
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    }
    const rawQ = localStorage.getItem(scopedKey(`exam_questions_${params.resultId}`, userId))
      || localStorage.getItem(scopedKey(`exam_questions_${params.resultId}`, null));
    const rawA = localStorage.getItem(scopedKey(`exam_user_answers_${params.resultId}`, userId))
      || localStorage.getItem(scopedKey(`exam_user_answers_${params.resultId}`, null));
    const rawTime = localStorage.getItem(scopedKey(`exam_time_per_q_${params.resultId}`, userId))
      || localStorage.getItem(scopedKey(`exam_time_per_q_${params.resultId}`, null));
    if (rawQ) setQuestions(JSON.parse(rawQ));
    if (rawA) setUserAnswers(JSON.parse(rawA));
    if (rawTime) setTimeSpent(JSON.parse(rawTime));
  } catch {
    setNotFound(true);
  }
}, [params.resultId, userId, userLoading]);  // ← add userLoading as dependency
```

**Verification:**
- Complete a tryout as a logged-in user → result page shows score immediately (no "tidak ditemukan").
- Complete a tryout as a guest → result page shows score immediately.
- Navigate to a non-existent result ID → shows "tidak ditemukan" (after auth resolves).

---

### Task 6 (BUG FIX — MINOR): Guard Guest Action di Roadmap/Journey agar Streak Tidak Bertambah
**File:** `src/app/journey/page.tsx`

**Root Cause:**
Di `handleLogToday()` dan `toggleDay()`, mutasi state `streakDates` dan `completed` dilakukan *sebelum* pengecekan `if (!user)`. Akibatnya, meskipun `GuestLimitModal` muncul, tombol sudah berubah status, streak sudah bertambah di layar, dan state tersimpan.

**Fix — Guard di awal fungsi:**
```tsx
// Di handleLogToday():
function handleLogToday() {
  if (!user) {
    try {
      localStorage.setItem('lolos_guest_tried_journey', 'true');
    } catch {}
    setShowGuestModal(true);
    return; // ← STOP di sini, jangan ubah streak atau completed!
  }
  
  const today = todayStr();
  if (streakDates.includes(today)) return;
  // ... sisa logic untuk user yang sudah login
}

// Di toggleDay(day: number):
function toggleDay(day: number) {
  if (!user) {
    try {
      localStorage.setItem('lolos_guest_tried_journey', 'true');
    } catch {}
    setShowGuestModal(true);
    return; // ← STOP di sini, jangan centang day untuk guest!
  }

  // ... sisa logic untuk user yang sudah login
}
```

**Verification:**
- Buka `/journey` dalam kondisi logged out (guest).
- Klik "Sudah Mengerjakan Hari Ini" atau checkbox hari → modal registrasi/login muncul seketika.
- Streak tetap 0, hari tidak tercentang, tidak ada mutasi state lokal.

---

## Risks, Tradeoffs, and Open Questions
- **Browser-level Refresh / Close Limitation**:
  - Modern browsers (Chrome, Edge, Firefox) do not allow customized modal dialogs inside the native `beforeunload` event for security reasons. They display their standard *"Changes you made may not be saved"* prompt.
  - **Mitigation**: We handle in-app navigations (Header Logo, Exit Button, Browser Back via `popstate`) with our custom full-featured modal, and rely on standard `beforeunload` for tab close/F5.
- **Cheating via Force-Quit**:
  - In Official Mode, if a user forcibly closes the tab, progress is not saved as an official resumeable draft. When they return, they will be treated as starting fresh or abandoned.
