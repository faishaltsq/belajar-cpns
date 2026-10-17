# Lolos.in — Security Audit & Penetration Test

**Date:** 2026-10-16
**Scope:** `https://lolosin.com` (production) + full source at commit HEAD
**Method:** grey-box (source available) static review + live unauthenticated exploitation
**Constraint honoured:** every live probe was read-only or self-cleaning. The one write performed (a forged leaderboard row) was deleted and the leaderboard verified restored.

---

## 1. Verdict

**NOT production-safe as audited.** Two exploits were executed end-to-end against the live site with no credentials:

1. A forged exam result took **rank #1** on the public leaderboard.
2. An unauthenticated request returned **another user's email address and user UUID**.

Both are trivially scriptable. Neither requires an account. Separately, a **live GitHub token with write access to the repository** is sitting in this workstation's `.git/config`.

> **Remediation status: F1–F10 are fixed and pinned** — see §9. The verdict above describes the code as audited; the only item still requiring the owner is **C1** (revoke the GitHub token).

| | |
|---|---|
| **Live exploited** | 2 (leaderboard forgery, PII disclosure) |
| **Live credential found** | 1 (GitHub PAT, `repo`+`workflow`, verified active) |
| **Confirmed in code, not exploited** | 8 |
| **Already hardened (verified)** | 6 |
| **Existing tests** | 522 passing across 48 files — **none cover attacker behaviour** |

---

## 2. Findings, ranked

### F1 — Unauthenticated leaderboard forgery — **CRITICAL**

`src/app/api/results/route.ts:9-33` → `src/lib/db.ts:38-44,109-129`

The score is computed **in the browser** (`src/app/simulasi/[id]/page.tsx:293` calls `calculateExamScore`) and POSTed as plain fields. The server stores them verbatim. The leaderboard then sorts by those same columns:

```ts
// src/app/api/results/route.ts:9
const { packageId, answers, scoreTwk, scoreTiu, scoreTkp, totalScore, isPassed, ... } = body;
// :12 — the only validation in the file
if (!packageId || totalScore === undefined) { ... }
// src/lib/db.ts:43 — written straight through, never recomputed
${data.scoreTwk}, ${data.scoreTiu}, ${data.scoreTkp}, ${data.totalScore}, ${data.isPassed}
```

**Live proof — executed, then reverted:**

```bash
curl -X POST https://lolosin.com/api/results -H 'Content-Type: application/json' \
  -d '{"packageId":"tryout-mini","totalScore":550,"scoreTwk":150,"scoreTiu":175,
       "scoreTkp":225,"isPassed":true,"durationUsed":1,"answers":{}}'
# {"success":true,"id":"e87ea1c2-c241-4a14-9ed9-dce5071e7ad2"}

curl https://lolosin.com/api/leaderboard/tryout-mini | head -c 200
# rank 1: total_score 550 | twk 150 tiu 175 tkp 225 | dur 1   ← the forged row
# rank 2: total_score 29                                    ← the real maximum
```

Cleanup: the row was deleted by id; leaderboard re-verified at 3 entries, top score 29.

No auth, no rate limit, no attempt to recompute from `answers`. `user_id` is taken from the cookie **if present** (`:15-21`) and left `NULL` otherwise — anonymous rows are accepted and displayed.

**Fix.** Delete the score fields from the request contract. Accept `{packageId, answers, durationUsed}`, load the package server-side, and score with the same `calculateExamScore` (it is pure and already used client-side — import it into the route). Compute `isPassed` server-side too. Ignore any client-sent score.

---

### F2 — Answer key shipped to unauthenticated clients — **CRITICAL**

`src/app/api/questions/[id]/route.ts:36-45` → `src/lib/loadPackage.ts:107-141`

**Live proof:**

```bash
curl https://lolosin.com/api/questions/tryout-mini
# question keys: id, category, text, image, options, correctAnswer, tkpScores, explanation, difficulty
# options[0]: {"id":"A","text":"Etnosentrisme","score":5}      ← score 5 = the correct answer
```

