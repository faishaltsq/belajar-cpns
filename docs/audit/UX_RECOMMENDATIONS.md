# Accessibility & UX Audit — lolosin.com

Phase 4 audit, read-only (no source was modified). Audit date: 2026-10-20.

**Baseline:** Lighthouse 12.8.2 against the live site — Accessibility **90** on both mobile (`2026-10-20T13:20:33Z`) and desktop (`2026-10-20T13:25:02Z`), and **90** on `/simulasi` (`2026-10-20T13:33:22Z`). The three failing audits are `color-contrast` (score 0), `heading-order` (score 0) and `target-size` (score 0). Raw JSON: `lighthouse-mobile.json`, `lighthouse-desktop.json`, `lighthouse-mobile-simulasi.json`.

**Static census of `src/` (every `.ts`/`.tsx`/`globals.css` counted):**

| Signal | Count | Files |
| --- | --- | --- |
| `role=` | **3** | `ExamSession.tsx`, `FinishExamModal.tsx`, `psikotes/KraepelinChart.tsx` — all `role="alert"`-style, none is `role="dialog"` |
| `role="dialog"` | **0** | — |
| `aria-modal` | **0** | — |
| `aria-live` | **0** | — |
| `aria-expanded` / `aria-controls` | **0 / 0** | — |
| `inert` | **0** | — |
| `tabIndex` | **0** | — |
| `Escape` handler | **2** | `QuestionNavigationModal.tsx` only |
| `.focus()` | **2** | `login/page.tsx` (OTP advance/back) |
| `aria-label` | **8** | `login`(2), `Navbar`, `GuestLimitModal`, `QuestionNavigationModal`, `ReportIssueModal`, `journey` |
| `htmlFor` | **5** | all in `login/page.tsx` |
| `sr-only` | **0** | — |
| `:focus-visible` (global) | **0** | `globals.css` |
| `prefers-reduced-motion` | **0** | repo-wide |

---

## P0 — Blocks or misleads users; fix before anything else

### P0-1 · Primary CTA text fails WCAG AA contrast
- **Issue:** White text on the brand primary `#c96442` measures **3.89:1** (Lighthouse reports 3.89; recomputation gives 3.90). AA requires 4.5:1 for text below 18.66 px / 24 px bold — these buttons render at 14 px.
- **Evidence:** Lighthouse `color-contrast` nodes `section.text-center > div.mt-8 > a.btn-primary > span` ("Mulai Simulasi CAT") and `section.mt-20 > div.card-modern > div.mt-6 > a.btn-primary` ("Buka Semua Tryout"), score 0. Tokens at `src/app/globals.css:12-13` (`--primary: #c96442`, `--primary-foreground: #ffffff`), consumed by `.btn-primary` at `src/app/globals.css:86-88`.
- **Impact:** The two main conversion buttons — "Mulai Simulasi CAT" (`src/app/page.tsx:82`) and "Buka Semua Tryout" (`src/app/page.tsx:408`) — are unreadable for low-vision users and fail AA on every page using `.btn-primary`. This is the single reason Accessibility sits at 90 instead of 100.
- **Recommended change:** Darken `--primary` for the button surface only, or keep `#c96442` for fills and use a darker variant for text-bearing buttons. Measured ratios for candidates with white text: `#b05730` → 4.94:1, `#b04a26` → **5.45:1**, `#a84e2a` → 5.54:1. `#b04a26` keeps the terracotta identity with headroom.
- **Effort:** XS (<1 h) — one token change plus a visual pass on hover/active states.

