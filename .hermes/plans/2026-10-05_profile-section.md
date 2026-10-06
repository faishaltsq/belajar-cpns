# Implementation Plan: Profile Section & User Settings (`/profil`)

**Date:** 2026-10-05  
**Target File:** `src/app/profil/page.tsx`  
**API Endpoints:** `src/app/api/user/profile/route.ts`  

---

## 1. Goal
Provide authenticated users with a dedicated Profile section (`/profil`) in Lolos.in to view and update their personal account information (Name, WhatsApp/Phone Number, Target Instansi/Formasi CPNS), view exam statistics summary, and manage account security (change password), seamlessly integrated with the existing Neon PostgreSQL database and Claude Amber design system.

---

## 2. Current Context & Assumptions
- **Auth System:** Session-based JWT stored in HTTP-only cookie `cpns_token` (`src/lib/auth.ts`, `src/lib/useUser.ts`, `src/app/api/auth/me/route.ts`).
- **Database:** Neon PostgreSQL with `@neondatabase/serverless` via `src/lib/db.ts`. The `users` table currently has columns `id (uuid)`, `email (varchar)`, `phone (varchar)`, `name (varchar)`, `password_hash (varchar)`, `created_at (timestamp)`.
- **UI/UX Stack:** Next.js App Router (TypeScript, Tailwind CSS, `@phosphor-icons/react`), light mode only, warm neutral palette (`#faf9f5`, `#c96442`, Outfit font).
- **Navigation:** Header `Navbar.tsx` currently links to `/`, `/simulasi`, `/drill`, `/psikotes`, `/riwayat`. The user avatar in the header should link to `/profil`.

---

## 3. Architecture & Approach
1. **Database Migration / Schema Addition:**
   Add optional metadata columns to `users` table: `target_instansi` (varchar 100), `target_formasi` (varchar 100), and `avatar_url` (text, optional).
2. **Backend API (`/api/user/profile`):**
   - `GET /api/user/profile`: Fetches full user profile details + cumulative stats (total exams completed, average score, pass rate, membership status).
   - `PUT /api/user/profile`: Updates name, phone, target_instansi, target_formasi.
   - `POST /api/user/change-password`: Safely validates old password and hashes new password using `bcryptjs`.
3. **Frontend Page (`/profil`):**
   - Clean profile header with avatar initials, email, member badge (`Gratis` vs `PRO`).
   - Profile edit form with inline validation, success toasts, and save states.
   - Quick performance summary cards (Total Tryout, Rata-rata Skor SKD, Tingkat Kelulusan).
   - Security card for changing password with confirm password validation.
   - Integrated link in `Navbar.tsx` desktop and mobile menus.

---

## 4. Step-by-Step Tasks