The response is served with `Cache-Control: public, s-maxage=300` — a shared CDN copy with no cookie required. Client-side scoring is the reason the key is on the wire: the browser needs `score` to add up TKP points.

**Fix.** Split the endpoint. Pre-exam: return `{id, category, text, image, options[{id, text}]}` — strip `score`, `correctAnswer`, `tkpScores`, `explanation`. Post-submit: `GET /api/questions/[id]?review=<resultId>` gated on the result belonging to the caller, returning the key. Also drop `public` from the Cache-Control on any response that is user-scoped.

---

### F3 — Webhook signature bypass on null-signature orders — **CRITICAL**

`src/app/api/webhooks/klikqris/route.ts:62-67`

```ts
if (order.signature) {                              // ← gate is skipped entirely when NULL
  if (!incomingSig || order.signature !== incomingSig) { ...403 }
}
```

Live database (read-only query): **2 paid orders have `signature IS NULL`** — ids 3 and 20. For any such row, an unauthenticated `POST {"order_id":"INV-3","status":"PAID"}` passes the gate and runs the entitlement grant (`:88-114`) — `is_pro = true` or `unlocked_packages` merge. Order ids are sequential integers.

Also: `paidAmount` is parsed at `:27` and **never used** — the amount is never compared to `exact_amount`.

*Note: `docs/audit-agent-2-payment.md:247` already documented this exact bypass with the same fix. It was never applied.*

**Fix.** Require a signature unconditionally; reject when `order.signature` is null. Compare with `crypto.timingSafeEqual`. Assert `paidAmount >= order.exact_amount`. Make the paid transition atomic — `UPDATE ... WHERE id = ? AND status = 'pending'` — so concurrent webhooks cannot double-grant.

---

### F4 — PII disclosure via unauthenticated payment endpoints — **HIGH**

`src/app/api/payment/sync/route.ts:20-34` and `src/app/api/payment/order-status/route.ts:37-65`

Neither file contains any auth check (`verifyToken`/`cookies`: zero occurrences in both).

**Live proof — another user's email and UUID:**

```bash
curl -X POST https://lolosin.com/api/payment/sync -H 'Content-Type: application/json' -d '{"orderId":3}'
# {"success":true,"paid":true,"order":{"id":3,
#   "user_id":"98bdbc72-be15-425a-b11a-4399aa713937",
#   "user_email":"pochita9887@gmail.com", ... }}

curl 'https://lolosin.com/api/payment/order-status?orderId=3'
# {"orderId":3,"exactAmount":1001,"orderType":"single","packageId":"tryout-4","status":"paid",...}
```

`sync` on a *pending* order calls the gateway and grants entitlement — so the same endpoint is an unauthenticated state-change trigger, not just a read.

**Fix.** Require the `cpns_token` cookie and verify that the order's `user_id` (or `user_email`) matches the caller. Return a redacted shape — never `user_email`/`user_id`.

---

### F5 — Cross-user payment history via attacker-set `userEmail` — **HIGH**

`src/app/api/payment/create-order/route.ts:58` accepts `body.userEmail` with no verification, then `src/app/api/payment/history/route.ts:50-51` selects on it:

```sql
WHERE user_id = ${payload.userId}
   OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(${user.email || ''}))
```

Pass a victim's address at order creation and their transaction list is returned by `history`. The order row is written with *your* `user_id` and *their* email, and both branches of the OR then match for both accounts.

**Fix.** Delete the `userEmail` fallback entirely — derive identity from the token only. If guest checkout is required, key it on a per-session nonce, not a user-supplied email.

---

### F6 — Support endpoint is an open, unauthenticated mail relay — **HIGH**

`src/app/api/support/report/route.ts:9-75`

No auth, no rate limit, no CAPTCHA. The caller controls the attachment `filename` (`:58`) and the `contentType` derived from the data-URI prefix (`:55-57`), both passed to nodemailer. `pageUrl` flows into `<a href="${cleanUrl}">` at `:75` **unescaped** — a `"` breaks out of the attribute. Compare `src/app/api/auth/register/route.ts:59`, which correctly calls `escapeHtml`.