### P0-2 · OTP inputs have no accessible name and no visible focus indicator
- **Issue:** The six single-character OTP boxes in the email-verification step carry no `id`, no `aria-label`, no associated `<label>`, and are styled `outline-none` with the border colour driven purely by whether a digit is present.
- **Evidence:** `src/app/login/page.tsx:260-274` (inputs), line **269** `className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white outline-none transition"`, lines 270-273 border colour from `borderColor: digit ? 'var(--primary)' : 'var(--border)'`. The `<label>` at `src/app/login/page.tsx:378` has no `htmlFor` and no matching `id`. Contrast with the rest of the file, where labelling is correct: `:339`/`:342`, `:392`/`:395`, `:459`/`:465`, `:477`/`:483`, `:497`/`:513` all pair `htmlFor` with `id`.
- **Impact:** A screen reader announces "edit text, blank". A keyboard user tabs into a box and cannot see which one is focused — they are flying blind during sign-in and password reset, the highest-stakes flow in the product. Fails WCAG 1.3.1, 2.4.7 and 4.1.2.
- **Recommended change:** `aria-label={"Kode digit " + (idx + 1)}` (or a single visually-hidden label on the group plus `role="group"` with `aria-labelledby`), and replace `outline-none` with `focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2` — the pattern already used elsewhere in `login/page.tsx` (line 269's siblings) and `profil/page.tsx:429`.
- **Effort:** XS (<1 h).

### P0-3 · Exam dialogs are not dialogs: no role, no focus trap, no Escape
- **Issue:** `FinishExamModal`, `PauseExamModal`, `ExitExamModal`, `ExamModeModal`, `GuestLimitModal` and `ReportIssueModal` render as bare fixed-position `<div>`s. Zero occurrences of `role="dialog"`, `aria-modal`, `tabIndex` or `.focus()` in any of them; `inert` appears nowhere in the codebase, so the page behind stays focusable and reachable by screen readers.
- **Evidence:** repo-wide census above (0 `role="dialog"`, 0 `aria-modal`, 0 `inert`, 0 `tabIndex`). The only `Escape` handling in the entire app is `src/components/QuestionNavigationModal.tsx:114` (`if (e.key === 'Escape') handleRequestClose()`). `FinishExamModal.tsx:69` does use `role="alert"` for the submission error, which is correct but unrelated.
- **Impact:** During an exam, keyboard users tab out of the "Selesai" confirmation into the question list underneath and can change answers they believe they have submitted. Screen reader virtual-cursor users read background content as if the dialog were not modal. Fails WCAG 2.4.3 (focus order), 2.1.2 (no keyboard trap — ironically the inverse failure), 4.1.2 (name/role/value).
- **Recommended change:** One shared `ModalShell`: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at the title, focus moved to the first control on open, focus restored to the trigger on close, `Escape` closes unless `isSubmitting` (the `FinishExamModal.tsx:13` comment already calls for a non-dismissible state), and `inert` on the page container while open. Wire all six modals through it.
- **Effort:** M (1–2 days) — one component plus six call sites.

---

## P1 — Fails a WCAG A/AA success criterion on a core path

### P1-1 · No `prefers-reduced-motion` support anywhere
- **Issue:** Zero occurrences of `prefers-reduced-motion` in `globals.css` or any component, while motion classes ship on the critical paths: `animate-pulse` on the critical timer (`src/components/Timer.tsx`, the `isCritical` branch), `animate-spin` on login submit (`login/page.tsx:290`), plus `.animate-sheet-in` / `.animate-sheet-out` / `.fade-in` / `.fade-out` (`src/app/globals.css:256-272`) and `transition: all 0.15–0.2s` on `.btn-primary` (`:92`) and `.card-modern` (`:70`).
- **Impact:** Vestibular-sensitive users get pulsing and sliding they cannot disable. Fails WCAG 2.3.3.
- **Recommended change:** One media block in `globals.css`: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }` — and give the critical timer a non-animated fallback (see P1-3).
- **Effort:** XS (<1 h).

### P1-2 · No skip link and no `<main>` landmark
- **Issue:** The live homepage HTML (73,918 bytes fetched during this audit) contains no skip link (grep for `skip` / `lewati` → no matches) and no `<main>` element. In source, the only `<main>` is `src/app/global-error.tsx:32`; `<nav>` appears in exactly two files (`Navbar.tsx:51`, `DrillTopicContent.tsx`).
- **Impact:** Keyboard and screen reader users must tab through the full header nav on every page to reach content. Landmark navigation cannot jump to the body. Fails the intent of WCAG 2.4.1 (bypass blocks).
- **Recommended change:** Add `<a href="#konten" className="sr-only focus:not-sr-only …">Lewati ke konten</a>` as the first element in `Navbar.tsx`, wrap page bodies in `<main id="konten">`, and give each page's primary section an accessible name. `sr-only` currently has **0** occurrences, so the utility class must be added too (Tailwind ships it).
- **Effort:** S (half a day — touches root layout and the nav).

### P1-3 · Timer communicates remaining time by colour only, with no announcement
- **Issue:** `Timer` renders `MM:SS` text plus colour state (amber ≤600 s, red + `animate-pulse` ≤300 s) and a `title` attribute. There is no `role`, no `aria-label`, no `aria-live`, and no other non-visual channel. The `title` is not reliably announced and cannot be perceived by touch users.
- **Evidence:** `src/components/Timer.tsx` — `setInterval` at line 36, thresholds `isWarning = secondsLeft <= 600 && secondsLeft > 300` / `isCritical = secondsLeft <= 300`, `title={isCritical ? 'Waktu hampir habis!' : …}` in the rendered `<div>`, `animate-pulse` and a `KRITIS` badge in the `hidden sm:inline` span (invisible below the `sm` breakpoint — mobile users in critical time get colour only). Repo-wide: 0 `aria-live`.
- **Impact:** A blind candidate gets no warning that time is expiring; a candidate under reduced motion gets a pulsing red box; a mobile candidate loses the `KRITIS` badge entirely. The timer is the highest-stakes widget in an exam product. Fails WCAG 1.4.1 (use of colour) and 4.1.3 (status messages).
- **Recommended change:** `role="timer"` on the container, `aria-label={"Sisa waktu " + minutes + " menit " + seconds + " detik"}` refreshed no more than every 30 s (per-second announcements are noise), and a visually-hidden `aria-live="assertive"` element that announces once at the 10-minute and 5-minute marks. Make the `KRITIS` badge visible on mobile.
- **Effort:** S (half a day).

### P1-4 · Navigation and heading semantics: mobile toggle has no expansion state, headings jump levels
- **Issue A:** the mobile menu button carries `aria-label="Toggle menu"` but no `aria-expanded` or `aria-controls`; the panel it opens is a plain conditional `<div>`, not a `<nav>`.
  - **Evidence:** `src/components/Navbar.tsx:125-129` (`<button … aria-label="Toggle menu">`); desktop nav `<nav>` at `Navbar.tsx:51`; repo census = 0 `aria-expanded`, 0 `aria-controls`.
  - **Impact:** A screen reader user cannot tell whether the menu is open, and gets no announcement when it opens. Fails 4.1.2.
- **Issue B:** heading levels jump — `h4` follows `h1`/`h2`.
  - **Evidence:** Lighthouse `heading-order` score 0, failing nodes `section.mt-20 > … > h4.font-semibold` ("Berapa passing grade resmi SKD CPNS 2027?") and `div.max-w-6xl > div.grid > div.space-y-2 > h4.text-xs` ("MODUL LATIHAN"). In source: FAQ `<h4>` at `src/app/page.tsx:380`; footer `<h4>` at `src/components/Footer.tsx:41, 54, 67, 105`.
  - **Impact:** Screen reader heading navigation (the primary way people skim) is broken; the "MODUL LATIHAN" footer column announces as a level-4 heading directly under `h1`. Fails 1.3.1 / 2.4.6.
- **Recommended change (both):** `aria-expanded={isMenuOpen}` + `aria-controls="menu-utama"` and make the panel a `<nav aria-label="Menu utama">`; promote FAQ questions to `<h2>` (they sit under an `h1` page title with an `h2` section title in between) and footer column titles to `<h3>`.
- **Effort:** XS (A) + XS (B).

### P1-5 · Touch targets in the footer are too small
- **Issue:** Footer links are `text-xs` (12 px) inside `<ul className="space-y-1.5 text-xs">`.
- **Evidence:** Lighthouse `target-size` score 0, failing nodes `div.space-y-2 > ul.space-y-1.5 > li > a` — "Simulasi CAT SKD" (`/simulasi`) and "Tes Koran Kraepelin" (`/psikotes/kraepelin`), flagged as overlapping/too small. `src/components/Footer.tsx:44, 57, 70` (`<ul className="space-y-1.5 text-xs">`).
- **Impact:** The footer is the navigation backstop when the header is scrolled away; on phones the links are hard to hit and adjacent targets collide. Fails 2.5.8 (Target Size Minimum).
- **Recommended change:** `inline-block py-1.5 -my-0.5` (or a 24 px min-height) on footer links and widen `space-y-1.5` → `space-y-2`.
- **Effort:** XS (<1 h).

### P1-6 · Form errors are visual only
- **Issue:** Login/reset error and success boxes are plain `<div>`s with no `role="alert"` or `aria-live`.
- **Evidence:** `src/app/login/page.tsx:244-248` (`{error && <div className="…bg-red-50…">{error}</div>}`) and `:250-254` (`resendSuccess`); register-form errors use the same pattern. Repo census: 0 `aria-live`. The one correct instance is `FinishExamModal.tsx:69` (`role="alert"`).
- **Impact:** "Kode OTP salah" appears on screen but is never announced; a screen reader user resubmits blindly. Fails 4.1.3.
- **Recommended change:** `role="alert"` on the error container and `role="status"` on the success container; keep them in the DOM stable (or use `aria-live="polite"` on a persistent wrapper) so the announcement fires on content change.
- **Effort:** XS (<1 h).

---

## P2 — Quality, consistency, and maintainability

### P2-1 · Secondary text contrast on muted surfaces
- **Issue:** `--muted-foreground` `#6e6d68` on `--muted` `#ede9de` = **4.27:1** (computed) — below 4.5:1 for the 10–12 px labels that use it. Same colour on the page background is 4.92:1 (passes) and on cards 4.71:1 (passes), so the failure is specific to muted chips/pills.
- **Evidence:** `src/app/globals.css:10-16` palette; computed with the WCAG relative-luminance formula during this audit. Lighthouse did not flag it on `/` (those elements were not in the rendered viewport), so this is a **calculated** finding, not a Lighthouse node.
- **Recommended change:** Darken `--muted-foreground` to about `#63625d` (≥4.5:1 on `#ede9de`) or lighten `--muted`.
- **Effort:** XS.

