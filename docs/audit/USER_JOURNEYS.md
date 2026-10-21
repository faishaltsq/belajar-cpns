# USER_JOURNEYS.md — Alur pengguna end-to-end

Status: **TERVERIFIKASI** (file route/page yang dibaca + uji `vitest run` sesi ini) kecuali ditandai **HIPOTESIS** atau **RISIKO DIAM**.
Sesi 2026-10-20.

---

## Journey 1 — Tamu landing → tryout gratis → hasil → upgrade

1. **Masuk `/`** → `src/app/page.tsx`. Terlihat stats bar `36 Paket (3.816 Soal)` (baris 102-103) — angka ini **tidak cocok** dengan katalog nyata (37 paket / 3.898 soal; hitung langsung sesi ini) → lihat T-1.
2. **Pilih `/simulasi`** → `src/app/simulasi/page.tsx` memuat katalog dari `GET /api/packages` (DB `packages` → fallback `TRYOUT_LIST`). Kartu gratis diberi badge dari `FREE_IDS` (baris 62, 188); yang lain diberi kunci `isLocked` (baris 130) berdasarkan `isPro` + `unlocked_packages` dari `GET /api/user/status`.
3. **Buka paket gratis** → `/simulasi/[id]` memanggil `GET /api/questions/[id]`. Karena `checkPackageAccess()` lolos untuk `FREE_PACKAGE_IDS`, dibalas 200 dengan `Cache-Control: public, s-maxage=300` (`src/app/api/questions/[id]/route.ts:15-71`). Payload **tanpa** skor/kunci/`explanation` (`toPublicQuestions`).
4. **Mengerjakan** → `ExamSession.tsx` menyimpan jawaban/draft/timer di localStorage ber-key `scopedKey(...)` (baris 214, 220) dan `cat_view_mode`/`cat_font_size` global (baris 72, 129, 347).
5. **Selesai** → `POST /api/results` (rate limit 20/300s per IP). Server memaksa `scoreSubmission()` → hasil dihitung ulang dari paket tersimpan, bukan dari body klien (`src/app/api/results/route.ts:48-55`). Tamu: `callerId = null` → baris disimpan tanpa `user_id` (`:57-70`).
6. **Halaman hasil** `/simulasi/hasil/[resultId]`:
   - Tamu membaca dari `sessionStorage` (`guest_exam_result_*`, baris 62-67).
   - Review penuh (kunci + pembahasan) hanya bila `serverId` ada → `GET /api/results/[id]/review`, yang menuntut cookie valid dan kepemilikan baris (`src/app/api/results/[id]/review/route.ts:14-45`).
   - Tab leaderboard memanggil `GET /api/leaderboard/[packageId]` (publik).
7. **Upgrade** → `UpgradeProModal.tsx` / kartu kunci → `POST /api/payment/create-order`.

### Titik patah diam ( Journey 1 )
- **RISIKO DIAM 1 — tamu kehilangan riwayat**: hasil tamu hanya ada di `sessionStorage`, hilang saat tab ditutup (`src/app/simulasi/hasil/[resultId]/page.tsx:62-67`, komentar eksplisit baris 62). Tidak ada pengingat di UI untuk daftar agar hasil tersimpan — **HIPOTESIS**: konversi tamu→terdaftar bisa hilang tanpa sinyal.
- **RISIKO DIAM 2 — tamu tidak dapat review kunci dari server**: tanpa `serverId` tersimpan, tab review bergantung salinan lokal; bila paket di-random (`randomize_questions` aktif di `packages`, dibaca `src/app/api/questions/[id]/route.ts:38-55`) **HIPOTESIS**: urutan/pembagian opsi hasil lokal bisa tidak persis sama dengan payload server, sehingga review menampilkan opsi teracak.

---

## Journey 2 — Pengguna terdaftar (gratis)

1. **Daftar** `POST /api/auth/register` (rate-limited) → login `POST /api/auth/login` (rate-limited) → cookie `cpns_token` (HS256, `src/lib/auth.ts`).
2. **Semua progres pindah scope** `u_<userId>` via `scopedKey` (`src/lib/userStorage.ts:14-17`). Flag trial guest di-reset saat login terdeteksi: `lolos_guest_tried_*` dihapus di `DrillSession.tsx:91`, `flashcard/page.tsx:63`, `journey/page.tsx:62`, `psikotes/hasil/page.tsx:92`.
3. **Riwayat** `/riwayat` → `GET /api/payment/history` (baris 196) mengembalikan daftar pembelian + `isPro` (baris 203).
4. **Rekap kesalahan** `/rekap` → `GET /api/pro/recap`; halaman punya state `denied` (`src/app/rekap/page.tsx:29`) untuk memblokir akses non-kualifikasi.
5. **Akses tetap terbatas**: tanpa pembelian, hanya 3 paket gratis (`src/lib/pricing.ts:48`).

