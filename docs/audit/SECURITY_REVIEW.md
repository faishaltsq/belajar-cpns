# SECURITY REVIEW — Lolosin.com

Scope: this repository, read and exercised locally on 2026-10-21. Testing was
limited to code the operator owns and to endpoints served by a local build of
that code. Nothing here was run against the production deployment.

Two labels are used: **VERIFIED** (reproduced in code, a test, or a browser
session) and **OPEN** (read and plausible, not reproduced — a hypothesis, not a
defect claim).

---

## 1. Fixed in this audit

### VERIFIED — Premium content was served to anyone who asked (P0-1)

`GET /api/questions/:id`, `GET /api/results/:id` and `POST /api/drill/check`
resolved the package before checking whether the caller was entitled to it, so a
guest received the full question payload of a paid paper. The UI hid the button;
the API did not.

Fixed by answering first: `src/lib/entitlement.ts` resolves access (user,
entitlement, package status, price) and each route refuses before touching the
question loader. The gate fails closed — no database, or a database error, means
free packages only. Covered by `tests/entitlement-gate.test.ts` and by the
browser test `refuses a premium paper on the server for a guest`, which asserts
HTTP 403 with no database behind it.

### VERIFIED — A replayed EXPIRED webhook could unpick a paid order (P1-7)

The PAID branch of `src/app/api/webhooks/klikqris/route.ts` was guarded by
`WHERE … AND status = 'pending'`; the EXPIRED branch was not. A replayed EXPIRED
notification for an order that had meanwhile been paid flipped it back, after
which a further PAID delivery passed the idempotency check and granted a second
entitlement. Both branches now transition only from `pending` and reply
"Already processed" when there is nothing to transition.

### VERIFIED — Two concurrent entitlement grants could drop one (P1-8)

`src/lib/grantEntitlement.ts` read `unlocked_packages`, merged in memory, and
wrote the whole array back. Two orders settling at the same moment lost one
unlock. The Neon HTTP driver offers no transaction and no `FOR UPDATE`, so the
merge was rewritten as a single atomic statement that appends only the missing
elements. The semantics were checked against a real PostgreSQL 16 instance
(locally, in Docker): under concurrency the new statement keeps both unlocks,
the old one drops one.

### VERIFIED — Guests were told they were unauthorized (P1-1, probe semantics)

`GET /api/auth/me` answered 401 whenever no session cookie existed, which is the
normal state for a visitor, and the browser logged an error for every page load
of every guest. It now answers 200 with `{ user: null }`, and marks an expired
cookie separately. No user data is returned for an invalid token.

## 2. Controls that are in place (read, not re-tested)

- **Session cookie** — `httpOnly: true`, `sameSite: 'lax'`, `secure` in
  production, on login, logout, verify-otp and verify-link. (VERIFIED by reading
  those four routes.)
- **JWT signing key** — `src/lib/auth.ts` refuses to sign or verify when
  `JWT_SECRET` is unset in production and returns an error instead of falling
  back to a weak secret. (VERIFIED: the auth test suite fails when
  `NODE_ENV=production` with no secret.)
- **Webhook authentication** — the KlikQRIS signature is compared against the
  stored one, and a `NULL` stored signature is rejected rather than treated as a
  match. (VERIFIED in code and covered by `tests/qa-agent-payment.test.ts`.)
- **Rate limiting** — `src/lib/rateLimit.ts` is database-backed with a
  memory fallback when the database is unavailable; the drill endpoint is
  limited per IP and the results endpoint calls `checkRateLimit`.
- **XSS surface** — `dangerouslySetInnerHTML` appears twice, both times
  serializing a constant JSON-LD object built in the component
  (`src/app/layout.tsx`, `src/app/page.tsx`). No user-supplied content is
  injected into the DOM that way. (VERIFIED by search.)

## 3. Open items

### OPEN — No test covers entitlement expiry after purchase

Purchase, grant and revoke paths exist, but no test asserts that an expired
entitlement stops serving a paid paper. Severity: P1. Owner of the fix: whoever
touches the entitlement table next.

### OPEN — `payment_orders` has no creation migration (P2-11)

Three migrations `ALTER` it; none creates it. A restored or new environment
cannot provision payments from the repository. Until that is fixed, an operator
cannot prove what columns exist from source alone — which is also a security
review gap, since the webhook handler reads `signature`, `order_type`,
`exact_amount` and `package_ids` from a table whose definition lives only in the
production database.

### OPEN — Data layer is bound to one transport (P2-12)

`getDb()` returns `neon(url)`, an HTTP-only client. Any non-Neon Postgres fails
on the first query. Consequence for security: the application cannot be pointed
at a second, isolated database for a restore drill or a forensic check without a
compatible proxy.

### Not investigated this session

- CSRF posture beyond `sameSite: 'lax'` on the session cookie — state-changing
  routes are JSON APIs, which browsers do not cross-origin-POST with a cookie
  under `lax`, but no explicit origin check was read in the payment routes.
- Dependency vulnerabilities — no `npm audit` was run to a recorded result.
- Password hashing parameters, OTP entropy, and the email link token lifetime —
  the code exists and has tests, but the parameters were not audited.
- Rate-limit key source under reverse proxy headers (whether `X-Forwarded-For`
  is trusted blindly) — not traced.