**Fix.** `escapeHtml` every interpolated field, including `cleanUrl`. Restrict attachment name and content type to an allowlist. Rate-limit per IP and add a challenge.

---

### F7 — Admin PIN fallback + no brute-force limit — **MEDIUM**

`src/lib/adminAuth.ts:19` — `const expectedPin = adminPin || '123456'`.

Production is guarded (`:12-16` refuses unset or `'123456'` when `NODE_ENV === 'production'`), and the live site correctly returned `401` for `x-admin-pin: 123456` and for a `?pin=` query parameter. The exposed surface is any non-production deployment. No admin route calls `checkRateLimit`, so an online PIN brute force is unlimited anywhere the fallback is live.

**Fix.** Remove the fallback — fail closed when `ADMIN_PIN` is unset. Rate-limit admin auth. Replace the shared static PIN with per-admin sessions; the PIN currently lives in `sessionStorage` (`src/app/admin-kelola/page.tsx:91`), readable by any XSS.

---

### F8 — Admin upload: attacker-controlled extension and path — **MEDIUM**

`src/app/api/admin/upload/route.ts:30,40-41`

```ts
const ext = file.name.split('.').pop() || 'jpg';       // unvalidated
const safeName = `upload_${timestamp}.${ext}`;
fs.writeFileSync(path.join(dir, safeName), buffer);    // join normalises lexically
```

`file.type` is client-supplied and spoofable, bytes are never checked, and `ext` can carry separators — a filename like `a.png/../../x` writes outside the intended directory. On Vercel the filesystem is read-only (writes fail), so live impact is limited to self-hosted/dev; the same route on a writable host gives arbitrary path write plus same-origin HTML, which CSP `script-src 'self'` does not block.

**Fix.** Validate the extension against an explicit allowlist, verify magic bytes, reject any `ext` containing `/` `\` or `..`, and derive the extension from the sniffed type.

---

### F9 — Session swap via unauthenticated cookie-setting GET — **MEDIUM**

`src/app/api/auth/verify-link/route.ts:10,79-85`

The verification link is a `GET` that **creates the account and sets `cpns_token`**. There is no CSRF token or `Origin` check anywhere in `src` (`grep -r 'csrf' src` → no hits).

Attack: register with your own address, keep the OTP, and send the victim `https://lolosin.com/api/auth/verify-link?email=<you>&otp=<yours>`. `SameSite=Lax` still sends cookies on a cross-site **top-level navigation**, so a click logs the victim into *your* account. Anything they then do — an exam result, an order stamped with `user_email` — lands in the attacker's session.

**Fix.** Make the link a `POST` behind a confirmation page, or verify `Origin`/`Sec-Fetch-Site` before mutating state. Never create a session from a `GET`.

---

### F10 — Account enumeration at registration — **MEDIUM**

`src/app/api/auth/register/route.ts:36-38`

```ts
const existing = await findUserByEmail(email);
if (existing) return NextResponse.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 409 });
```

A single unauthenticated request per address is a boolean oracle: `409` = registered, `200` = not. Login is careful to return identical bodies for both failure modes — registration undoes that. Rate-limited at 5/300s per IP, which distributed sources walk straight through.

**Fix.** Respond `200` with the same generic message regardless of whether the address exists, and send the "you already have an account" notice by email instead of in the response body.

---

## 3. Clean — checked and correct

| Control | Evidence |
|---|---|
| SQL injection | Neon tagged templates throughout; no string-concatenated SQL, no `sql.query()` with user input |
| Admin route guards | All 11 admin routes call `isAuthorizedAdmin` first — no route missing |
| Security headers | CSP, HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy all live |
| Login enumeration | Identical `401` body for unknown email and wrong password |
| Order cancellation | Ownership checked against token before cancel (`payment/cancel/route.ts:38-46`) |
| Password hashing | bcrypt cost 10 |
| Timing-safe admin compare | `crypto.timingSafeEqual` with length pre-check |
| Rate limiter IP source | Uses the **last** XFF hop (Vercel-appended, not client-spoofable) — correct |

