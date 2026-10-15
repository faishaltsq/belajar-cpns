# Audit Findings Report — Agent 1: Authentication, Session Lifecycle, and User Storage Hygiene

**Date:** 2026-10-15  
**Auditor:** Agent 1 (Security & Auth Specialist)  
**Target:** Lolos.in (`https://lolosin.com`) & Local Repository (`belajar-cpns-saas`)  
**Status:** ✅ PASSED with Low-Severity Hardening Recommendations  

---

## 1. Executive Summary

A comprehensive, end-to-end audit was conducted covering all authentication mechanics, token lifecycle, session security attributes, rate-limiting boundaries, client-side data isolation, and user storage hygiene across Lolos.in.

All 26 automated unit and integration tests written in `tests/qa-agent-auth.test.ts` passed successfully. Live browser and API smoke probes on `https://lolosin.com` confirmed active security headers, expected 401 unauthenticated guard behavior, resilient form validation, and layout-stable error handling.

---

## 2. Audit Scope & Target Components

| Component | Path | Responsibility |
|---|---|---|
| **Auth Cryptography** | `src/lib/auth.ts` | Password hashing (bcryptjs), JWT token signing & verification (`jose`) |
| **Auth Client Hook** | `src/lib/useUser.ts` | Client session state, `/api/auth/me` sync, `auth-change` event bus |
| **User Storage Scoping**| `src/lib/userStorage.ts` | Multi-tenant isolation (`scopedKey`), safe JSON parser, guest lock cleanup |
| **Login API** | `src/app/api/auth/login/route.ts` | Rate-limited credential validation, 7-day HttpOnly cookie issuance |
| **Register API** | `src/app/api/auth/register/route.ts` | Account creation, OTP code generation, transactional email dispatch |
| **OTP Verification** | `src/app/api/auth/verify-otp/route.ts` | 6-digit OTP verification, user provisioning, immediate session binding |
| **Magic Link** | `src/app/api/auth/verify-link/route.ts` | One-click email verification with automated login redirect |
| **Session Status** | `src/app/api/auth/me/route.ts` | Cookie session resolution, sanitized user profile retrieval |
| **Logout API** | `src/app/api/auth/logout/route.ts` | Cookie invalidation (`Max-Age=0`) |
| **Password Recovery** | `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts` | Timing-safe reset request, OTP verification, password mutation |
| **Login UI Page** | `src/app/login/page.tsx` | Client-side auth forms, redirect preservation, guest limit cleanup |

---

## 3. Deep Dive Findings & Verifications

### 3.1 Password Hashing & Bcrypt Security
- **Salt Factor:** Verified 10 salt rounds (`bcrypt.genSalt(10)`). Hashes match the specification format `^$2[ab]$10$.{53}$`.
- **Rounds Inspection:** Explicit runtime verification confirmed `bcrypt.getRounds(hash) === 10`.
- **Salt Uniqueness:** Hashing the same plaintext consecutively yields distinct salts and hashes, preventing rainbow table attacks.
- **Comparison Safety:** Invalid or malformed hash inputs fail safely to `false` without throwing uncaught server exceptions.

### 3.2 JWT Session Lifecycle & Jose HS256 Validation
- **Algorithm:** Verified strict `HS256` algorithm enforced in protected headers.
- **Expiration:** Exact 7-day expiration window verified via claims analysis:
  $$\text{exp} - \text{iat} = 604,800\text{ seconds } (7 \times 24 \times 3600).$$
- **Tampering & Expiry Rejection:** Modifying signature bytes, signing with foreign keys, or presenting expired tokens immediately causes `verifyToken` to return `null`.
- **Secret Fallback:** If `JWT_SECRET` is unset, `getSecret()` derives a cryptographic hash from `DATABASE_URL` + static salt rather than crashing or falling back to a trivial default.

### 3.3 Public Auth Route Hygiene & Enumeration Protections
- **Login (`/api/auth/login`):**
  - Missing parameters return `400 Bad Request`.
  - Non-existent user and wrong password both return the identical generic error message: `"Email atau password salah."` with `401 Unauthorized`.
  - On success, sets cookie `cpns_token` with flags: `HttpOnly`, `SameSite=Lax`, `Max-Age=604800` (7 days), `Path=/`, and `Secure` (in production).
- **Password Reset (`/api/auth/forgot-password`):**
  - Inquiring with a non-existent email address returns `200 OK` with generic `"Jika email terdaftar, kode OTP sudah dikirim."`, completely preventing user email harvesting.
- **Rate Limiting:**
  - Login route capped at 10 requests per 60 seconds per edge-observed IP (`getClientIp`).
  - Register & OTP routes capped at 5 requests per 300 seconds.
  - Reset password capped at 5 requests per 900 seconds.
  - Triggering limit returns `429 Too Many Requests` with a valid `Retry-After` header.

### 3.4 Multi-Tenant Storage Key Isolation (`scopedKey`)
- **Key Prefixing:**
  - Guest users: `lolos_guest_<featureKey>`.
  - Authenticated users: `lolos_u_<userId>_<featureKey>`.
  - Evaluated scenarios: `scopedKey('roadmap', null)` vs `scopedKey('roadmap', 'user_A')` vs `scopedKey('roadmap', 'user_B')`. Zero collision possible across distinct tenants.
- **Parser Robustness:** `getScopedJSON` wraps `JSON.parse` in try/catch and safely returns fallback value on truncated or corrupted localStorage values.

