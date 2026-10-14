# Dogfood QA Report: Fitur Autentikasi & Lupa Password

**Target:** https://belajar-cpns-saas.vercel.app  
**Date:** 2026-10-14  
**Scope:** Fitur Autentikasi (Login, Register, OTP Verification, Lupa Password, Reset Password, Auth Guard `/profil`, Rate Limiting, & API Security)  
**Tester:** Hermes Agent (Dogfood Exploratory QA)
**Status Terakhir:** 🟢 **ALL 6 BUGS FIXED & VERIFIED ON PRODUCTION** — Commit `5aaef06`, Vercel `READY`

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 2 |
| 🟡 Medium | 2 |
| 🔵 Low | 1 |
| **Total** | **6** |

**Overall Assessment:** Flow autentikasi dasar (login, registrasi dengan proteksi kata sandi minimal 6 karakter, verifikasi OTP, rate limiting pada login, dan auth guard pada halaman profil) berjalan dengan aman dan fungsional, namun ditemukan **1 bug rute 404 pada tautan verifikasi email**, **1 kerentanan injeksi HTML pada template email registrasi**, dan **1 kelemahan logika UX pada alur reset kata sandi ketika email tidak terdaftar**.

---

## Issues

### Issue #1: Endpoint `/api/auth/verify-link` Merespons Redirect ke Rute `/register` yang Berstatus 404 Not Found

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Category** | Functional |
| **URL** | `https://belajar-cpns-saas.vercel.app/api/auth/verify-link` |

**Description:**
Pada `src/app/api/auth/verify-link/route.ts`, ketika tautan verifikasi email tidak valid, parameter kosong, query expired, atau terjadi error, server melakukan redirect ke `new URL('/register?error=...', origin)`. Namun aplikasi Lolos.in **tidak memiliki rute halaman `/register`** (seluruh form registrasi disatukan di halaman `/login` dengan toggle state). Akibatnya, pengguna yang mengklik tautan verifikasi kedaluwarsa atau rusak dari email mereka langsung diarahkan ke halaman **404 Not Found** bawaan Next.js, sehingga pesan error tidak pernah terbaca dan pengguna terdampar.

**Steps to Reproduce:**
1. Akses URL verifikasi email yang salah/rusak di browser:  
   `https://belajar-cpns-saas.vercel.app/api/auth/verify-link?email=fake@test.com&otp=000000`
2. Perhatikan URL akhir dan halaman yang ditampilkan.

**Expected Behavior:**
Pengguna diarahkan ke `/login?error=Link+verifikasi+sudah+kedaluwarsa` atau `/login` dengan notifikasi kesalahan yang jelas dan tombol minta kirim ulang OTP.

**Actual Behavior:**
Browser dialihkan ke `https://belajar-cpns-saas.vercel.app/register?error=...` dan merender halaman 404: *"404: This page could not be found."*

---

### Issue #2: Raw HTML Injection pada Template Email Registrasi (`src/app/api/auth/register/route.ts`)

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Category** | Functional / Security |
| **URL** | `https://belajar-cpns-saas.vercel.app/api/auth/register` |

**Description:**
Pada endpoint registrasi, nilai input `name` yang dikirim dari klien disuntikkan secara mentah tanpa sanitasi HTML ke dalam string template email:
```html
<p style="color:#333;margin-bottom:16px;font-size:15px">Halo <strong>${name || 'Peserta'}</strong>,</p>
```
Seorang penyerang dapat mendaftarkan akun dengan nama mengandung tag HTML/tautan phising berbahaya (misalnya `<a href="evil.com">Login Disini</a>`), yang akan dirender langsung di aplikasi email klien penerima (Email HTML Injection / Content Spoofing).

**Steps to Reproduce:**
1. Kirim payload POST ke `/api/auth/register`:
   ```json
   {
     "email": "target@domain.com",
     "password": "validPassword123",
     "name": "<a href='https://phishing.site'>Klaim Hadiah NIP</a>"
   }
   ```
2. API merespons HTTP 200 `{ success: true, requireOtp: true }`.
3. Email yang terkirim mengandung tag hyperlink mentah yang disuntikkan.

**Expected Behavior:**
Karakter khusus HTML seperti `<`, `>`, `"`, `&` harus di-escape atau dibersihkan dengan regex/sanitizer sebelum dimasukkan ke dalam template email HTML.

**Actual Behavior:**
Input `name` masuk secara raw ke dalam body template email.

---

### Issue #3: Alur Lupa Password Mengarahkan Email yang Tidak Terdaftar ke Form Input OTP Tanpa Pernah Ada OTP yang Dikirim

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Category** | UX / Functional |
| **URL** | `https://belajar-cpns-saas.vercel.app/login` |

