# P2-13 — the 59 figural explanations in `tryout-figural-2.json`

**Status: OPEN — 0 of 59 closed.** No explanation was written, because no explanation could be
*justified*. This file records what was tried, what was ruled out, and exactly how to finish the job.

| | before | after |
|---|---|---|
| `missingExplanation` | **59** | **59** |
| `latexGarbled` | 0 | 0 |
| `dupIds` / `emptyOptions` / `noMaxScore` | 0 | 0 |
| `tests/content-consistency.test.ts` | 9/9 | 9/9 |

`node scripts/_content_scan.mjs` → `{"packages":37,"questions":3898}`, `missingExplanation: 59`.
Nothing in `src/data/packages/tryout-figural-2.json` was modified.

---

## 1. Headline finding: image analysis *works*, but it is not accurate enough to author from

The previous blocker ("vision unavailable: 429 / timeouts / private-URL rejection") **no longer
holds**. Vision is reachable and returns rich descriptions. The real blocker is different and worse:
**the model misreads these figures, and it misreads them confidently.**

A route is only usable if it reproduces the authoritative answer key. Measured:

| Calibration item | Key | Vision's answer | Verdict |
|---|---|---|---|
| `fig_tiu_01.png` (whole page) | E | C | wrong |
| `fig_tiu_03.png` (whole page) | A | D | wrong |
| `fig_tiu_01.png` (options row, 3x zoom) | E | E | **correct** |
| `fig_persamaan_01.png` (labelled prompt+options sheet) | B | C, then `{TL,MC,BR}` | wrong, and self-contradictory |
| `fig_variasi_01.png` (whole page) | B | E | wrong |

**2 / 5, and the two misses that mattered were not near-misses.** On `fig_persamaan_01` the model
wrote a 4,000-word answer that visibly argued with itself ("I think C… wait, maybe D… final: C"),
then, asked to read only the 3x3 prompt grid, returned `{TL,MC,BR}` — three cells for a four-cell
figure. That is not a formatting problem; it is the model failing to resolve the image.

Why it fails: these are dense, multi-panel figures. A full page is ~1400x737 with five options
across, i.e. **~200 px per option** after downscaling. Distinctions that decide the answer are
1-2 mm at source — "circle vs ellipse", "notch upper-left vs upper-right", "4 filled cells vs 5".
Cropping to one panel and upscaling 2-3x is *necessary* and measurably helps (`fig_tiu_01` went
from wrong to right), but it is **not sufficient** (`fig_persamaan_01` was still wrong at full
resolution).

Consequence: any explanation written from a vision read would assert a rule that may not be the
rule. On an item whose key is B, a confident description of why C is right is worse than no
explanation — it teaches the wrong pattern and is exactly the failure mode this bug is about. So
nothing was written.

## 2. Routes tried, with the exact outcome

| # | Route | Result |
|---|---|---|
| a | `vision_analyze` on absolute Windows path `C:/Users/.../public/images/questions/fig_tiu_03.png` | **Works.** Full-page read returned, but the answer was wrong (key A, said D). |
| b | `vision_analyze` on `https://lolosin.com/images/questions/<file>.png` | **Works.** This is the reliable access route — no local-path, `file:///`, or private-URL problem. |
| c | `vision_analyze` with `region=[...]` on the live URL (crop at source resolution) | **Works**, and is the highest-fidelity option. Used for all calibration. |
| d | Local upscaled crops written to `$TMPDIR` and passed by absolute path | **Works.** 2-3x LANCZOS upscale of a single panel is the best input for shape detail. |
| e | Pixel/geometry analysis (PIL + NumPy + OpenCV: contour detection, ink profiling, cell-occupancy IoU) | Runs, but **does not reproduce keys** — see §3. |
| f | Query the live Neon `question_bank` (322 rows, all with `explanation`) | **Dead end.** The figural rows hold generic boilerplate, e.g. *"Lihat pola hubungan antara gambar pertama dan kedua, kemudian terapkan pola yang sama."* — not item-specific. |

