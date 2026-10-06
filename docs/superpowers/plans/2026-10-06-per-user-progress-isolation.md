# Per-User Progress Isolation (Roadmap & Flashcard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all user progress (Roadmap completed days, daily streak dates, flashcard mastered cards, and drill wrong answers) is strictly isolated per authenticated user, with clean zero-state for logged-out / guest users.

**Architecture:** Introduce a centralized helper `src/lib/userStorage.ts` that automatically derives user-scoped `localStorage` keys (e.g., `user_${userId}_journey_completed_days`). When no user is logged in (`userId = null` or guest), progress is either tied to a transient guest scope or cleanly empty, preventing account leakage upon logout.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, React Context / Hooks (`useUser.ts`), `localStorage`.

**Spec:** Direct user requirement: "pastikan roadmap dan flashcard di setiap user itu berbeda, ini aku coba keluar akun tapi progress roadmap udah jalan"

---

## Global Constraints

- **Scope keys by user ID:** Any persistence key must follow the pattern `lolos_usr_${userId || 'guest'}_<feature>`.
- **Zero data bleed on logout:** When `useUser()` returns `user: null`, the active state in UI must immediately show 0% progress, empty mastered cards, and 0-day streak.
- **Backwards compatibility:** For existing local single-user sessions before this fix, provide a one-time migration to the logged-in user if their user-scoped key is empty.
- **Icons:** Keep using `@phosphor-icons/react` exclusively.
- **No external DB required for roadmap/flashcard:** Retain high-speed client-side `localStorage` per user without introducing database latency.

---

## Review Focus

1. **Logout immediate reset:** When user logs out, roadmap and flashcard UI must immediately re-render to empty/0% state without requiring a hard browser refresh.
2. **Account switching:** Logging in as User A, logging out, then logging in as User B must load User B's distinct saved progress.
3. **Guest protection:** An unauthenticated user should not be able to mark progress that overwrites an authenticated user's progress.
4. **Hydration safe:** Avoid hydration mismatch by waiting until `loading === false` from `useUser()` before reading storage.
5. **Wrong questions isolation:** Drill "Ulang Soal Salah" must also only collect questions from simulations/drills belonging to the active user.

---

## Proposed File Changes

| File | Role | Action |
|---|---|---|
| `src/lib/userStorage.ts` | Centralized helper to get/set user-scoped storage items safely | **Create** |
| `src/app/journey/page.tsx` | Roadmap page — integrate user-scoped storage + reset when user logged out | **Modify** |
| `src/app/flashcard/page.tsx` | Flashcard page — integrate user-scoped storage + reset when user logged out | **Modify** |
| `src/lib/wrongAnswers.ts` | Drill wrong answers collector — scope mastered question IDs to active user | **Modify** |

---

## Tasks

### Task 1: Create Centralized Scoped Storage Helper (`src/lib/userStorage.ts`)

**Files:**
- Create: `src/lib/userStorage.ts`

**Interfaces:**
- Produces:
  - `getUserStorageKey(featureKey: string, userId?: string | null): string`
  - `getUserStorageJSON<T>(featureKey: string, userId: string | null | undefined, defaultValue: T): T`
  - `setUserStorageJSON<T>(featureKey: string, userId: string | null | undefined, value: T): void`

- [ ] **Step 1: Write `src/lib/userStorage.ts`**

```typescript
export function getUserStorageKey(featureKey: string, userId?: string | null): string {
  const scope = userId ? `u_${userId}` : 'guest';
  return `lolos_${scope}_${featureKey}`;
}

export function getUserStorageJSON<T>(
  featureKey: string,
  userId: string | null | undefined,
  defaultValue: T
): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const key = getUserStorageKey(featureKey, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function setUserStorageJSON<T>(
  featureKey: string,
  userId: string | null | undefined,
  value: T
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserStorageKey(featureKey, userId);
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/userStorage.ts
git commit -m "feat: user-scoped localStorage helper"
```

---

### Task 2: Isolate Roadmap 30 Hari per User (`src/app/journey/page.tsx`)

**Files:**
- Modify: `src/app/journey/page.tsx`

**Key changes:**
- Consume `const { user, loading } = useUser()`
- Re-bind `completed`, `streakDates`, `todayLoggedDay` whenever `user?.id` changes
- If `!user` (guest/logged out), display prompt to login to save progress, or show fresh guest state (0%)
- When user logs out, state automatically clears to 0

- [ ] **Step 1: Update `journey/page.tsx` state loading effect to depend on `user?.id`**
- [ ] **Step 2: Run build to verify TypeScript compatibility**
- [ ] **Step 3: Commit**

```bash
git add src/app/journey/page.tsx
git commit -m "fix(journey): scope roadmap progress and streaks to active user"
```

---

### Task 3: Isolate Flashcard per User (`src/app/flashcard/page.tsx`)

**Files:**
- Modify: `src/app/flashcard/page.tsx`

**Key changes:**
- Consume `const { user, loading } = useUser()`
- Re-bind `mastered` IDs based on `user?.id`
- Re-build deck when `user?.id` or `filter` changes
- When user logs out, mastered cards list resets

- [ ] **Step 1: Update `flashcard/page.tsx` to use user-scoped mastered IDs**
- [ ] **Step 2: Run build to verify zero compile errors**
- [ ] **Step 3: Commit**

```bash
git add src/app/flashcard/page.tsx
git commit -m "fix(flashcard): scope mastered flashcards to active user"
```

---

### Task 4: Isolate Mastered Questions in Drill (`src/lib/wrongAnswers.ts`)

**Files:**
- Modify: `src/lib/wrongAnswers.ts`

**Key changes:**
- Accept optional `userId?: string | null` in `getMasteredIds`, `markMastered`, and `collectWrongQuestions`
- Update callers in `src/app/drill/ulang-salah/page.tsx` to pass active `user?.id`

- [ ] **Step 1: Update `wrongAnswers.ts` and `ulang-salah/page.tsx`**
- [ ] **Step 2: Run full build and test**
- [ ] **Step 3: Commit & Push**

```bash
git add src/lib/wrongAnswers.ts src/app/drill/ulang-salah/page.tsx
git commit -m "fix(drill): scope mastered questions to active user"
```