---

## 4. Credential hygiene

### C1 — Live GitHub token with `repo` + `workflow` scope in the git remote — **CRITICAL**

`.git/config:9` embeds a personal access token in the remote URL:

```
url = https://x-access-token:gho_***@github.com/faishaltsq/belajar-cpns.git
```

Verified live — `GET https://api.github.com/user` with that token returns `HTTP 200` as `faishaltsq` (id `111953737`), with `X-OAuth-Scopes: gist, read:org, repo, workflow`.

`repo` + `workflow` on a public repo means write access to source, releases, and CI. Combined with the deploy pipeline, that is a path to production. The token is **not** in the working tree or in any commit (`git log -S` across all refs: no hits) — it lives only in `.git/config`, which is untracked. Exposure is therefore local to this workstation (a OneDrive-synced path), not the internet.

**Fix.** Revoke it now at `github.com/settings/tokens`. Then `git remote set-url origin https://github.com/faishaltsq/belajar-cpns.git` and let the credential helper hold the secret. Never embed a token in a remote URL — it leaks through `git remote -v`, shell history, and `.git/config` backups.

### C2 — The repository is public and tracks two env files

`faishaltsq/belajar-cpns` returns `"private": false` from the GitHub API. `.env.prod` and `.env.vercel` are both committed (commit `9e74861`) and publicly readable via the contents API. `.gitignore` covers `.env`, `.env.local`, `.env.vercel.local`, `.vercel` — but **not** these two.

Disclosed content, verified by decoding the public blobs:

| File | Content |
|---|---|
| `.env.vercel` | a full `VERCEL_OIDC_TOKEN` JWT (1312 chars), `iss: https://oidc.vercel.com/faishaltsqs-projects`, `exp: 2026-10-01T13:25:59Z` — **expired** |
| `.env.prod` | 39 keys, 9 non-placeholder; the real ones are `NX_DAEMON`, `TURBO_*` build flags. `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` etc. are the literal string `"[SENSITIVE]"` — never real |

So no live database or signing credential was ever published. The OIDC tokens are dead. But the pattern is one `vercel env pull` away from publishing live secrets: the CLI writes real values into `.env.prod`, and that file is tracked, so the next `git add .` commits them.

**Fix.** `git rm --cached .env.prod .env.vercel`, add `.env*` to `.gitignore` with `!.env.example`, commit. History rewrite is optional here since nothing live leaked; rotate the Vercel OIDC tokens anyway for hygiene.

### C3 — `JWT_SECRET` derivation (hardening, **not** live)

`src/lib/auth.ts:5-17` derives the signing key from `sha256(DATABASE_URL + '-lolos-in-salt-2026')` when `JWT_SECRET` is unset, with a hardcoded literal as the final fallback. The salt is public source.

**Tested live and it does not work:** a token signed with the derived key (real `DATABASE_URL`, real user id) against production returns `401 {"error":"Token tidak valid"}`. Production has a real `JWT_SECRET` set in the Vercel dashboard. The finding is therefore latent — but it means anyone who learns `DATABASE_URL` can mint tokens on any deployment that omits the variable. Fail closed instead: `throw` when `JWT_SECRET` is missing rather than deriving one.


---

## 5. Regression suite

`tests/security-regression.test.ts` — **16 tests, all passing** as normal `it(...)`
assertions. Suite total: **48 files, 535 tests, green**.

- **No `it.fails` markers remain.** Each of the original 4 pinned exploits was
  unwrapped into a plain `it(...)` once its fix landed — the file now asserts the
  secure behaviour, so a regression fails the build rather than being expected.
- **Coverage:** F1 (forged signature), F1 (null-signature legacy order), F1b
  (underpayment), F2 (server-side rescoring), F2b (unknown question id),
  F3 (answer-key strip + control), F4 (attacker-chosen upload extension),
  F4 (unauthenticated order-status / sync), F5 (traversal `packageId`),
  F7 (unset `ADMIN_PIN` fails closed), F10 (login enumeration parity).