Earlier failures (timeout on local path, `file:///`, "unsafe private URL" on `127.0.0.1`,
timeout on forward-slash path) were **not reproduced** in this session. Treat them as fixed.

## 3. What was ruled out (so nobody repeats it)

**a) No authored rationale exists anywhere in the repo or its sources.**
- `src/data/figural_bank_full.json` (82 entries, the provenance bank) has `explanation` on only
  **23** of 82 — and **0 of the 59**. All 59 are `null` there too.
- `src/data/figural_bank.json` (34 entries) is fully explained but is a *different, older* set.
- The live DB (`question_bank`) carries boilerplate, not rationale.
- The source PDFs were located and read:
  - `TIU SKD CPNS.pdf` → Pembahasan on **p.205**; its 15 TIU keys reproduce the JSON exactly
    (`EEADBC-BCDCCBCD`, with the book's broken item 7 `Jawaban: -` dropped → 14 items). It gives
    prose for **only items 1, 2, 5, 9, 14** — precisely the five that already have explanations.
  - `Soal-CPNS-Paket-1.pdf` → keys on **p.60–61** for Variasi (20), Seri (15), Persamaan (15).
    These reproduce the JSON **character for character**
    (`BAECBDEDBCAAECCEBDAE` / `CEBADCEEDACBABE` / `BEACDEABEABAADB`). The section is a **bare key
    list — no rationale text at all.**
  - `5_6327771640704796042.pdf` and `SOAL FIGURAL 1.pdf` are not on this machine.

  So: **provenance of every key is established and trustworthy; authored prose for the 59 does not
  exist.** This is genuinely authoring work, not data recovery.

**b) Programmatic solving does not generalise.** The `persamaan` rule is objective ("the answer is
the option identical to the prompt"), so it was implemented properly — contour-based panel
detection, cell-occupancy signatures at 2x2 and 3x3, validated against all 15 authoritative keys.
Result: **0/15**. The layouts are not uniform: `fig_persamaan_05` puts the **options on top and the
prompt at the bottom**, option panels are sometimes 102x125 (not square), and prompt frames are
often drawn as double borders. A single geometric extractor does not fit, and a per-image extractor
is not worth it when the answer is already known. The throwaway scripts were deleted rather than
left in `scripts/` to mislead the next reader.

**c) `parseExplanation` constrains the string format.** `src/lib/explanationParser.ts` splits on a
line starting with `trik cepat|tips?|kunci|kata kunci|catatan|ingat|perhatikan|hint`. So an
explanation that contains **"Kunci: B"** or a line starting **"Perhatikan…"** gets truncated into
the "Trik Cepat" box and the core text is lost. **Do not begin any explanation line with those
words.** Plain prose, one paragraph, no LaTeX, no markdown headings. (`ExamQuestionReview.tsx`
renders `parsed.core`; `rekap/page.tsx` renders the raw string.)

## 4. A separate defect found while verifying — do not paper over it

`fig_tiu_03.png` (apply key **2**, scanner `#3`, key **A**) contains only **4 option panels**, but
the JSON declares **5** options (A–E). Confirmed three independent ways: ink-column gutters show 4
evenly spaced panels at x = 164/388/610/826 (pitch 224 px, so the 5th was cropped off the right
edge); a 2x crop of the options row reads as 4 panels; vision independently counted 4.

This means **option E does not exist in the image** for that item. The answer key (A) is unaffected,
but any explanation that reasons about "why E is wrong" would be describing a picture that isn't
there. Item 2 is therefore flagged **OPEN — image defect**, not merely "not yet written".

This was found by direct inspection of one file, not by a reliable sweep: two different automated
panel counters disagreed with each other and with vision on other images (one reported "no row of 5"
for 42 of 59 images, including ones that plainly have five). **Do not trust either counter**; the
per-item check below is the honest state.

## 5. Item-by-item status (all 59 OPEN)