### P2-2 · Brand colour used as small text
- **Issue:** `#c96442` on `#faf9f5` = **3.70:1** (computed) and on `#f5f4ef` = 3.54:1. Passes only for ≥18.66 px/24 px bold text.
- **Evidence:** `text-[var(--primary)]` appears in 11 files (e.g. `Navbar.tsx:593` icon, `Timer` accents); tokens at `globals.css:12-16`.
- **Recommended change:** Introduce `--primary-text: #a34a26`-class token for small text uses; keep `--primary` for fills.
- **Effort:** XS.

### P2-3 · Modal headings and `<ul>` inside dialogs have no labelling
- **Issue:** Dialog titles are not referenced by `aria-labelledby` (0 occurrences), and `GuestLimitModal`'s close button relies on `aria-label="Tutup"` alone (`GuestLimitModal.tsx:49`) with the same pattern in `QuestionNavigationModal.tsx:203` — these are the only two close buttons with accessible names. `UpgradeProModal` and `ReportIssueModal` close buttons have none.
- **Evidence:** census (0 `aria-labelledby` except `KraepelinChart.tsx`), 8 `aria-label` total.
- **Impact:** Once P0-3 lands, dialogs will have a role but no name; screen readers read the first focusable control instead of the title.
- **Recommended change:** Part of the shared `ModalShell` from P0-3 — pass `titleId` through.
- **Effort:** Included in P0-3.

