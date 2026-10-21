# FEATURE ROADMAP — Lolosin.com

Order of work follows the priority agreed for this project:
**examination correctness → data persistence → security and payment integrity →
learning effectiveness → mobile usability → performance → growth.**
An optional feature never displaces a reliability item.

Status legend: **DONE** (shipped in this working tree with a regression test),
**NEXT**, **LATER**, **HELD** (deliberately not started).

---

## Sprint 1 — Reliability and core bug fixes · DONE

| Item | Status | Evidence |
|---|---|---|
| Repository audit, four discovery documents | DONE | `docs/audit/PROJECT_DISCOVERY.md`, `FEATURE_INVENTORY.md`, `USER_JOURNEYS.md`, `TECHNICAL_DEBT.md` |
| Automated test setup | DONE | Vitest 635 tests; Playwright 90 across five viewports — `docs/testing/TEST_RESULTS.md` |
| Critical CAT validation | DONE | `tests/e2e/cat-tryout.spec.ts` — open, answer, navigate, reload, submit, paywall |
| Score validation | DONE | `tests/content-consistency.test.ts`, `tests/exam-clock.test.ts`; passing grades read from the live submit response |
| Autosave / recovery | DONE | answers, index, mode and start time survive a reload (E2E) plus `ExamSession` restore |
| Payment authorization review | DONE | `docs/audit/SECURITY_REVIEW.md` — P0-1, P1-7, P1-8 fixed |
| Content inconsistencies | DONE | single source `src/lib/examRules.ts` + `src/lib/catalogStats.ts` |
| Critical bug fixes | DONE | 12 entries in `docs/audit/BUG_REPORT.md` |

## Sprint 2 — Learning intelligence · NEXT

| Feature | Priority | Notes |
|---|---|---|
| Smart Weakness Analyzer — "Fokus Belajar Berikutnya" | P1 | Deterministic engine over question metadata and answer history; no AI inference in the numbers. CTA "Latih Topik Ini" opens the matching practice. |
| Personal Progress Analytics | P1 | Tryouts completed, average/high score, TWK/TWI/TKP progress, weekly activity, most difficult and most improved topics. Empty state instead of fabricated charts. |
| Daily Mission | P1 | Small daily goals with a streak that never erases progress; integrates with the roadmap. |
| Dashboard enhancement | P1 | Welcome + "Lanjut Belajar", three compact stats, recommended next practice, analytics, missions. |

## Sprint 3 — Personalized learning · LATER

Adaptive practice (rule-based first), personalized study planner on top of the
roadmap, smart wrong-answer review with lightweight spaced repetition, exam
readiness dashboard labelled **"Indikator Kesiapan Belajar"** with no predicted
pass probability.

## Sprint 4 — Product polish · LATER

Bookmarks, PWA feasibility, mobile refinements, accessibility, performance,
analytics. Accessibility and performance work is partly already in flight — see
`docs/audit/PERFORMANCE_REPORT.md` and `docs/audit/UX_RECOMMENDATIONS.md`.

## Held

- Offline examinations. Exam timing and state synchronisation are not designed;
  caching private exam data would be a new failure mode, not a feature.
- Any change that would replace the authentication architecture or the payment
  provider — both need approval first.
