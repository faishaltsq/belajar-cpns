# TECHNICAL_DEBT.md — Utang teknis terverifikasi vs hipotesis

Sesi 2026-10-20. **V-x** = **TERVERIFIKASI** (ada path/perintah yang membuktikan). **H-x** = **HIPOTESIS** (terlihat mencurigakan, belum dieksekusi/dibuktikan).

---

## A. VERIFIED — Discrepancy & artefak

### V-1 Runtime DB = Neon, folder `supabase/` tetap ada
- `src/lib/db.ts:1` `import { neon } from '@neondatabase/serverless'`; koneksi dari `DATABASE_URL || POSTGRES_URL` (`:6`).
- `src/lib/supabase.ts` membuat `supabaseAdmin` dari `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` dengan model user **phone/PIN** (`findUserByPhone`, `pin_hash`) — bukan `users.email`/`password_hash` yang dipakai aplikasi.
- `grep -rn "supabase" src tests` → 6 baris, **semuanya di dalam `src/lib/supabase.ts`**; tidak ada importer.
- `package.json` tetap membawa `@supabase/supabase-js@^2.45.4`.
- **Utang**: jalur kredensial ganda (Neon URL vs service-role key) membingungkan audit keamanan; kredensial service-role Supabase (kalau pernah ada) harus dirotasi dan dependency dibuang bila memang mati.

### V-2 `supabase/schema.sql` (skema + RLS) bukan jalur runtime
- Satu-satunya skema yang dipakai aplikasi adalah hasil migrasi di `migrations/*.sql` yang diterapkan manual; tidak ada kode aplikasi yang memicu RLS (tidak ada koneksi Supabase, lihat V-1).
- **Utang**: dua sumber kebenaran skema yang bisa saling menyesatkan; dokumentasi keamanan yang mengutip RLS tidak mencerminkan postur produksi.

### V-3 Migrasi **tidak** dijalankan otomatis
- `.github/workflows/ci.yml` hanya 4 step: `npm ci`, `npx vitest run`, `npx tsc --noEmit`, `npx next build`.
- Tidak ada `vercel.json` (`ls vercel.json` → "no vercel.json"), tidak ada hook `build`/`postbuild` migrasi di `package.json`.
- Penerapan manual: `node scripts/apply-migration.mjs migrations/<file>.sql`.
- **Utang**: deploy = skema yang sama sekali tidak ikut; satu-satunya pengaman adalah disiplin manusia.

### V-4 Nomor migrasi loncat: 005 & 006 hilang
- `ls migrations`: `001, 002, 003, 004, 007, 008, 009, 010, 011`.
- `git log --diff-filter=D --name-only -- migrations` → **kosong** (tidak pernah ter-commit lalu dihapus).
- **Utang**: riwayat skema tidak dapat direkonstruksi dari repo; `004_create_issue_reports.sql` (di `scripts/migrations/`, lihat V-5) berpotensi adalah "005/006" yang tidak pernah dipindah.

### V-5 Direktori migrasi **kedua**: `scripts/migrations/`
- Berisi `004_create_issue_reports.sql` — nomor **bertabrakan** dengan `migrations/004_question_bank.sql` dan berbeda isi.
- **Utang**: dua tempat migrasi dengan penomoran sama = resep salah-terapkan di produksi.

### V-6 Artefak build/ekstraksi ter-commit
- `git ls-files` menemukan: `dogfood-output/report.md` + 4 PNG (`01_login_page_mobile.png`, `02_login_wrong_creds.png`, `03_register_form.png`, `04_forgot_password.png`), `extract.log` (9.406 byte), `t1.html` (16.902 byte). Total repo ter-track: **710 file**.
- **Utang**: noise diff, repo membengkak, screenshot berisi UI login tersimpan permanen di riwayat git.

### V-7 Skrip sementara tidak terbersihkan (untracked, tetapi ada di working tree)
- `_db_audit_tmp.mjs`, `_db_breakdown_tmp.mjs`, `_db_questions_tmp.mjs`, `_db_questions_tmp2.mjs`, `_db_snapshot_tmp.mjs`, `_db_snapshot2_tmp.mjs` (semua di root, tidak masuk `.gitignore`).
- `scripts/` juga memuat `__pycache__/`, `_p184_bot.png`, `_p185_top.png`, `_test_soal1_tight.png`, `_test_soal14_clean.png`.
- `.gitignore` hanya menutup `node_modules/ .next/ .env* .vercel extracted/ __pycache__/ tsconfig.tsbuildinfo` — pola `_db_*` dan `t1.html` tidak tercakup.
- **Utang**: file lokal yang suatu saat ke-commit tanpa sengaja.

