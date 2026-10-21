# Content Consistency Audit — Lolosin.com

Scope: repository (`src/`) plus the live deployment `https://lolosin.com/`.
Statuses: **CONFIRMED DEFECT** = reproduced against the source with evidence;
**OK** = checked and consistent; **UNVERIFIED** = could not be established from
the repository alone. Nothing below is marked PASS without an execution that ran.

Legend for evidence: `file:line` is repository evidence at the commit audited on
2026-10-21; "script" means a scanner was run (command noted in the row).

| # | Claim / candidate | Source | Claimed value | Verified value | Verdict | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Homepage stats bar package/question count | `src/app/page.tsx:107-108` (pre-fix) | `36 Paket (3.816 Soal)` | `TRYOUT_LIST` = 37 packages / 3.898 questions (`src/lib/catalogStats.ts`) | **CONFIRMED DEFECT** — fixed this session as P1-10 | Keep reading `CATALOG_TOTAL` / `CATALOG_QUESTION_TOTAL`; covered by `tests/content-consistency.test.ts` |
| 2 | "Pilih dari N paket tryout lengkap (M di antaranya…)" | `src/app/page.tsx:417` | `{CATALOG_TOTAL}` / `{FREE_PACKAGE_TOTAL}` | Derived; 37 / 3, matching `FREE_PACKAGE_IDS = ['tryout-mini','tryout-1','tryout-2']` (`src/lib/pricing.ts:48`) | **OK** | none |
| 3 | Aggregate question count | `src/lib/catalogStats.ts:21`, OG image `src/app/opengraph-image.tsx:99` | 3.898 (derived); OG image typed `37 Paket` | Sum over `TRYOUT_LIST` equals `CATALOG_QUESTION_TOTAL`; scanner over 37 JSON files agrees | **CONFIRMED DEFECT (stale-typing risk)** — fixed as P1-10 | Typed totals banned by test |
| 4 | Catalog card `questionCount` vs questions actually loaded | `src/data/packages/*.json` (`questionCount` field) | per-package count | Scanner: 0 mismatches across 37 packages | **OK** | none |
| 5 | Passing-grade labels | `src/lib/scoring.ts:3-5`, `src/lib/examRules.ts:40-42`, `src/app/profil/page.tsx:252` | TWK 65 / TIU 80 / TKP 166, `verification: 'reference'` | Trio matches everywhere (test `passing grades have one source`); UI shows "Acuan Passing Grade" + cited source when `verification !== 'official'` | **OK** for internal consistency; **UNVERIFIED** against the official 2027 regulation | Cite the regulation for `EXAM_YEAR` or keep `verification: 'reference'` |
| 6 | Examination year labels | 33 occurrences of `2027` in `src/`; `EXAM_YEAR = 2027` (`examRules.ts:15`) | CPNS 2027 | All labels agree; no 2025/2026 labels remain | **OK** | none |
| 6b | FAQ wording "passing grade **resmi** SKD CPNS 2027" | `src/app/page.tsx:35` | official | Config declares `verification: 'reference'` for 2027 | **CONFIRMED DEFECT (P2, labelling)** | Phrase the FAQ answer as simulation/reference until a citation exists, or flip `verification` once cited |
| 7 | Prices across UI | `riwayat/page.tsx:624,630`; `simulasi/page.tsx:306-307`; `UpgradeProModal.tsx:376,400,424,537` | `Rp 5.000 / 18.000 / 59.000` typed into JSX | `PRICE_TABLE` is env-driven: `KLIKQRIS_TRYOUT_PRICE`/`BUNDLE_PRICE`/`PRO_PRICE` default 5000/18000/59000 (`src/lib/pricing.ts:22-25`) | **CONFIRMED DEFECT (P2)** — displayed price ignores env override | Render `formatRupiah(PRICE_TABLE[...])`; ban typed rupiah totals in the same test |
| 8 | Free vs Premium marketing copy | `page.tsx:417`, `FREE_PACKAGE_IDS` | 3 free of 37 | Matches | **OK** | none |
| 9 | Psikotes terminology | `src/app/psikotes/**`, `layout.tsx:37`, `page.tsx:26` | "tes psikotes online (Kraepelin, Kecermatan, PAPI Kostick)" | No claim of an officially validated diagnostic instrument anywhere in `src/` (grep for `diagnostik`/`instrumen resmi` returns nothing) | **OK** (labelling gap still listed as NOT AUDITED in BUG_REPORT) | Add an explicit "bukan instrumen diagnostik resmi" line on the results page |
| 10 | Duplicate / malformed questions | `src/data/packages/*.json` — 37 files, **3.898 questions scanned** with the real shape (plain object keyed by index, not a `questions` array) | — | 0 duplicate ids · 0 empty option sets · 0 questions whose best option scores <= 0 · **219 question texts repeat across packages** · **86 questions have no explanation** · **8 explanations contain raw LaTeX fragments** (`\times`, `rac` rendered as literal text, e.g. `tryout-10.json:279`, `tryout-11.json:769`, `tryout-12.json:104`) | **CONFIRMED DEFECT (P2)** for missing/garbled explanations; **UNVERIFIED** for the 219 repeats (reuse across packages may be deliberate) | Fix the 8 garbled strings; supply explanations for the 86; decide whether cross-package repeats are intended and say so in the doc |

## Single source of truth

Every number that can rot now has one owner, but the owner is scattered:

| Value | Owner today | Duplicated in |
|---|---|---|
| Exam year | `src/lib/examRules.ts` (`EXAM_YEAR`) | copy strings across pages (verified consistent) |
| Passing grades / limits | `src/lib/examRules.ts` + `src/lib/scoring.ts` | — (test enforces) |
| Package & question totals | `src/lib/catalogStats.ts` | — (test enforces; two typed literals removed) |
| Prices | `src/lib/pricing.ts` (`PRICE_TABLE`, env-overridable) | **7 JSX literals (defect 7)** |
| Free package ids | `src/lib/pricing.ts` (`FREE_PACKAGE_IDS`) | — |
| Entitlements | `src/lib/entitlement.ts` | API routes (server-enforced, tested) |

Recommendation: fold `pricing.ts` display values behind a single
`formatPrice(orderType)` used by every UI surface (the remaining gap), and keep
`examRules.ts`/`catalogStats.ts` as they are — they are already the single
source with regression tests. No new `siteConfig.ts` is warranted: adding one
would create a *second* owner unless `examRules.ts`, `scoring.ts` and
`catalogStats.ts` are merged into it first, which is a refactor without a
user-visible payoff. Sources and effective dates already live on
`EXAM_RULES` (`citedSource`, `verification`); extend that record with
`effectiveFrom` when a regulation for `EXAM_YEAR` is cited.

## Correction

An earlier pass of row 10 reported **OK** from a scanner that read the package
JSON with the wrong shape (`raw.questions ?? raw.items ?? []` — the files are a
plain object keyed by question index) and therefore walked **0 questions**. That
OK was vacuous and is retracted; the figures in row 10 are from a rescan against
the real shape.

## Live deployment

**NOT RUN** in this pass — the live site was not fetched, so every row above is
repository evidence only. Live-vs-repo divergence must be checked before release:
hero numbers, price strings, and the `2027` labels are the three places a deploy
that predates these fixes would still disagree with the source.