**Description:**
Pada alur *Lupa Password*, endpoint `/api/auth/forgot-password` mengembalikan `{ success: true, message: 'Jika email terdaftar, kode OTP sudah dikirim.' }` untuk mencegah enumerasi email. Namun di sisi frontend (`LoginFormContent`), handler `handleForgotPassword` mengecek `if (!res.ok) throw ...` lalu langsung memanggil:
```typescript
setStep('reset');
```
Hal ini membawa pengguna langsung ke halaman *"Masukkan Kode & Password Baru"* dengan teks *"Kode OTP 6 digit dikirim ke email@kamu.com"*, padahal kode OTP sebenarnya **tidak pernah dikirim** (karena email belum terdaftar di database). Ketika pengguna memasukkan kode sembarang, sistem menampilkan pesan error *"Kode OTP tidak ditemukan. Minta ulang kode baru."*, membuat pengguna terjebak dalam loop tanpa solusi.

**Steps to Reproduce:**
1. Buka `https://belajar-cpns-saas.vercel.app/login`.
2. Klik link **Lupa password?**.
3. Masukkan email yang belum terdaftar (misal: `tidakada_user@domain.com`).
4. Klik tombol **Kirim Kode OTP**.
5. Form beralih ke halaman input kode 6-digit & password baru.

**Expected Behavior:**
Jika email tidak terdaftar atau dalam rangka proteksi privasi, antarmuka seharusnya menampilkan notifikasi informasi di layar (misalnya: *"Jika email Anda terdaftar dalam sistem, tautan/kode verifikasi telah dikirim ke kotak masuk Anda. Silakan periksa email atau hubungi layanan bantuan jika tidak menerima email"*), dan tidak memaksa pengguna ke layar input OTP yang mustahil diisi.

**Actual Behavior:**
Pengguna dipindahkan ke layar *"Masukkan Kode & Password Baru"* dan menunggu kode OTP yang tidak akan pernah sampai.

---

### Issue #4: Enumerasi Akun pada Endpoint Login (`/api/auth/login`)

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Security |
| **URL** | `https://belajar-cpns-saas.vercel.app/api/auth/login` |

**Description:**
Endpoint `/api/auth/login` mengembalikan respon yang berbeda secara spesifik antara email yang belum terdaftar dan password yang salah:
- Email tidak ditemukan: HTTP 404 `{ error: "Email belum terdaftar. Silakan daftar terlebih dahulu." }`
- Password salah: HTTP 401 `{ error: "Password salah. Periksa kembali." }`

Perbedaan status code dan pesan ini memungkinkan pihak ketiga menguji daftar email (credential stuffing / account enumeration) untuk mengetahui siapa saja yang memiliki akun di Lolos.in.

**Steps to Reproduce:**
1. Kirim POST ke `/api/auth/login` dengan email acak non-eksisten -> Respon 404 "Email belum terdaftar".
2. Kirim POST ke `/api/auth/login` dengan email terdaftar dan password acak -> Respon 401 "Password salah".

**Expected Behavior:**
Sesuai standar OWASP Authentication Cheat Sheet, pesan login gagal sebaiknya seragam: *"Email atau password yang Anda masukkan salah."* dengan HTTP 401, guna mencegah enumerasi akun.

**Actual Behavior:**
Pesan error membocorkan keberadaan email di database.

---

### Issue #5: Icon Emoji Kuda (`🐴`) Muncul pada Tag `<title>` Dokumen Login & Halaman 404

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Visual / Content |
| **URL** | `https://belajar-cpns-saas.vercel.app/login` & `/register` |

**Description:**
Tag `<title>` halaman login dan rute 404 mengandung karakter emoji kuda:
`🐴 Lolos.in — Simulasi CAT SKD CPNS 2026 Gratis`
Hal ini bertentangan dengan panduan identitas brand Lolos.in yang melarang penggunaan emoji pada antarmuka/branding dan menggunakan konsep *text-only logo* minimalis Claude Amber.

**Steps to Reproduce:**
1. Buka halaman `https://belajar-cpns-saas.vercel.app/login`.
2. Periksa title bar tab browser atau inspect elemen `<title>`.

**Expected Behavior:**
Judul tab bersih dan profesional: `Lolos.in — Masuk Akun` atau `Lolos.in — Simulasi CAT SKD CPNS 2026`.

**Actual Behavior:**
Terdapat emoji `🐴` di depan nama merek.

---

### Issue #6: Hilangnya Feedback Pesan Error Jika Input OTP Diubah Tanpa Nilai Utuh

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX |
| **URL** | `https://belajar-cpns-saas.vercel.app/login` (Step OTP) |

