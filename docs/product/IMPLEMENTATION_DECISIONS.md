# IMPLEMENTATION DECISIONS — Lolosin.com

One entry per decision that shaped the code in this working tree. Each records
the alternative that was rejected and why, so a later change can be made
knowingly.

---

### 1. Fail closed on entitlement, before the questions are loaded

**Decision:** `src/lib/entitlement.ts` answers "who is this and may they see
this package" first; the questions, results and drill routes refuse before any
question loader runs. No database, a driver error, or an unknown package all
resolve to "free packages only".

**Rejected:** resolving the package first and checking access afterwards
(what the code did), because a failure between the two steps hands over content.

**Cost:** a paid package cannot be served during a database outage — by design.

### 2. One atomic statement for granting an unlock

**Decision:** `grantEntitlement` appends only the missing ids in a single
`UPDATE … jsonb_agg(DISTINCT …)` statement.

**Rejected:** read → merge in memory → write back, which silently dropped a
concurrent grant. Transactions and `FOR UPDATE` were not available: the app
speaks Neon's HTTP protocol, which has neither. Verified by running both
statements concurrently against PostgreSQL 16.

### 3. The EXPIRED webhook branch transitions only from `pending`

**Decision:** both webhook branches guard their `UPDATE` with
`AND status = 'pending'` and report "Already processed" when no row moved.

**Rejected:** treating EXPIRED as harmless and unconditional. It was not: it
could unpick an order that had already been paid, which re-opened the
idempotency check for a second grant.

### 4. Scoring stays on the server

**Decision:** `/api/results` computes section scores and passing evaluation from
`examRules`; the client displays them. The browser test reads the API response
and asserts TWK 65 / TIU 80 / TKP 166.

**Rejected:** keeping a client scorer available "for offline speed" — two
scorers are two answers to the same question, and only one of them is authoritative.

### 5. Exam rules and catalog numbers have exactly one owner

**Decision:** `src/lib/examRules.ts` owns year, passing grades and limits;
`src/lib/catalogStats.ts` derives package and question counts. A test fails if
any other file restates a headline number.

**Rejected:** fixing the drifted literals one by one in 25+ files, which fixes
the count today and lets it drift again.

### 6. Streak arithmetic uses local calendar dates

**Decision:** `src/lib/journeyHelper.ts` computes keys from the local calendar.

**Rejected:** comparing a locally-written `todayStr()` against a UTC date —
that returned a streak of 0 for seven hours every morning in WIB.

### 7. `/api/auth/me` is a probe, not a protected resource

**Decision:** 200 `{ user: null }` for visitors, with an expired-session flag
for a stale cookie.

**Rejected:** keeping 401 for "no session", which is the normal state of a
visitor and logged a console error on every page for every guest.

### 8. E2E runs the app with the database switched off

**Decision:** Playwright starts `next start` with `DATABASE_URL` empty, so
everything falls back to the static package JSON and no test can write a row.
The premium gate is still exercised — refusing a paid paper with no database
behind it is the fail-closed case.

**Rejected:** pointing E2E at a live database. It writes rows (a result, an
answer set), and the driver in this app is HTTP-only Neon, which cannot talk to
a plain Postgres at all — see `docs/audit/BUG_REPORT.md` P2-12. A database can
be supplied deliberately with `E2E_DATABASE_URL` when one exists for that purpose.

**Also rejected:** `reuseExistingServer`, which would silently run the suite
against whichever hand-started server happened to hold the port.

### 9. No content rules are labelled official without a source

**Decision:** the recruitment year and passing grades live in one module marked
`verification: 'reference'`; a test forbids the same numbers being written
anywhere else.

**Rejected:** presenting them as official requirements for a year whose
regulation has not been cited in this repository.