### V-8 Lapisan entitlement **belum ter-commit** → CI tidak memantaunya
- `git status --porcelain`: modified `src/app/api/{drill/check,payment/create-order,questions/[id],results}/route.ts`, `ExamSession.tsx`, `FinishExamModal.tsx`, `UpgradeProModal.tsx`, `src/lib/klikqris.ts`, `src/lib/pricing.ts`, 4 file test; **untracked** `src/lib/entitlement.ts`, `src/lib/examClock.ts`, `tests/entitlement-gate.test.ts`, `tests/exam-clock.test.ts`, `docs/audit/`.
- CI hanya menjalankan apa yang ada di `master` (`.github/workflows/ci.yml` `on.push.branches: [master]`).
- **Utang**: gerbang "semua paket dibatasi server" saat ini **belum** divalidasi CI; merge tertunda berarti perlindungan belum sampai ke produksi lewat jalur normal.

### V-9 Angka statistik homepage tidak sinkron dengan katalog
- ~~`src/app/page.tsx:102-103` menulis `36 Paket` dan `(3.816 Soal)` sebagai teks statis.~~ **FIXED** — kini membaca `CATALOG_TOTAL` / `CATALOG_QUESTION_TOTAL`; regresi dicegah `tests/content-consistency.test.ts` (larangan mengetik total).
- Hitungan nyata (jalankan `node` membaca `src/data/packages/*.json` di sesi ini): **37 file paket, 3.898 soal**.
- Metadata SEO di file yang sama menyebut `37 paket` (`src/app/page.tsx:18`) → **kontradiksi internal dalam satu file**.
- **Utang**: angka pemasaran yang keliru + drift otomatis karena hardcode; seharusnya diambil dari `TOTAL_TRYOUT_PACKAGES` (`src/lib/loadPackage.ts:226`).

### V-10 Konstanta passing grade duplikat di tiga tempat
- `src/lib/scoring.ts:3-5` → `PASSING_GRADES`/`QUESTION_LIMITS`/`MAX_SCORES`.
- `src/lib/examRules.ts:23-25` → **nilai yang sama** dideklarasikan ulang, dengan komentar yang justru menyatakan dirinya "single source of truth" (`examRules.ts:1-13`).
- `src/app/page.tsx:351,357` menulis literal `166` dan `550` langsung di tabel, bukan mengimpor konstanta.
- **Utang**: tiga sumber angka; `scoring.ts` (server) dan `examRules.ts` (client) bisa berbeda tanpa error compile.

### V-11 Jalur skor klien sudah dihapus — tapi komentar/konstanta sisa masih ada
- `grep -rn "calculateExamScore" src` → hanya didefinisikan di `src/lib/scoring.ts:15` dan dipanggil di `src/lib/serverScoring.ts:76` (plus komentar `ExamSession.tsx:354`).
- Artinya klaim audit lama "skor dihitung di klien dan di server" **tidak berlaku lagi**: hanya `scoreSubmission()` yang menghitung (`src/app/api/results/route.ts:51`).
- **Utang**: `scoring.ts` masih mengekspor API yang terkesan publik/klien; pembaca baru mudah salah paham siapa yang berwenang menghitung.