### P2-4 · `Best Practices` 96 — console error from an expected 401
- **Issue:** Lighthouse logs `/api/auth/me` → 401 as a console error for anonymous visitors, holding Best Practices at 96 instead of 100.
- **Evidence:** `lighthouse-mobile.json` → `errors-in-console`, score 0.67.
- **Recommended change:** Return `200 { user: null }` from `/api/auth/me` when unauthenticated (an unauthenticated probe is a normal state, not an error), or probe with a non-XHR path.
- **Effort:** XS.

### P2-5 · Focus visibility is inconsistent between components
- **Issue:** `globals.css` has **no `:focus-visible` rule at all** (0 occurrences) and exactly one `outline: none` (`globals.css:140`, `input-modern` — acceptable because the following rule restores a focus ring). Components that use `focus:outline-none` do so without a replacement: `login/page.tsx:269` (OTP, see P0-2); `profil/page.tsx` mixes `focus:outline-none` with `focus:ring-2` on some inputs (`:429`) and relies on outline suppression on others.
- **Impact:** Focus visibility depends on which component you are in. Keyboard users cannot predict where the ring will appear.
- **Recommended change:** One global `:focus-visible` style (`outline: 2px solid var(--primary); outline-offset: 2px;` with `border-radius`-friendly `outline-offset`), then delete per-component `focus:outline-none` unless a ring is present.
- **Effort:** S (half a day — plus a keyboard pass through every route).

### P2-6 · Exam-screen touch targets and mobile badge visibility
- **Issue:** Exam header controls are `h-8` (32 px) — meets the 24 px minimum but below the 44 px recommendation for a high-pressure touch UI (`ExamSession.tsx:574, 590, 609, 646`). The `KRITIS` timer badge is `hidden sm:inline` (see P1-3).
- **Recommended change:** `min-h-[44px]` on the header buttons at the `sm` breakpoint or below; show the badge unconditionally.
- **Effort:** XS.