### Task 1: Add Database Columns in PostgreSQL
**File:** Direct database execution via script `scripts/migrate_profile_columns.js`
**Details:** Add `target_instansi` and `target_formasi` columns if they don't already exist.
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_instansi VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_formasi VARCHAR(100);
```
**Verification:**
Run query `SELECT column_name FROM information_schema.columns WHERE table_name = 'users';` and ensure `target_instansi` and `target_formasi` are present.

---

### Task 2: Create Profile API Endpoint (`GET` & `PUT`)
**File:** `src/app/api/user/profile/route.ts`
- **GET Handler:**
  - Authenticate request via `cpns_token`.
  - Fetch user record from `users` table.
  - Query summary stats from `exam_results` for this `user_id`:
    - `total_exams`: Count of completed tryouts
    - `avg_score`: Average of `total_score`
    - `highest_score`: Max `total_score`
    - `pass_count`: Count where `is_passed = true`
  - Query membership status (`is_pro`) from active purchases or `users.is_pro`.
  - Return JSON: `{ user, stats, isPro }`.
- **PUT Handler:**
  - Authenticate request.
  - Parse request body: `{ name, phone, target_instansi, target_formasi }`.
  - Validate: `name` min 2 characters, `phone` format.
  - Execute SQL `UPDATE users SET name = $1, phone = $2, target_instansi = $3, target_formasi = $4 WHERE id = $5 RETURNING *`.
  - Return updated user object.

---

### Task 3: Create Change Password Endpoint (`POST`)
**File:** `src/app/api/user/change-password/route.ts`
- **POST Handler:**
  - Authenticate request.
  - Parse request body: `{ currentPassword, newPassword }`.
  - Validate `newPassword.length >= 6`.
  - Fetch existing `password_hash` from `users`.
  - Verify `bcrypt.compare(currentPassword, password_hash)`. Return 400 if incorrect.
  - Hash `newPassword` via `bcrypt.hash(newPassword, 10)`.
  - Execute `UPDATE users SET password_hash = $1 WHERE id = $2`.
  - Return `{ success: true, message: 'Password berhasil diperbarui' }`.

---

### Task 4: Build Profile Page UI (`/profil`)
**File:** `src/app/profil/page.tsx`
- **Components included:**
  1. **Header Card:**
     - Large initials badge with amber gradient background.
     - User full name, email, member status badge (`Member PRO` vs `Akun Gratis`).
     - Registration date / joined time.
  2. **Performance Statistics Section:**
     - 3-column metric cards:
       - Total Simulasi Selesai (Icon: `ClockCounterClockwise`)
       - Rata-rata Skor SKD (Icon: `Trophy`)
       - Tingkat Kelulusan Passing Grade (Icon: `CheckCircle`)
     - Quick CTA: "Lihat Riwayat Lengkap" linking to `/riwayat`.
  3. **Personal Info Form:**
     - Full Name input
     - Email (disabled / read-only with badge "Terverifikasi")
     - WhatsApp / Phone Number input
     - Target Instansi (Dropdown or autocomplete text input, e.g. "Kementerian Keuangan", "Kejaksaan Agung", "Kemenkumham")
     - Target Formasi Jabatan (e.g. "Analis Kebijakan Pertama", "Pranata Komputer")
     - Save button with loading spinner state and success notification.
  4. **Security & Password Form:**
     - Current password input
     - New password input + confirmation input
     - "Ubah Password" button.
  5. **Danger Zone / Sign Out:**
     - Direct button to logout from all devices or current session.

---

### Task 5: Integrate Profile Navigation in `Navbar.tsx`
**File:** `src/components/Navbar.tsx`
- Update Desktop Auth section:
  - Turn the user pill (`user.name`) into a clickable link to `/profil`.
  - Add active state when current route is `/profil`.
- Update Mobile Menu:
  - Add "Profil Saya" link above "Riwayat" / "Keluar".

---

## 5. Tests & Verification Steps
1. **Database Schema Check:**
   - Execute query to ensure columns `target_instansi` and `target_formasi` exist in table `users`.
2. **API Endpoint Test (`GET /api/user/profile`):**
   - Unauthenticated: verify returns `401 Unauthorized`.
   - Authenticated: verify returns correct user object with stats.
3. **API Endpoint Test (`PUT /api/user/profile`):**
   - Send updated name and target instansi; verify database reflects new values immediately.
4. **API Endpoint Test (`POST /api/user/change-password`):**
   - Send invalid current password: verify returns `400 Password lama salah`.
   - Send valid current password and new password: verify returns `200 Success` and subsequent login works with new password.
5. **UI & Navigation Verification:**
   - Click user pill in header: navigate to `/profil`.
   - Change name and target instansi, save: ensure toast notification displays and page refreshes user state.
   - Test responsive layout on mobile viewports.

---

## 6. Risks, Tradeoffs & Open Questions
- **Auth Token Invalidation:** Changing password does not invalidate existing cookies on other devices unless token versioning/sessions are tracked. (Acceptable for lightweight CPNS prep app; YAGNI).
- **Google OAuth vs Local Auth:** If a user logs in via OAuth in the future, password change should be hidden. Current implementation is email/password credential-based, so password change is always relevant.
