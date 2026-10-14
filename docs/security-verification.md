# Security Hardening Verification Report

**Tanggal:** 2026-10-14  
**Target:** https://belajar-cpns-saas.vercel.app  
**Commit Range:** `8d5d7fc` → `c804ffe`  
**Deploy ID:** `dpl_2oJPGuaZ9AhvAiqRJuZ8GQoQQtRs` (READY)

---

## 1. Summary of Fixes

| Finding | Severity | File(s) | Fix Details | Live Status |
|---|---|---|---|---|
| **#1 Unauthenticated Question Bank Dump** | CRITICAL | `src/app/api/admin/question-bank/route.ts` | Guard `isAuthorizedAdmin(req)` pada `GET` dan `POST`. Mencegah dump 3.800+ soal dan kunci jawaban tanpa auth. | ✅ 401 Unauthorized |
| **#2 Unauthenticated LLM Ebook Generator** | HIGH | `src/app/api/admin/generate-ebook/route.ts` | Guard `isAuthorizedAdmin(req)` pada `POST` dan `GET`. Mencegah eksploitasi burn kuota model LLM dan kebocoran jumlah baris DB. | ✅ 401 Unauthorized |
| **#3 Infra Status Information Leak** | LOW | `src/app/api/admin/db-status/route.ts` | Guard `isAuthorizedAdmin(req)` pada `GET`. Menghapus bypass ponytail. | ✅ 401 Unauthorized |
| **#4 Figural Image Lookup Bypass** | MEDIUM | `src/app/api/admin/figural-img/route.ts` | Guard `isAuthorizedAdmin(req)` pada `GET`. | ✅ 401 Unauthorized |
| **#5 Spoofable Rate Limiter IP (XFF)** | HIGH | `src/lib/rateLimit.ts` | Ambil hop TERAKHIR pada header `X-Forwarded-For` (edge-observed oleh Vercel) alih-alih hop pertama yang bisa di-forge client. | ✅ Verified via unit tests |
| **#6 Ephemeral In-Memory Rate Limiting** | MEDIUM | `src/lib/rateLimit.ts`, `migrations/010_rate_limits.sql` | Store sliding window persistent di Neon Postgres via tabel `rate_limits`. Fails open ke memory store jika koneksi DB down. Caller 6 endpoint auth di-update async. | ✅ Verified (33 test files passing) |
| **#7 Missing Content-Security-Policy** | MEDIUM | `next.config.js` | Menambahkan CSP strict (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`) dengan support Next.js hydration. | ✅ Header active di production |

---

## 2. Production Smoke Check Results

```text
question-bank no-auth: 401 (expect 401)
generate-ebook GET:  401 (expect 401)
db-status:           401 (expect 401)
packages (control):  401 (expect 401)
homepage:            200 (expect 200)
simulasi:            200 (expect 200)

Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'
```

---

## 3. Test Suite

- Total: **33 test files, 290/290 passing**.
- File test baru:
  - `tests/admin-guard.test.ts` (7 tests)
  - `tests/rate-limit-ip.test.ts` (5 tests)
  - `tests/rate-limit-store.test.ts` (5 tests)