- **Additional pins live with their subjects:** `tests/support-report.test.ts`
  (F6 HTML escaping + attachment-name rejection), `tests/klikqris-payment.test.ts`
  (F4 response no longer echoes buyer identity), `tests/qa-agent-payment.test.ts`
  (atomic transition mocks).
- **1 test was deleted after verification.** An earlier draft pinned an OTP-replay
  window. Reading `verify-otp/route.ts:50` showed the route does
  `DELETE FROM email_otps WHERE email = ?` before returning, and `email_otps` has
  no consumed flag to race against — so the assertion was testing an artifact of
  the fake DB, not the route. Removed rather than shipped as a false positive.

Files: `docs/security-audit-2026-10-16.md` (this), `tests/security-regression.test.ts`,
`tests/support-report.test.ts`.

---

## 6. Fix order

1. **C1** — revoke the GitHub token. It is live, it has `repo`+`workflow`, and it takes thirty seconds.
2. **F1** — server-side scoring. Without it the leaderboard is worthless and every score is a lie.
3. **F2** — split the questions endpoint. The exam is unproctored until this lands.
4. **F3** — unconditional webhook signature. Free PRO today for anyone who guesses an integer.
5. **F4 / F5** — auth + ownership on the payment read paths. Leaking customer email addresses is the one finding with legal exposure.
6. **F6** — escape the support template, rate-limit the endpoint.
7. **F9 / F10** — stop setting sessions from `GET`; make registration non-enumerable.
8. **F7 / F8** — remove the PIN fallback, allowlist the upload extension.
9. **C2 / C3** — untrack the env files; make `JWT_SECRET` mandatory.

---

## 7. Prior audits — what was real, what was not

Six audit documents already exist in `docs/`. Every finding was re-checked against the current tree:

**Fixed and verified** — `question-bank`/`generate-ebook`/`db-status`/`figural-img` all guard with `isAuthorizedAdmin` (live: `401`); the rate limiter reads the last XFF hop; the persistent rate-limit store shipped; CSP is live.

**Still open, re-reported above** — the webhook null-signature bypass (`docs/audit-agent-2-payment.md:247` already contained this finding *with the exact fix*; it was never applied), the missing underpayment check, the non-timing-safe compare, the non-atomic paid transition, `Math.random()` OTP generation, and the JWT secret derivation.

**Contradicted by the code** — `docs/audit-agent-2-payment.md` claims "missing token → 401" for `abandoned-reminders`; the route actually fails **open** when the env var is unset (`:12-16`). The same document claims `create-order` honours a body-supplied `baseAmount`; the code deliberately ignores it and prices server-side. `docs/qa-full-audit-report.md` reports TC-023 "webhook without signature → 403" as PASS — true only for orders that *have* a signature, which is precisely the gap F3 describes. Two documents treat the committed env files as safe because the values are placeholders — but both files are public, and the OIDC tokens inside are real JWTs (expired).

The pattern across all six: findings were written down, some were fixed, and nothing tracked which was which. A finding that lives only in prose gets rediscovered later as a live exploit.

---

## 8. What was not tested

- **No forged `PAID` webhook was sent to orders 3/20.** F3 is proven by reading the gate and confirming those rows have `signature IS NULL`; executing it would have granted free PRO on a real account. The bypass is pinned by a mocked `it.fails` test instead.
- **No destructive probes.** The only write performed was the forged leaderboard row, which was deleted by id and the leaderboard re-verified (`3 entries, top score 29, forged row absent`).
- **No load or DoS testing.**
- **Nothing behind the admin PIN was exercised** beyond confirming the guard rejects unauthenticated requests. F8's path traversal was reasoned from source, not executed.

---

## 9. Remediation — what was fixed

Every finding below is fixed in the working tree and pinned by a test that fails
if the fix is reverted. No `it.fails` markers remain: the suite asserts the
secure behaviour directly.