`apply key` is the **array index** — the key `_apply_explanations.mjs` uses. `scanner ref` is
`#<id>`, what `_content_scan.mjs` prints. They are different numbers; mixing them silently writes
to the wrong question.

| apply key / array idx | scanner ref | image | key | family | status |
|---|---|---|---|---|---|
| 2 | `#3` | `fig_tiu_03.png` | A | TIU | OPEN |
| 3 | `#4` | `fig_tiu_04.png` | D | TIU | OPEN |
| 5 | `#6` | `fig_tiu_06.png` | C | TIU | OPEN |
| 6 | `#7` | `fig_tiu_08.png` | B | TIU | OPEN |
| 8 | `#9` | `fig_tiu_10.png` | D | TIU | OPEN |
| 9 | `#10` | `fig_tiu_11.png` | C | TIU | OPEN |
| 10 | `#11` | `fig_tiu_12.png` | C | TIU | OPEN |
| 11 | `#12` | `fig_tiu_13.png` | B | TIU | OPEN |
| 13 | `#14` | `fig_tiu_15.png` | D | TIU | OPEN |
| 14 | `#15` | `fig_variasi_01.png` | B | Variasi | OPEN |
| 15 | `#16` | `fig_variasi_02.png` | A | Variasi | OPEN |
| 16 | `#17` | `fig_variasi_03.png` | E | Variasi | OPEN |
| 17 | `#18` | `fig_variasi_04.png` | C | Variasi | OPEN |
| 18 | `#19` | `fig_variasi_05.png` | B | Variasi | OPEN |
| 19 | `#20` | `fig_variasi_06.png` | D | Variasi | OPEN |
| 20 | `#21` | `fig_variasi_07.png` | E | Variasi | OPEN |
| 21 | `#22` | `fig_variasi_08.png` | D | Variasi | OPEN |
| 22 | `#23` | `fig_variasi_09.png` | B | Variasi | OPEN |
| 23 | `#24` | `fig_variasi_10.png` | C | Variasi | OPEN |
| 24 | `#25` | `fig_variasi_11.png` | A | Variasi | OPEN |
| 25 | `#26` | `fig_variasi_12.png` | A | Variasi | OPEN |
| 26 | `#27` | `fig_variasi_13.png` | E | Variasi | OPEN |
| 27 | `#28` | `fig_variasi_14.png` | C | Variasi | OPEN |
| 28 | `#29` | `fig_variasi_15.png` | C | Variasi | OPEN |
| 29 | `#30` | `fig_variasi_16.png` | E | Variasi | OPEN |
| 30 | `#31` | `fig_variasi_17.png` | B | Variasi | OPEN |
| 31 | `#32` | `fig_variasi_18.png` | D | Variasi | OPEN |
| 32 | `#33` | `fig_variasi_19.png` | A | Variasi | OPEN |
| 33 | `#34` | `fig_variasi_20.png` | E | Variasi | OPEN |
| 34 | `#35` | `fig_seri_01.png` | C | Seri | OPEN |
| 35 | `#36` | `fig_seri_02.png` | E | Seri | OPEN |
| 36 | `#37` | `fig_seri_03.png` | B | Seri | OPEN |
| 37 | `#38` | `fig_seri_04.png` | A | Seri | OPEN |
| 38 | `#39` | `fig_seri_05.png` | D | Seri | OPEN |
| 39 | `#40` | `fig_seri_06.png` | C | Seri | OPEN |
| 40 | `#41` | `fig_seri_07.png` | E | Seri | OPEN |
| 41 | `#42` | `fig_seri_08.png` | E | Seri | OPEN |
| 42 | `#43` | `fig_seri_09.png` | D | Seri | OPEN |
| 43 | `#44` | `fig_seri_10.png` | A | Seri | OPEN |
| 44 | `#45` | `fig_seri_11.png` | C | Seri | OPEN |
| 45 | `#46` | `fig_seri_12.png` | B | Seri | OPEN |
| 46 | `#47` | `fig_seri_13.png` | A | Seri | OPEN |
| 47 | `#48` | `fig_seri_14.png` | B | Seri | OPEN |
| 48 | `#49` | `fig_seri_15.png` | E | Seri | OPEN |
| 49 | `#50` | `fig_persamaan_01.png` | B | Persamaan | OPEN |
| 50 | `#51` | `fig_persamaan_02.png` | E | Persamaan | OPEN |
| 51 | `#52` | `fig_persamaan_03.png` | A | Persamaan | OPEN |
| 52 | `#53` | `fig_persamaan_04.png` | C | Persamaan | OPEN |
| 53 | `#54` | `fig_persamaan_05.png` | D | Persamaan | OPEN |
| 54 | `#55` | `fig_persamaan_06.png` | E | Persamaan | OPEN |
| 55 | `#56` | `fig_persamaan_07.png` | A | Persamaan | OPEN |
| 56 | `#57` | `fig_persamaan_08.png` | B | Persamaan | OPEN |
| 57 | `#58` | `fig_persamaan_09.png` | E | Persamaan | OPEN |
| 58 | `#59` | `fig_persamaan_10.png` | A | Persamaan | OPEN |
| 59 | `#60` | `fig_persamaan_11.png` | B | Persamaan | OPEN |
| 60 | `#61` | `fig_persamaan_12.png` | A | Persamaan | OPEN |
| 61 | `#62` | `fig_persamaan_13.png` | A | Persamaan | OPEN |
| 62 | `#63` | `fig_persamaan_14.png` | D | Persamaan | OPEN |
| 63 | `#64` | `fig_persamaan_15.png` | B | Persamaan | OPEN |