### 3.5 Storage Hygiene & Guest Trial Lock Reset
- **Guest Trial Flags:** Identified 4 feature-locking trial flags:
  1. `lolos_guest_tried_drill`
  2. `lolos_guest_tried_flashcard`
  3. `lolos_guest_tried_journey`
  4. `lolos_guest_tried_psikotes`
- **Cleanup Routine:** Centralized in `src/lib/userStorage.ts` via `clearGuestTrialFlags()` and `clearAllGuestData()`.
- **Login Integration:** `src/app/login/page.tsx` invokes `clearGuestTrialFlags()` upon successful login and OTP verification, ensuring users who sign in are never blocked by guest limits.

---

## 4. Live Production Smoke Check Results

Live verification executed against `https://lolosin.com`:

### 4.1 `/api/auth/me` Endpoint
```http
GET /api/auth/me HTTP/1.1
Host: lolosin.com

HTTP/1.1 401 Unauthorized
Cache-Control: no-store, no-cache, must-revalidate
Content-Type: application/json
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()

{"error":"Tidak terautentikasi"}
```
- **Observations:** No-cache headers strictly enforced. Full security suite headers active.

### 4.2 `/login` Page Interactive Browser Verification
- **Form State:** Input fields (`email`, `password`) enforce HTML5 client validation (`required`).
- **Tab Switching:** Switching between "Masuk Akun" and "Daftar gratis" smoothly mounts the Name field and updates submit CTA to "Daftar & Kirim OTP" without errors.
- **Error Display:** Submitting invalid credentials (`invalid_user_probe_test@example.com` / `wrongpassword123`) renders `"Email atau password salah."` in an alert banner with zero layout shifts.
- **Redirect Preservation:** Query parameter `?redirect=/simulasi` is retained in router navigation state.

---

## 5. Automated Test Suite Results

File: `tests/qa-agent-auth.test.ts`  
Runner: `vitest v2.1.9`  
Total Tests: **26 passing, 0 failing** (Duration: 1.08s)

```text
✓ tests/qa-agent-auth.test.ts (26 tests)
  ✓ 1. Password Hashing & Bcrypt Security
    ✓ uses bcrypt with standard 10 salt rounds and appropriate version identifier
    ✓ verifies valid password matching hash successfully
    ✓ rejects invalid password against valid hash
    ✓ generates different salts and distinct hashes for identical plaintexts
    ✓ fails safely when comparing against invalid or malformed hash
  ✓ 2. JWT Token Lifecycle & Jose HS256 Validation
    ✓ signs token with HS256 algorithm in protected header
    ✓ enforces exact 7-day (604,800 seconds) expiration window
    ✓ verifies valid token and reconstructs auth payload
    ✓ rejects tampered or corrupt token payloads
    ✓ rejects expired JWT token
    ✓ rejects token signed with an invalid/different secret
  ✓ 3. Login API Route (/api/auth/login)
    ✓ returns 400 when email or password is missing or empty
    ✓ returns 401 with generic error when user does not exist (anti-enumeration)
    ✓ returns 401 with generic error when password does not match
    ✓ returns 200 and sets httpOnly 7-day cpns_token cookie on successful login
    ✓ enforces rate limiting on login attempts and responds with 429
  ✓ 4. OTP Verification Route (/api/auth/verify-otp)
    ✓ returns 400 when email or OTP is omitted
    ✓ returns 400 when OTP code is incorrect or expired (no active DB record)
    ✓ verifies valid OTP, provisions user, purges OTP and sets 7-day cookie
    ✓ enforces rate limiting on OTP submissions
  ✓ 5. Multi-Tenant Storage Key Isolation (scopedKey)
    ✓ isolates guest storage keys under lolos_guest_ prefix
    ✓ isolates authenticated user storage keys under lolos_u_<userId>_ prefix
    ✓ prevents cross-tenant state bleed with getScopedJSON & setScopedJSON
  ✓ 6. LocalStorage Cleanup of Guest Trial Flags
    ✓ defines and tracks all guest trial limit keys
    ✓ clearGuestTrialFlags cleanly purges trial locks while preserving user-scoped state
    ✓ clearAllGuestData purges all lolos_guest_* keys and leaves user data untouched
```

---

## 6. Findings & Security Recommendations

| ID | Area | Finding | Severity | Recommendation | Status |
|---|---|---|---|---|---|
| **F-01** | `userStorage.ts` | Guest trial cleanup logic was duplicated as raw string arrays in `login/page.tsx`. | LOW | Export `GUEST_TRIAL_KEYS`, `clearGuestTrialFlags()`, and `clearAllGuestData()` from `src/lib/userStorage.ts`. | ✅ **Resolved** |
| **F-02** | `register/route.ts` & `forgot-password/route.ts` | OTP generation uses `Math.random()`, which is a pseudo-random generator. | LOW | Upgrade to `crypto.randomInt(100000, 1000000)` for cryptographically secure random numbers. | 💡 *Recommended* |
| **F-03** | `login/route.ts` | Timing disparity between missing user (~0.1ms) and invalid password (~150ms bcrypt verify) allows theoretical timing-based user enumeration. | LOW | Run dummy bcrypt comparison when user record is not found to normalize response latency. | 💡 *Recommended* |
| **F-04** | `auth.ts` | Secret derivation from `DATABASE_URL` if `JWT_SECRET` is omitted. | LOW | Ensure `JWT_SECRET` is explicitly configured in all Vercel production environments. | ℹ️ *Informational* |

---

## 7. Sign-off

Agent 1 audit of Authentication, Session Lifecycle, and User Storage Hygiene is **COMPLETE** and verified against live production and local regression suites.