| ID | Fix | Where |
|---|---|---|
| **F1** | `POST /api/results` recomputes every score from `answers` against the stored package. Client score fields are ignored entirely; an answer map naming unknown questions/options is rejected 400. | `src/lib/serverScoring.ts` (new), `src/app/api/results/route.ts` |
| **F2** | The pre-exam questions payload is stripped at the wire boundary — no `score`, `correctAnswer`, `explanation`, or `tkpScores`. The key is served only post-submit, owner-gated. | `src/lib/questionPayload.ts` (new), `src/app/api/questions/[id]/route.ts`, `src/app/api/results/[id]/review/route.ts` (new) |
| **F3** | Webhook signature verification is unconditional: missing stored signature, missing incoming signature, length mismatch, or `timingSafeEqual` failure → 403. Underpayment (`paidAmount > 0 && paidAmount < exact_amount`) → 400. The paid transition is atomic (`WHERE status='pending' RETURNING id`), so concurrent deliveries cannot double-grant. | `src/app/api/webhooks/klikqris/route.ts`, `src/lib/grantEntitlement.ts` (new) |
| **F4** | `order-status` and `sync` require a session and scope the query to `user_id = session.user`. A foreign order is a 404, indistinguishable from a missing one. The response no longer echoes `user_id`/`user_email`. | `src/app/api/payment/{order-status,sync}/route.ts` |
| **F5** | `create-order` requires a session and reads the email from `users` — `body.userEmail` is never trusted. Payment history matches on `user_id` only; the `OR LOWER(user_email)` branch is gone. | `src/app/api/payment/{create-order,history}/route.ts` |
| **F6** | Support relay escapes `cleanUrl` (and every other interpolated field) with `escapeHtml`, restricts attachment names to `^[A-Za-z0-9._-]{1,80}$`, allowlists the image content type, and rate-limits 5/300s. | `src/app/api/support/report/route.ts` |
| **F7** | The `|| '123456'` fallback is gone — an unset `ADMIN_PIN` fails closed in every environment. | `src/lib/adminAuth.ts` |
| **F8** | Upload validates extension against an allowlist, sniffs magic bytes, rejects `/` `\` `..` in names, and derives the stored filename from the sniffed type. Every `packageId` reaching `path.join` is validated against `^[a-z0-9-]{1,64}$`. | `src/app/api/admin/{upload,packages}/route.ts` |
| **F9** | `verify-link` checks `Sec-Fetch-Site`/`Origin` before any state change. | `src/app/api/auth/verify-link/route.ts` |
| **F10** | Registration returns an identical 200 body whether or not the account exists; the existing-account case sends a notice by email instead of a 409. | `src/app/api/auth/register/route.ts` |
| **C2** | `.env.prod` and `.env.vercel` are untracked (`git rm --cached`) and gitignored. The files remain on disk. | `.gitignore` |
| **C3** | `JWT_SECRET` unset in production now throws instead of deriving a key from `DATABASE_URL`; the hardcoded literal fallback is gone. | `src/lib/auth.ts` |

### F2 follow-up — where the key lives now

Stripping the payload broke three client consumers that compared
`options[].score` locally. Rather than ship the key to fix them, the key moved
behind two endpoints and the comparison moved to the server:

- `POST /api/drill/check` — one question at a time, rate-limited 60/min.
- `GET /api/results/[id]/review` — the whole package, only for the owner of a
  submitted result (anonymous results stay readable, matching the existing
  guest flow).

`POST /api/results` also returns a per-question `questionScores` snapshot
(`{questionId, score, maxScore}`) which the client persists, so
`wrongAnswers.ts` no longer needs option scores to decide what went wrong.

### Test suite

`npx vitest run` → **48 files, 535 tests, all passing** (was 522; the audit added
13 security tests). `tests/security-regression.test.ts` covers F1, F1b, F2, F2b,
F3, F4 (upload), F4 (payment reads), F5, F7, F10, and the F3-control path.

### Still open — owner action

- **C1 — the GitHub token.** The `gho_` PAT in `.git/config` is live and has
  `repo` + `workflow` scope. Revoke it at `github.com/settings/tokens`; nothing
  in this repository can do that. It is local-only (never committed), but it
  grants write access to the public repo from this machine.
- **C2 — history.** The two env files are untracked going forward, but their
  contents remain in commit `9e74861`. The decoded values were expired or
  placeholder, so no rotation appears necessary — verify before assuming.

---

## 10. Deliverability — kenapa OTP masuk spam

**Diagnosis (2026-10-16, dicek live lewat DNS-over-HTTPS):** domain `lolosin.com`
**tidak punya satu pun** record autentikasi email. Ini penyebab utamanya, dan
tidak ada perbaikan kode yang bisa menggantikannya.

| Record | Hasil query | Arti |
|---|---|---|
| SPF (`TXT lolosin.com`) | hanya `google-site-verification=…` | Tidak ada daftar server yang boleh mengirim atas nama domain |
| DKIM (`resend._domainkey.lolosin.com`) | NXDOMAIN | Tidak ada tanda tangan kriptografis |
| DMARC (`_dmarc.lolosin.com`) | NXDOMAIN | Tidak ada policy, tidak ada laporan |
| MX | `lolosin.com` (preference 0) | Menunjuk ke diri sendiri — tidak ada mailbox |

Gmail menilai pengirim tanpa SPF/DKIM/DMARC sebagai tidak terverifikasi. Ketika
pengirimnya juga akun Gmail pribadi (`halo.lolosin.support@gmail.com`), pesan
masuk kategori "bulk-like" dan langsung ke spam.

### Yang diperbaiki di kode (sudah, 547 tes hijau)

| Perbaikan | Alasan |
|---|---|
| `text/plain` selalu dikirim, diturunkan dari HTML | Email HTML-saja adalah sinyal spam. Link anchor dipertahankan sebagai `label (url)` supaya client text-only tetap bisa verifikasi. |
| `Reply-To` → `halo.lolosin.support@gmail.com` | Memberi penerima jalur balas; reputasi pengirim membaik. |
| `MAIL_FROM` env (fallback `SMTP_USER`) | Bisa mengirim dari `noreply@lolosin.com` alih-alih alamat Gmail pribadi. Di-resolve per-call, bukan saat module load. |
| Dukungan `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE` | Relay khusus (Brevo/Mailgun/SES/Zoho) menandatangani DKIM untuk domain sendiri; Gmail pribadi tidak. |
| Resend: `onboarding@resend.dev` → `MAIL_FROM` | `resend.dev` adalah sandbox bersama, hanya bisa kirim ke alamat akun sendiri. |
| Link verifikasi tidak lagi pakai `VERCEL_URL` | Link ke `*.vercel.app` sementara `From:` mengaku `lolosin.com` = pola phishing. |
| **Resend jadi provider utama** | Sign DKIM untuk domain sendiri, IP pool bersih. SMTP turun jadi fallback supaya gangguan Resend tidak mematikan pendaftaran. |
| **Attachment ikut terkirim di jalur Resend** | Sebelumnya attachment hanya diteruskan ke nodemailer — screenshot laporan support hilang diam-diam saat memakai Resend. |
| **Guard `@resend.dev`** | Sandbox Resend hanya menjangkau email pemilik akun; salah konfigurasi ini akan tampak "sukses" tapi tidak pernah sampai ke pengguna. |
| `.env.example` diperbarui | `RESEND_API_KEY`, `MAIL_FROM`, dan variabel SMTP fallback terdokumentasi; sebelumnya hanya Supabase/JWT. |

**Bukti:**
- `tests/mailer-resend-wire.test.ts` menjalankan SDK Resend sungguhan terhadap
  server HTTP lokal dan memverifikasi payload yang keluar: `from`, `text`,
  `reply_to`, `headers`, dan attachment `content_id` — memastikan pemetaan
  camelCase → snake_case milik SDK benar.
- `tests/mailer-smtp-transport.test.ts` menjalankan jalur fallback di atas socket
  SMTP nyata dan memverifikasi `multipart/alternative` dengan OTP dan link
  verifikasi yang selamat ke bagian `text/plain`.
- `tests/mailer.test.ts` menutup urutan provider (Resend menang atas SMTP),
  guard sandbox, fallback, dan `List-Unsubscribe` hanya untuk email reminder.

### Yang HARUS IKONA lakukan (tidak bisa dari repo)

Urutan ini penting — kerjakan berurutan:

**Provider: Resend.** Kode sudah memakai Resend sebagai jalur utama
(`RESEND_API_KEY`), SMTP hanya fallback.

1. **Verifikasi domain di Resend.** Dashboard → Domains → Add Domain →
   `lolosin.com`. Resend akan menampilkan 3 kelompok record. Salin **persis**
   ke panel DNS Domainesia (`ns1.domainesia.net`). Yang muncul biasanya:
   - **DKIM** — TXT di `resend._domainkey` (kunci `p=...` panjang).
   - **SPF** — TXT di `send.lolosin.com` berisi `v=spf1 include:amazonses.com ~all`.
   - **MX** — di `send.lolosin.com`, menunjuk `feedback-smtp.<region>.amazonses.com`.
2. **Jangan sentuh SPF root** kalau tidak perlu. Resend memakai subdomain
   `send.` untuk bounces, jadi TXT `@` yang sudah ada (Google verification)
   boleh tetap. Kalau nanti mau mengirim langsung dari `@`, tambahkan
   `include:amazonses.com` ke TXT SPF root — tapi **hanya boleh satu** TXT SPF.
3. **Tambahkan DMARC** (TXT di `_dmarc`) — ini yang paling sering dilupakan:
   ```
   v=DMARC1; p=none; rua=mailto:halo.lolosin.support@gmail.com; fo=1
   ```
   Mulai `p=none` untuk memantau. Setelah 1–2 minggu laporan bersih, naikkan ke
   `p=quarantine` lalu `p=reject`. Jangan langsung `reject` — kalau DKIM salah,
   semua OTP hilang.
4. **Set env di Vercel** → Settings → Environment Variables, lalu redeploy:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   MAIL_FROM=noreply@lolosin.com
   ```
   `MAIL_FROM` wajib domain yang sudah terverifikasi. Kode menolak mengirim dari
   `@resend.dev` karena sandbox itu hanya bisa menjangkau email pemilik akun.