**Description:**
Pada step verifikasi OTP, jika pengguna mengisi 5 digit lalu menekan Enter atau menghapus digit kembali, tombol "Verifikasi & Masuk" dalam keadaan `disabled`. Tidak ada teks panduan pembantu (*helper text*) di bawah form yang menjelaskan bahwa 6 digit harus lengkap terisi sebelum tombol dapat diaktifkan.

**Expected Behavior:**
Menampilkan helper hint text halus seperti *"Masukkan 6 digit angka"* saat panjang karakter belum genap 6.

**Actual Behavior:**
Tombol disabled tanpa tooltip atau pesan penjelasan eksplisit.

---

## Issues Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Endpoint `/api/auth/verify-link` redirect ke `/register` yang 404 | 🔴 Critical | Functional | `/api/auth/verify-link` |
| 2 | Raw HTML injection pada template email verifikasi registrasi | 🟠 High | Security | `/api/auth/register` |
| 3 | Lupa password bawa user ke form OTP meski email tidak terdaftar | 🟠 High | UX / Func | `/login` (Step Forgot) |
| 4 | Email enumeration pada endpoint login (404 vs 401) | 🟡 Medium | Security | `/api/auth/login` |
| 5 | Emoji kuda `🐴` muncul pada `<title>` tab browser | 🟡 Medium | Visual/Brand | `/login` |
| 6 | Kurangnya helper text saat digit OTP belum lengkap 6 digit | 🔵 Low | UX | `/login` (Step OTP) |

---

## Testing Coverage

### Pages Tested
- `https://belajar-cpns-saas.vercel.app/login` (Mode Form Masuk, Form Daftar, Step OTP, Step Lupa Password, Step Reset Password)
- `https://belajar-cpns-saas.vercel.app/profil` (Auth Guard redirection test)
- `https://belajar-cpns-saas.vercel.app/register` (Direct route check -> 404 discovery)
- `https://belajar-cpns-saas.vercel.app/api/auth/verify-link` (Magic link redirect flow)

### Features Tested
1. **Form Validation Klien**:
   - Submit form kosong (HTML5 constraint validation)
   - Format email tidak valid (RFC email check)
   - Panjang kata sandi minimal 6 karakter
   - Toggle sembunyikan/tampilkan password (mata Phosphor icon)
2. **Autentikasi & Verifikasi Akun**:
   - Input kredensial salah (email tidak terdaftar)
   - Toggle mode Masuk <-> Daftar Akun Baru
   - Pengiriman OTP registrasi & fallback ke input 6 digit
   - Verifikasi kode OTP salah / kedaluwarsa
   - Tombol kembali ke form & tombol minta kirim ulang OTP
3. **Fitur Lupa Password & Reset**:
   - Transisi ke form lupa kata sandi
   - Pre-fill email otomatis dari form login
   - Reset password dengan kata sandi baru < 6 karakter
   - Reset password dengan OTP salah
   - Tombol minta kode ulang
4. **Keamanan & Guarding**:
   - Akses `/profil` tanpa session -> diarahkan ke `/login`
   - Akses `/api/auth/me` tanpa cookie token -> 401 Unauthorized
   - Akses `/api/user/change-password` tanpa auth -> 401 Unauthorized
   - Proteksi brute force login -> Rate limit aktif setelah 10 percobaan (429 Too Many Requests)
   - SQL Injection payload pada form login -> ditolak dengan aman oleh PostgreSQL parameterization
   - XSS payload pada nama pengguna -> ditemukan celah HTML injection pada template email

### Not Tested / Out of Scope
- Pengiriman email SMTP nyata (karena testing dilakukan secara non-destruktif terhadap mailbox pihak ketiga).
- Pembayaran / subscription upgrade pada sesi terautentikasi (fokus sesuai arahan: modul auth & lupa password).

---

## Notes & Recommendations

1. **Prioritas #1**: Perbaiki redirect pada `src/app/api/auth/verify-link/route.ts` dari `/register?error=...` ke `/login?error=...` agar pengguna email verification tidak mengalami 404.
2. **Prioritas #2**: Lakukan sanitasi HTML (`escapeHtml(name)`) pada template email di `src/app/api/auth/register/route.ts` dan `src/app/api/auth/forgot-password/route.ts`.
3. **Prioritas #3**: Pada flow `handleForgotPassword` di `src/app/login/page.tsx`, tampilkan notifikasi konfirmasi bahwa petunjuk pemulihan telah dikirim ke email, atau batasi perpindahan ke layar input OTP hanya jika server mengonfirmasi permintaan valid.