## 6. How to finish this — concrete path

**Best option: get the rationale from a human author or a genuinely vision-capable pass.** The keys
are settled; only prose is missing. For each item the explanation must state the transformation rule
observed in the sequence, why the keyed option follows from it, and why the distractors do not.

**If using a vision model, gate it on the key — do not trust its prose.**
1. Crop the prompt/sequence and the options row separately, upscale 2-3x, and pass them as **two
   images**. Never the whole page: at page scale options are ~200 px wide and the model confuses
   them (see §1).
2. Ask it to **derive** the answer *before* showing it the key, then compare. **Only write an
   explanation when the derived answer equals `correctAnswer`.** On disagreement, discard and list
   the item as open. This is the one safeguard that prevents fabricated rules, and it is cheap.
3. Verify the read is self-consistent: ask for the same panel twice, or ask for a count first.
   `fig_persamaan_01` failed exactly here — the model's own answer contradicted itself.

**Apply path (already exists, do not reinvent):**
- Draft one file per batch: `docs/audit/explanations-figural-batch-NN.json` with shape
  `{"items":[{"file":"tryout-figural-2.json","number":<apply key>,"explanation":"..."}]}`
  — `number` is the **array index** from §5, not the `id`.
- Apply: `node scripts/_apply_explanations.mjs docs/audit/explanations-figural-batch-NN.json`
- The script writes **only** into empty `explanation` fields and never overwrites, reporting
  `applied N skipped 0`. `skipped > 0` means a wrong index or a double-apply — investigate before
  continuing.
- Re-run `node scripts/_content_scan.mjs` after **every** batch; `missingExplanation` must drop by
  exactly the batch size and `latexGarbled` must stay **0**. Then
  `unset NODE_ENV && npx vitest run tests/content-consistency.test.ts` (9/9).

**Known-good reference for tone and length** — the five TIU explanations that came from the book's
Pembahasan, e.g. `fig_tiu_09.png`:
*"Segitiga (3) + 6 lingkaran = 9. Segiempat (4) + 4 lingkaran = 8. Segilima (5) + 2 lingkaran = 7."*
Two sentences, states the rule, names the arithmetic, no filler. Aim for that.

**Do not** invent a pattern to clear the counter, and **do not** copy a generic line such as
"Perhatikan pola hubungan antar gambar" into all 59 — that is what the live DB already contains and
it is why this bug exists.