### Titik patah diam ( Journey 2 )
- **RISIKO DIAM 3 — data lama tamu tidak dimigrasikan**: progres tamu tersimpan di scope `guest` dan `clearAllGuestData()` menghapus prefix `lolos_guest_` (`src/lib/userStorage.ts:48-59`). Tidak ada kode yang menyalin `guest` → `u_<id>` saat login (**verifikasi**: `grep "guest"` di helper hanya menunjukkan fungsi pembersihan). Semua drill/flashcard/progress roadmap yang dikerjakan sebelum login hilang bagi pengguna itu.

---

## Journey 3 — Pembeli (create-order → QRIS → pending → webhook → entitlement)

1. **`POST /api/payment/create-order`** dengan cookie valid. Untuk `single`: `packageId` wajib; untuk `bundle`: `packageIds` tepat 5 (`validateBundlePackageIds`, `src/lib/pricing.ts:59-89`); untuk `pro`: tanpa `packageId`.
2. Guard anti-beli-ganda: `ALREADY_PRO` / `ALREADY_UNLOCKED` (409) dibaca dari tabel `users` (`src/app/api/payment/create-order/route.ts:71-111`) — `body.userEmail` **tidak pernah** dipercaya (email dari DB, baris 80).
3. **Harga** = `priceFor(orderType)` (baris 64) dari `PRICE_TABLE` — permintaan dengan `baseAmount` palsu tidak berpengaruh.
4. **Dedupe order pending**: query mencari baris `pending` untuk user + `effectivePackageId` yang belum `expires_at` (baris 113-120). Bundle memakai sentinel `'bundle'` sebagai `package_id` supaya `NULL` tidak mengacaukan dedupe (baris 57-60).
5. Balasan berisi `qris_url`, `qris_image`, `unique_code`, `exact_amount` (nilai unik-akhir-3-digit agar nominal persis dapat dicocokkan).
6. **Status**: pengguna polling `GET /api/payment/order-status` atau menekan `POST /api/payment/sync` (keduanya butuh JWT).
7. **Gateway memanggil webhook** `POST /api/webhooks/klikqris`:
   - signature wajib + `timingSafeEqual` (403 bila kosong/tak cocok) — `route.ts:66-80`;
   - underpayment ditolak 400 (baris 84-87);
   - idempoten bila sudah `paid` (baris 90-92);
   - transisi atomik `pending → paid` (baris 99-110);
   - `grantEntitlement()` menyet `is_pro` atau merge `unlocked_packages` (`src/lib/grantEntitlement.ts:52-85`).
8. **Langsung terasa**: `GET /api/user/status` / `GET /api/packages` + `simulasi/page.tsx` mengunci kembali kartu; `checkPackageAccess` kini lolos untuk paket tersebut.

### Titik patah diam ( Journey 3 )
- **RISIKO DIAM 4 — webhook gagal diam-diam**: bila signature tidak cocok webhook membalas 403, dan **tidak ada retry mekanis yang terlihat di repo**. Pemulihan mengandalkan tombol `POST /api/payment/sync` (manual, harus diketahui pengguna) — **HIPOTESIS**: tidak ada scheduler/cron di repo (`vercel.json` tidak ada; `abandoned-reminders` pun tidak punya pemicu terlihat) yang menyapu order `pending` yang sudah dibayar.
- **RISIKO DIAM 5 — `exact_amount` 0 lolos**: guard underpayment hanya berlaku bila `paidAmount > 0` (`route.ts:84`). Bila gateway pernah mengirim amount 0/nol, order tetap dianggap lunas. Belum diuji langsung ke gateway (**HIPOTESIS**).

---

## Journey 4 — Pengguna PRO

1. Order `orderType:'pro'` lolos semua guard → dibayar → `grantEntitlement` menyet `is_pro = true, pro_activated_at = NOW()` (`src/lib/grantEntitlement.ts:52-59`).
2. `checkPackageAccess` lolos untuk **semua** paket (`src/lib/entitlement.ts:89`), termasuk paket yang tidak ada di katalog (aturan "id tak dikenal = berbayar", komentar baris 19-20).
3. `create-order` menolak pembelian ulang `ALREADY_PRO` (409).
4. UI: badge PRO di `/profil` (`profil/page.tsx:196`) dan `/riwayat` (`riwayat/page.tsx:545`), modal `UpgradeProModal` disembunyikan.
5. **Rekap Pro** `GET /api/pro/recap` tersedia.