---

## P3 — Nice to have

| # | Issue | Evidence | Change | Effort |
| --- | --- | --- | --- | --- |
| P3-1 | `sr-only` utility is unused (0 occurrences), so there is no established pattern for hidden text. | repo census | Introduce the class now; P1-2 and P1-3 depend on it. | XS |
| P3-2 | Breadcrumb/section landmarks are unnamed — multiple `<section>` elements with no `aria-label` on the homepage. | Live HTML: 6 `<section>` tags, 1 `<header>`, 1 `<nav>`, 0 `<main>` | Label the primary `<section>` per page; or rely on `use-landmarks` audit (currently not flagged). | XS |
| P3-3 | `Escape` closes only one of the seven overlays. | `QuestionNavigationModal.tsx:114` is the sole handler | Covered by P0-3. | (in P0-3) |
| P3-4 | PAPI-Kostick/Kraepelin chart is the only component with proper ARIA labelling (`aria-labelledby` in `psikotes/KraepelinChart.tsx`); nothing else follows that pattern. | census | Use it as the internal reference implementation. | XS |

---

## What already works (measured, do not regress)

- **Lighthouse SEO = 100**, `document-title` = 1, `html-has-lang` = 1 — live `<html lang="id">` is correct for the audience.
- **CLS = 0** (mobile `/`), 0.006 (desktop), 0.003 (`/simulasi`) — self-hosted `next/font` Outfit with preload and no unsized image containers above the fold.
- **`button-name`, `link-name`, `list`, `listitem`, `aria-allowed-attr`, `aria-valid-attr` all score 1.**
- **Question images have real alt text**: `QuestionCard.tsx:185` (`alt={Ilustrasi soal N}`), `:255`, `:308`.
- **Login and register forms are labelled**: five `htmlFor`/`id` pairs (`login/page.tsx:339/342, 392/395, 459/465, 477/483, 497/513`), plus a labelled password-visibility toggle (`:527`) and OTP focus management via `.focus()` (`:2 focus() calls`).
- **Submission errors in the finish dialog are announced**: `FinishExamModal.tsx:69` `role="alert"`, and the dialog correctly refuses dismissal while submitting (`FinishExamModal.tsx:13`).
- **Exit protection is in place for the exam**: `beforeunload` (`ExamSession.tsx:180-188`) and `popstate` interception (`:200-213`) prevent accidental loss of an in-progress paper.
- **No positive `tabindex` values anywhere** — natural DOM order is preserved (Lighthouse `tabindex` audit: no findings).

---

## What is NOT RUN

| Item | Why |
| --- | --- |
| Automated axe-core / WAVE crawl across all routes | Only Lighthouse was run (3 URLs: `/`, desktop `/`, `/simulasi`). |
| Manual keyboard walkthrough of every route | Component-level static review only; no scripted tab-order capture. |
| Screen reader verification (NVDA / VoiceOver) | No AT run — all `aria-*` findings are static and the recommended ARIA is inferred from the DOM, not observed in a reader. |
| Contrast sampling of every colour pair | Only the Lighthouse-flagged nodes plus the palette pairs computed during this audit; no full-page pixel sampling. |
| Mobile 320 px / landscape layouts | Not rendered or measured. |
| WCAG 2.2 conformance statement | This is an audit of the signals above, not a certification. |

---

## Recommended sequencing

| Order | Item | Effort | Outcome |
| --- | --- | --- | --- |
| 1 | P0-1 contrast token | XS | Accessibility 90 → ~95 (removes `color-contrast`) |
| 2 | P0-2 OTP labels + focus ring | XS | Sign-in becomes keyboard/SR usable |
| 3 | P1-4 heading levels | XS | Removes `heading-order`; Accessibility → ~97 |
| 4 | P1-5 footer target size | XS | Removes `target-size`; Accessibility → 100 |
| 5 | P1-1 reduced motion, P1-6 alert roles, P1-2 skip link/`<main>` | XS+S | WCAG A coverage on 2.3.3, 4.1.3, 2.4.1 |
| 6 | P0-3 `ModalShell` | M | Real modal semantics across the exam flow |
| 7 | P1-3 timer announcements | S | Critical exam widget becomes perceivable |
| 8 | P2-5 global `:focus-visible` | S | Consistent keyboard experience |

Steps 1, 3 and 4 are three sub-hour changes that together clear every failing Lighthouse accessibility audit.