### V-12 Endpoint reminder pesanan gagal-terbuka bila secret kosong
- `src/app/api/payment/abandoned-reminders/route.ts:12-16`: `const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;` lalu `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`) { 401 }`.
- Artinya: **secret tidak diset → endpoint terbuka untuk siapa saja** (membanjiri email pengguna lain adalah kemungkinan nyata, karena query-nya menyapu semua order `pending` 1–24 jam, `:25-35`).
- Perbandingan: route admin lain menolak saat `ADMIN_PIN` kosong (`src/lib/adminAuth.ts:11-17` "return false") — pola yang benar.
- **FIXED**: guard kini fail-closed (`503` tanpa secret, `401` salah kunci) — regresi dicegah `tests/abandoned-reminders-auth.test.ts`. Sisa utang: guard satu-satunya di aplikasi yang dulu fail-open. Selain itu `.env.example` **tidak mencantumkan** `CRON_SECRET`/`ADMIN_SECRET`/`ADMIN_PIN`/`KLIKQRIS_*` (hanya `DATABASE_URL, POSTGRES_URL, JWT_SECRET, MAIL_FROM, RESEND_API_KEY, NEXT_PUBLIC_APP_URL, ADMIN_PIN` — `grep -oE "^[A-Z_]+=" .env.example`), sehingga konfigurasi penting tidak terdokumentasi.

### V-13 `next lint` tidak menjadi gerbang CI
- `package.json` punya script `lint: next lint`, tetapi `.github/workflows/ci.yml` tidak memanggilnya.
- Akibat nyata: **13 `eslint-disable` tersebar di 7 file** (`src/app/admin-kelola/page.tsx`, `src/components/admin/FiguralCropEditor.tsx`, `src/components/ExamQuestionReview.tsx`, `src/components/QuestionCard.tsx`, `src/components/QuestionNavigationGrid.tsx`, `src/components/ReportIssueModal.tsx`, `src/components/UpgradeProModal.tsx`) tetap lolos tanpa tinjauan.
- `@ts-ignore`/`@ts-expect-error`: **0**. Deklarasi `: any`: **3** file (`src/app/api/pro/recap/route.ts`, `src/app/api/payment/history/route.ts`, `src/app/api/admin/packages/route.ts`) + `Record<string, any>[]` lokal di `create-order/route.ts:115`.

### V-14 Data tamu tidak pernah dimigrasikan ke akun
- Scope key `guest` vs `u_<id>` (`src/lib/userStorage.ts:14-17`); saat login yang terjadi hanya **penghapusan** flag guest (`DrillSession.tsx:91`, `flashcard/page.tsx:63`, `journey/page.tsx:62`, `psikotes/hasil/page.tsx:92`) dan `clearAllGuestData()` menghapus prefix `lolos_guest_` (`userStorage.ts:48-59`).
- Tidak ada kode penyalinan `guest → u_<id>` di `src/`.
- **Utang**: hasil belajar tamu hilang begitu ia mendaftar — kebalikan dari yang diharapkan funnel.

### V-15 `pro_activated_at` ditulis tapi tidak pernah dibaca
- Ditulis: `src/lib/grantEntitlement.ts:54-57` (`pro_activated_at = NOW()`); tercatat di tipe `src/lib/db.ts:76`.
- `grep -rn "pro_activated_at" src` tidak menemukan pembaca (SELECT/where) di luar dua lokasi tersebut.
- **Utang**: tidak ada dasar untuk masa aktif, expiry, refund, atau analitik konversi PRO.

### V-16 Hasil psikotes tidak pernah persist ke server
- Seluruh modul psikotes (`src/lib/psikotes.ts`, `src/lib/kecermatan.ts`, `src/lib/kepribadian.ts`) dieksekusi di klien; tidak ada route `api/psikotes*` dalam 37 route terdeteksi (`find src/app/api -name route.ts`).
- **Utang**: nilai fitur yang sudah dibangun (5 modul) tidak menghasilkan data pengguna sama sekali — tidak ada riwayat, tidak ada upsell berbasis hasil.

---

## B. VERIFIED — Hal yang sudah benar (jangan "diperbaiki" lagi)

- **Harga otoritatif di server**: `body.baseAmount` tidak dibaca; `priceFor()` dari `PRICE_TABLE` (`src/app/api/payment/create-order/route.ts:62-64`, `src/lib/pricing.ts:22-33`). Diuji `tests/price-authority.test.ts`.
- **Webhook signature wajib & timing-safe**, termasuk order legacy `signature = NULL` yang ditolak (`src/app/api/webhooks/klikqris/route.ts:66-80`).
- **Transisi atomik pending→paid** mencegah double-grant (`route.ts:99-110`) + idempotensi (`:90-92`).
- **Kunci jawaban tidak lagi dikirim ke klien**: `toPublicQuestions()` (`src/app/api/questions/[id]/route.ts:57-62`); kunci hanya via `results/[id]/review` (kepemilikan dicek) dan per-soal via `drill/check`.
- **Entitlement server-side** di 3 rute: `questions/[id]`, `results`, `drill/check` (`grep -l checkPackageAccess src/app/api`) — gagal-closed saat DB mati (`src/lib/entitlement.ts:55,67`).
- **Cache-control benar**: payload berbayar `private, no-store`; gratis boleh di-CDN (`src/lib/entitlement.ts:103-107`).
- **IP rate-limit memakai hop terakhir XFF** dan storage persisten `rate_limits` (`migrations/010_rate_limits.sql`, `src/lib/rateLimit.ts`) — sesuai `docs/security-verification.md` (#5, #6).
- **Admin PIN**: tidak ada default, `123456` ditolak di production, query-string PIN ditolak (`src/lib/adminAuth.ts:8-30`).
- **Skor server-satu-satunya** (`src/lib/serverScoring.ts:76`) + menolak jawaban untuk soal yang tidak ada di paket dan membatasi ukuran map (komentar `:25-27`, `MAX_ANSWER_ENTRIES = 200`).
- **Test suite sehat**: run sesi ini `52 files / 598 tests passed` (dari `npx vitest run --reporter=basic`).

---

## C. HIPOTESIS (belum dibuktikan — jangan diperlakukan sebagai temuan)

- **H-1** RLS di `supabase/schema.sql` tidak aktif sama sekali di produksi (perlu `SELECT * FROM pg_policies` di database Neon).
- **H-2** `src/lib/supabase.ts` adalah dead code dan aman dihapus (perlu build tanpa file tersebut + pencarian import ulang).
- **H-3** Migrasi `010_rate_limits.sql` / `011_add_bundle_package_ids.sql` belum tentu sudah diterapkan ke database produksi (perlu `information_schema.columns` di Neon).
- **H-4** Tidak ada scheduler yang memanggil `/api/payment/abandoned-reminders` (perlu cek konfigurasi cron di dashboard Vercel / `vercel crontab`).
- **H-5** Order yang dibayar tetapi webhook-nya gagal (403 signature) tidak pernah tersapu otomatis — mengandalkan `POST /api/payment/sync` manual.
- **H-6** Webhook dengan `amount = 0` akan tetap dianggap lunas (guard underpayment hanya bila `paidAmount > 0`, `route.ts:84`).
- ~~**H-7**~~ **KONFIRMASI**: selisih 3898−3816 = 82 soal memang `tryout-figural-2`; angka homepage sudah diperbaiki (P1-10) sehingga tidak lagi tergantung penjelasan ini.
- **H-8** `JOURNEY_DAYS` berjumlah 30 hari (dihitung dari kemunculan kata `day` di `src/data/journeySchedule.ts`, bukan panjang array).
- **H-9** Review hasil tamu bisa menampilkan opsi teracak yang tidak konsisten dengan payload awal ketika `randomize_options` aktif di tabel `packages`.
- **H-10** `.env.prod` yang ter-commit berisi kredensial nyata (file berisi `PGPASSWORD`, `DATABASE_URL`, `POSTGRES_PASSWORD` menurut daftar key `grep -oE "^[A-Z_]+=" .env.prod`) meski namanya masuk `.gitignore` — perlu `git log -- .env.prod` untuk memastikan apakah pernah ter-commit berisi nilai.

---

## D. Prioritas perbaikan (disarankan, berbasis V-x)

1. **V-8** commit lapisan entitlement + jalankan CI — tanpa ini semua gerbang lain hanya ada di mesin lokal.
2. ~~**V-12** ubah guard `abandoned-reminders` menjadi fail-closed dan tambahkan `CRON_SECRET` ke `.env.example`.~~ **SELESAI** — guard fail-closed + `CRON_SECRET`/`ADMIN_SECRET` dicatat di `.env.example`.
3. **V-9 / V-10** hapus angka hardcode homepage, impor dari `examRules.ts`, satukan `PASSING_GRADES` ke satu file.
4. **V-3 / V-4 / V-5** satu direktori migrasi, isi nomor yang hilang atau renumber, tambahkan step verifikasi skema (bukan auto-migrate) di CI.
5. **V-1 / V-2** putuskan: Neon saja → hapus `src/lib/supabase.ts`, `@supabase/supabase-js`, `supabase/schema.sql` (atau pindahkan ke `docs/legacy/`).
6. **V-6 / V-7** buang artefak ter-commit (`t1.html`, `extract.log`, `dogfood-output/screenshots`) dan tambah pola `_db_*`, `_*.png`, `dogfood-output/` ke `.gitignore`.
7. **V-13** tambahkan `npx next lint` ke CI dan audit 13 `eslint-disable`.
8. **V-14 / V-16** migrasi data tamu saat login dan penyimpanan hasil psikotes — dua pekerjaan produk yang nilainya besar dibanding biayanya.