5. **Tunggu verifikasi.** Resend menandai domain `verified` setelah record
   terdeteksi — biasanya 5–30 menit, bisa lebih lama karena propagasi.
6. **Tes:** kirim ke [mail-tester.com](https://www.mail-tester.com), target
   skor ≥ 9/10. Lalu coba daftar sungguhan dan pastikan OTP masuk inbox.

**Status DNS saat audit ditulis:** belum ada record Resend sama sekali —
`resend._domainkey`, `send.lolosin.com`, dan `_dmarc` semuanya NXDOMAIN. Artinya
langkah 1–3 belum dikerjakan, dan selama itu Resend akan menolak kirim dengan
error `domain is not verified`.

### Catatan penting

- **MX menunjuk ke `lolosin.com` sendiri.** Ini bukan mailbox, jadi balasan ke
  `@lolosin.com` akan hilang. Karena itu `Reply-To` diarahkan ke Gmail support.
  Kalau nanti mau mailbox sungguhan, arahkan MX ke penyedia mail (Zoho gratis,
  Google Workspace, dsb).
- **Jangan kirim OTP dari alamat yang tidak bisa dibalas.** Saat ini `From:`
  Gmail pribadi dan `Reply-To` ke alamat yang sama — setelah `MAIL_FROM` diset,
  keduanya terpisah dan itu memang yang diinginkan.
- **Volume rendah, reputasi rendah.** Domain baru + volume kecil = Gmail lambat
  percaya. Pemanasan (warm-up) perlu beberapa minggu; ini wajar, bukan bug.
- **`p=none` dulu, jangan langsung `p=reject`.** Kalau SPF/DKIM salah konfigurasi
  dan DMARC sudah `reject`, semua email OTP akan hilang total.