### Titik patah diam ( Journey 4 )
- **RISIKO DIAM 6 — tidak ada kedaluwarsa PRO**: `is_pro` diset boolean tanpa masa berlaku; `pro_activated_at` disimpan tapi **tidak pernah dibaca** di mana pun dalam pencarian `grep "pro_activated_at"` pada `src/` (hanya muncul di tipe `DbUser` `src/lib/db.ts:76` dan saat menulis). Artinya tidak ada pembatalan otomatis, refund, maupun downgrade (**HIPOTESIS** bila roadmap menuntut masa aktif).

---

## Journey 5 — Pesanan ditinggal (abandoned-payment reminder)

1. Order dibuat, pengguna tidak menyelesaikan pembayaran.
2. `POST /api/payment/abandoned-reminders` memilih `status='pending'`, `last_reminded_at IS NULL`, usia 1–24 jam, limit 10 (`route.ts:25-35`).
3. Eligibility dobel dicek via `isOrderEligibleForReminder()` (`src/lib/abandonedReminder.ts:1-15`) — window 1 jam s/d 24 jam.
4. Email dibangun `buildAbandonedReminderEmail()` (`:17-…`) berisi nominal persis, dikirim `sendOtpEmail()` (mailer Resend/nodemailer).
5. `last_reminded_at` diperbarui agar tidak dikirim dua kali.

### Titik patah diam ( Journey 5 )
- **RISIKO DIAM 7 — endpoint ini mungkin tak pernah terpanggil**: guard-nya `if (cronSecret && authHeader !== ...)` (`route.ts:14`) → **fail-open** bila `CRON_SECRET`/`ADMIN_SECRET` tidak diset; dan `vercel.json` (tempat cron biasanya didefinisikan) **tidak ada** di repo (terverifikasi `ls vercel.json`). Pemicu pengiriman tidak ditemukan di `src/` selain route itu sendiri (`grep "abandoned-reminders" src` → 3 baris, semuanya di dalam route tersebut). **HIPOTESIS**: fitur pengingat belum pernah berjalan di produksi.
- **RISIKO DIAM 8 — email `user_email` mungkin kosong**: query mensyaratkan `user_email IS NOT NULL AND != ''` (baris 28-30) — order yang dibuat tanpa email tidak pernah diingatkan.

---

## Journey 6 — Loop review soal salah

1. Saat ujian, `ExamSession.tsx` menyimpan `exam_user_answers_<resultId>` + `exam_scores_<resultId>` per-user (baris 453-455).
2. Setelah hasil, tab **Review** mengambil payload kunci via `GET /api/results/[id]/review` (baris 84 halaman hasil) — route menolak pemanggil yang bukan pemilik baris (`route.ts:14-45`).
3. Kesalahan ditandai → **`/drill/ulang-salah`** (`src/app/drill/ulang-salah/page.tsx`) membaca `src/lib/wrongAnswers.ts` / `wrongAnswerRecap.ts`.
4. Saat drill, kunci hanya dibuka **per soal** lewat `POST /api/drill/check` (rate limit 60/menit/IP, entitlement-gated) — pendekatan ini menggantikan perilaku lama yang mengunduh seluruh kunci (`src/app/api/drill/check/route.ts:10-21` menjelaskan alasan).

### Titik patah diam ( Journey 6 )
- **RISIKO DIAM 9 — review tamu rapuh**: tamu tanpa `serverId` di `sessionStorage` tidak memicu fetch review (`simulasi/hasil/[resultId]/page.tsx:83`), jadi kunci hanya tersedia dari salinan lokal. Menutup tab = loop review putus total.
- **RISIKO DIAM 10 — rate limit drill vs kecepatan belajar**: 60 request/menit/IP (`drill/check/route.ts:25`) sangat longgar untuk manusia, tetapi **IP bersama (NAT/kantor/wifi kos)** bisa saling memblokir dengan pesan generik `429 "Terlalu banyak permintaan."` tanpa tombol retry.

---

## Journey 7 — Psikotes (tamu & terdaftar)

1. `/psikotes` memilih salah satu dari 5 tes (indeks `src/app/psikotes/page.tsx:19-56`).
2. Generator berjalan **di klien** (`src/lib/psikotes.ts`, `src/lib/kecermatan.ts`, `src/lib/kepribadian.ts`) → tidak ada panggilan API, tidak ada rate limit, tidak ada penyimpanan hasil.
3. `/psikotes/hasil` menampilkan hasil dan menyet `lolos_guest_tried_psikotes` (baris 97) → sesi berikutnya tamu kena `GuestLimitModal` (baris 451).

### Titik patah diam ( Journey 7 )
- **RISIKO DIAM 11 — hasil psikotes tidak pernah tersimpan**: karena seluruhnya klien dan tanpa endpoint, hasil hilang saat tab ditutup untuk **semua** pengguna, termasuk yang sudah login & PRO. Tidak ada riwayat psikotes di `/riwayat` (halaman itu hanya membaca `payment/history` + hasil tryout).
