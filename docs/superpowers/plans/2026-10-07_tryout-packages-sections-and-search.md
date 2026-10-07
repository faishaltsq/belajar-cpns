# Tryout Packages Sectioning, Search, and Engagement Polish Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the `/simulasi` page into categorized sections with real-time search, filter chips, social proof tags, and progress indicators so users can easily discover and pick tryout packages.

**Architecture:** 
1. Categorize tryout packages into logical groups (Gratis/Mini, Standar SKD BKN, Bergambar & Figural, Tantangan HOTS, Drill Intensif).
2. Add a search bar + category tabs filter at the top of the package directory.
3. Enrich package cards with micro-stats (question count, duration, difficulty, last score tag if completed).
4. Maintain responsive design for mobile & desktop with Claude amber theme and Phosphor icons.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `@phosphor-icons/react`, localStorage for user exam completion history.

## Global Constraints
- Keep light mode theme: background `#faf9f5`, brand accent `#c96442`, font Outfit.
- Phosphor icons only (`@phosphor-icons/react`), no lucide-react.
- Fast client-side instant search without debouncing lag (data size ~35 items).
- Preserve existing unlock & PRO gatekeeping logic (`FREE_IDS`, `unlockedPackages`, `isPro`).

---

### Task 1: Enrich Package Data Model with Sections & Metadata

**Files:**
- Modify: `src/lib/loadPackage.ts`
- Modify: `src/app/api/packages/route.ts`

**Specifications:**
Add `section` and `difficulty` metadata to each item in `TRYOUT_LIST`:
- Sections:
  1. `starter`: "Uji Coba & Gratis" (tryout-mini, tryout-1, tryout-2)
  2. `special`: "Spesialisasi & Bergambar" (tryout-figural, tryout-8 s/d tryout-17)
  3. `hots`: "Tantangan HOTS (High Order Thinking)" (tryout-18 s/d tryout-24)
  4. `standard`: "Standar CAT BKN" (tryout-3 s/d tryout-7)
  5. `drill`: "Latihan Intensif Mandiri" (tryout-25 s/d tryout-34)

- [ ] **Step 1:** Update `PkgItem` type & `TRYOUT_LIST` definitions with `section`, `difficulty`, and `questionCount`.
- [ ] **Step 2:** Ensure `/api/packages` endpoint returns new metadata.
- [ ] **Step 3:** Commit data changes.

---

### Task 2: Build Filter, Search Bar, and Section Grouping UI

**Files:**
- Modify: `src/app/simulasi/page.tsx`

**Specifications:**
1. **Search Input Bar**:
   - Real-time search query matching title (`label`), description (`desc`), and tags.
   - Clear search button (X) when query is not empty.
2. **Category Filter Tabs / Chips**:
   - Options: `Semua`, `🆓 Gratis`, `🏆 Standar BKN`, `🧠 HOTS`, `🖼️ Figural`, `⚡ Latihan`.
3. **Section Accordion / Categorized Views**:
   - If filtering or searching: display matching results directly with match count badge.
   - If view is "Semua" with empty search: display grouped sections with clean dividers and section headers with count badges.
4. **Enhanced Cards (Engagement & Polish)**:
   - Badges: `Coba Gratis` (green/amber), `HOTS` (purple/red), `Bergambar` (blue).
   - Info pill: `110 Soal • 100 Menit` (or `30 Soal • 30 Menit`).
   - If user already completed the tryout: show "Nilai Terakhir: XXX" or "Sudah Dikerjakan" badge from localStorage.

- [ ] **Step 1:** Implement state for `searchQuery`, `activeTab`, and user completed packages map.
- [ ] **Step 2:** Render Search Bar and Filter Pills beneath Header.
- [ ] **Step 3:** Render Grouped Sections when not searching, or Flat Filtered Grid when query/filter is active.
- [ ] **Step 4:** Style cards with badges and micro-stats according to Claude amber design guidelines.
- [ ] **Step 5:** Test responsive mobile layout.

---

### Task 3: Verification & Build

- [ ] **Step 1:** Run `npm run build` to ensure type-safety and zero lint/compile errors.
- [ ] **Step 2:** Verify search functionality, tab filtering, and PRO lock triggers.
- [ ] **Step 3:** Commit & push.
