# FEATURE_INVENTORY.md — Inventaris halaman & fitur

Status: **TERVERIFIKASI** kecuali ditandai **HIPOTESIS**. Sumber per baris. Sesi 2026-10-20.

Legenda akses:
- **FREE** = terbuka untuk tamu/akun gratis tanpa bayar.
- **FREE (1x trial tamu)** = tamu hanya sekali, kemudian `GuestLimitModal`.
- **LOGIN** = butuh cookie `cpns_token`.
- **PREMIUM** = butuh `is_pro` / `unlocked_packages` / order tertentu.
- **ADMIN** = butuh header `x-admin-pin` (`src/lib/adminAuth.ts`).

---

## 1. Halaman publik & marketing

| Halaman | Route | File | Akses |
|---|---|---|---|
| Landing / beranda | `/` | `src/app/page.tsx` (metadata title `Lolos.in — Simulasi CAT SKD CPNS 2027 & Psikotes Online Terlengkap`, baris 17) | FREE |
| Login & daftar | `/login` | `src/app/login/page.tsx` | FREE |
| FAQ, tabel passing grade, modul, sampel soal | bagian `/` | `src/app/page.tsx:96-111` (stats bar), `:314-361` (tabel SKD) | FREE |
| Support / laporkan masalah | tombol mengambang | `src/components/SupportFloatingButton.tsx` → `POST /api/support/report` | FREE + rate limit |

Tabel passing grade di homepage (`src/app/page.tsx:326-359`) mencantumkan TWK 30 soal/PG 65, TIU 35/80, TKP 45/166, total 110/550 — **identik** dengan konstanta runtime `PASSING_GRADES`/`MAX_SCORES`/`QUESTION_LIMITS` di `src/lib/scoring.ts:3-7`. (Terverifikasi perbandingan nilai; konsistensi.) ⚠ angka *paket* di section itu beda — lihat TECHNICAL_DEBT T-1.

---

## 2. Mesin tryout CAT SKD

| Fitur | Route / File | Akses |
|---|---|---|
| Katalog paket + lock badge | `/simulasi` → `src/app/simulasi/page.tsx` (`FREE_IDS` baris 62, `isLocked` baris 130, badge baris 188/198) | FREE lihat katalog |
| Sesi ujian (timer, grid navigasi, modal jeda/keluar/selesai) | `/simulasi/[id]` → `src/app/simulasi/[id]/page.tsx` + `src/app/simulasi/[id]/ExamSession.tsx` | FREE untuk 3 paket gratis; lainnya PREMIUM via `checkPackageAccess` |
| Payload soal | `GET /api/questions/[id]` → `toPublicQuestions()` (skor/kunci/explanation **dipotong**) | entitlement-gated |
| Submit hasil (skor otoritatif server) | `POST /api/results` → `scoreSubmission()` di `src/lib/serverScoring.ts` | entitlement + rate limit `results:<ip>` 20/300s |
| Tampilan hasil + review + leaderboard | `/simulasi/hasil/[resultId]` → `src/app/simulasi/hasil/[resultId]/page.tsx` (tab `summary`/`review`/`leaderboard`, baris 36) | LOGIN (review via `GET /api/results/[id]/review`) |
| Leaderboard per paket (50 besar) | `GET /api/leaderboard/[packageId]` → `getPackageLeaderboard(..., 50)` | FREE (publik) |
| Mode latihan (Latihan Mandiri) | flag `practice: true` di body submit — **tidak ditulis ke DB**, `src/app/api/results/route.ts:19-23,59-61` | FREE |
| Mode ujian & petunjuk pintasan | `src/lib/examMode.ts`, `src/lib/examShortcuts.ts`, `src/lib/examClock.ts`, modals `ExamModeModal/ExitExamModal/FinishExamModal/PauseExamModal` | FREE |
| Bagikan hasil WhatsApp | `src/lib/shareResult.ts` | FREE |

**Katalog paket (37 file, `src/data/packages/*.json`, dihitung langsung sesi ini):**

| Kelompok | id | Jumlah soal/file | Status |
|---|---|---|---|
| Starter | `tryout-mini` | 30 | **FREE** (`FREE_PACKAGE_IDS`) |
| Starter | `tryout-1`, `tryout-2` | 110 | **FREE** (`FREE_PACKAGE_IDS`) |
| Standard | `tryout-3` … `tryout-17` (15 paket) | 110 | PREMIUM |
| HOTS | `tryout-18` … `tryout-24` (7 paket) | 110 | PREMIUM |
| Drill/Latihan | `tryout-25` … `tryout-34` (10 paket) | 110 | PREMIUM |
| Special | `tryout-figural` | 46 | PREMIUM |
| Special | `tryout-figural-2` | 82 | PREMIUM |

Total aktual: **37 paket / 3.898 soal** (perintah `node` membaca semua JSON di sesi ini: `TOTAL 3898 FILES 37`).
Sumber label/badge/section: `TRYOUT_LIST` di `src/lib/loadPackage.ts:179-223`; `TOTAL_TRYOUT_PACKAGES = TRYOUT_LIST.length` (`:226`).
FREE list: `src/lib/pricing.ts:48` `FREE_PACKAGE_IDS = ['tryout-mini','tryout-1','tryout-2']` (dikomentarikan *kept in sync with FREE_IDS in src/app/simulasi/page.tsx:60*).

---

## 3. Latihan Kilat (Drill)

| Item | Bukti |
|---|---|
| Kategori & sub-kategori | `DRILL_TOPICS` — 18 topik: TWK (Pancasila, UUD 1945, Bela Negara, Nasionalisme, Integritas, Bahasa Indonesia), TIU (Analogi, Silogisme, Analitis, Deret Angka, Soal Cerita, Figural), TKP (Pelayanan Publik, Profesionalisme, Anti-Radikalisme, Jejaring Kerja, TIK, Sosial Budaya) — `src/lib/drillHelper.ts:8-31` |
| Halaman | `/drill`, `/drill/[category]`, `/drill/[category]/[subCategory]` (`src/app/drill/…`, sesi di `DrillSession.tsx`) |
| Konten soal | `src/data/drillContent.ts` |
| Kunci jawaban per soal | `POST /api/drill/check` — entitlement-gated + rate limit `drill:<ip>` 60/60s (`src/app/api/drill/check/route.ts:25,37`) |
| Ulang soal salah | `/drill/ulang-salah` → `src/app/drill/ulang-salah/page.tsx`, data dari `src/lib/wrongAnswers.ts` / `wrongAnswerRecap.ts` |
| Akses | FREE; tamu 1x → `DrillSession.tsx:96` baca `lolos_guest_tried_drill`, flag di-set `:238`, modal di `:532` |

---

## 4. Flashcard

- Halaman: `/flashcard` → `src/app/flashcard/page.tsx` (369 baris).
- Data: `FLASHCARD_DATA` dari `src/data/flashcards.ts` (import baris 7).
- Progres: `mastered_flashcards` disimpan via `setScopedJSON(..., 'mastered_flashcards', ...)` — key per-user (`src/lib/userStorage.ts:14`).
- Akses: FREE; tamu 1x → `lolos_guest_tried_flashcard` (`page.tsx:68,109,129`), modal `:347`.

---

## 5. Roadmap Belajar (Journey)

- Halaman: `/journey` → `src/app/journey/page.tsx` (430 baris).
- Jadwal: `JOURNEY_DAYS: JourneyDay[]` di `src/data/journeySchedule.ts:14` (dihitung: 31 kemunculan kata `day` → **HIPOTESIS**: 30 hari + 1, belum diverifikasi panjang array persis).
- Streak: `calcStreak(dates)` (`src/lib/journeyHelper.ts:1-20`) — toleransi 1 hari, berbasis string ISO `YYYY-MM-DD`.
- Akses: FREE; tamu 1x → `lolos_guest_tried_journey` (`page.tsx:67,113,138`), modal `:422`.

---

## 6. Psikotes

Indeks: `/psikotes` → `src/app/psikotes/page.tsx` (134 baris) yang mendaftar 5 tes (metadata baris 19/29/38/47/56):

| Tes | Route | Implementasi | Data |
|---|---|---|---|
| Tes Koran Kraepelin / Pauli | `/psikotes/kraepelin` | `src/lib/psikotes.ts` — `generateKraepelinColumn` (:12), `evaluateKraepelinResults` (:23) | generated |
| Kecermatan Angka Hilang | `/psikotes/kecermatan-angka` | `src/lib/kecermatan.ts` — `generateKecermatanTable`/`generateKecermatanQuestion`/`evaluateKecermatanResults` (:40,:53) | generated |
| Kecermatan Huruf Hilang | `/psikotes/kecermatan-huruf` | idem, `type: 'angka' \| 'huruf'` | generated |
| Penalaran Logika & Spasial (45 soal) | `/psikotes/penalaran` | `src/lib/psikotes.ts` + `src/data/psikotes_penalaran.json` | JSON |
| Kepribadian (PAPI Kostick) | `/psikotes/kepribadian` | `src/lib/kepribadian.ts` — `evaluateKepribadianResults` (:31) + `src/data/psikotes_kepribadian.json` | JSON |
| Hasil | `/psikotes/hasil` | `src/app/psikotes/hasil/page.tsx` | — |

- Akses: FREE; tamu 1x → flag `lolos_guest_tried_psikotes` diset saat membuka hasil (`psikotes/hasil/page.tsx:97`), modal `:451`.
- **Catatan**: seluruh psikotes berjalan **di klien** (generator + evaluator di import page client); tidak ada route API psikotes (tabel §8 di PROJECT_DISCOVERY tidak punya endpoint `psikotes`).

---

## 7. Ringkasan nilai & akun

| Fitur | Route | File | Akses |
|---|---|---|---|
| Rekap kesalahan (kunci + pembahasan per butir) | `/rekap` | `src/app/rekap/page.tsx` (136 baris, state `denied` baris 29) | LOGIN — fetch `GET /api/pro/recap` |
| Rekap Pro | `GET /api/pro/recap` | `src/app/api/pro/recap/route.ts` | jwt |
| Riwayat pengerjaan + pembelian | `/riwayat` | `src/app/riwayat/page.tsx` (892 baris; `fetch('/api/payment/history')` baris 196, `setIsPro` baris 203) | LOGIN / tamu modal `:884` |
| Profil & ganti password | `/profil` | `src/app/profil/page.tsx` (`fetch('/api/user/profile')` baris 96, `change-password` baris 142, badge Pro baris 196) | LOGIN |
| Status akun (entitlement ringkas) | `GET /api/user/status` | `src/app/api/user/status/route.ts` | jwt |

---

## 8. Pembayaran & paket (sudut fitur pengguna)

| Fitur | Endpoint / file | Akses |
|---|---|---|
| Beli 1 paket (Rp 5.000) | `POST /api/payment/create-order` `orderType:'single'` | LOGIN |
| Beli bundle 5 paket (Rp 18.000) | idem `orderType:'bundle'` + `packageIds[5]` | LOGIN |
| Upgrade PRO (Rp 59.000) | idem `orderType:'pro'` | LOGIN |
| Cek status pesanan / sync manual / riwayat / batal | `/api/payment/{order-status,sync,history,cancel}` | jwt |
| QR tampil di UI | `src/components/UpgradeProModal.tsx` + `MiniTryout.tsx` | LOGIN |
| Pengingat pesanan mandek | `POST /api/payment/abandoned-reminders` (cron/secret) | lihat T-3 |
| Harga | `PRICE_TABLE` di `src/lib/pricing.ts:22-26` — server-saja | — |

---

## 9. Admin panel & generator

- Halaman `/admin-kelola` → `src/app/admin-kelola/page.tsx` (862 baris), 2 tab: `'packages' | 'media'` (`:38`, toggle `:369/:380`, render `:393/:857`).
- Endpoint admin (semua `isAuthorizedAdmin`): lihat tabel PROJECT_DISCOVERY §8 — 11 route, meliputi:
  - **CRUD paket**: `/api/admin/packages` (GET/POST/PUT/PATCH/DELETE).
  - **Bank soal**: `/api/admin/question-bank` (GET/POST).
  - **Upload & media**: `/api/admin/upload`, `/api/admin/crop-image`/`save-cropped-image`, `/api/admin/figural-images`, `/api/admin/figural-img`, `/api/admin/normalize-images`.
  - **Custom test generator**: `POST /api/admin/generate-custom` — **admin saja**, tidak ada endpoint publik untuk generator tes.
  - **Ebook generator (LLM)**: `/api/admin/generate-ebook` (GET/POST).
  - **Migrasi via API**: `POST /api/admin/migrate`.
  - **Status DB**: `GET /api/admin/db-status`; **debug mail**: `src/app/api/admin/debug-mail/` (folder ada; tidak tercantum dalam 37 route terdeteksi — verifikasi sendiri bila dipakai).
- Editor crop figural: `src/components/admin/FiguralCropEditor.tsx` (termasuk satu `eslint-disable`).
- Akses: `x-admin-pin` → `ADMIN_PIN`; PIN `123456` ditolak di production (`src/lib/adminAuth.ts:23-27`).

---

## 10. PWA & observability dari sisi pengguna

- PWA manifest diuji `tests/pwa-manifest.test.ts` (1 test, lulus di run sesi ini).
- Support button: `src/components/SupportFloatingButton.tsx` → `POST /api/support/report` (rate-limited).
- Analitik: Vercel Analytics + Speed Insights di `src/app/layout.tsx:8-9`.
- Sentry: `next.config.js` + `sentry.client.config.ts`.

---

## 11. Ringkasan akses per fitur

| Fitur | Status |
|---|---|
| Landing, FAQ, tabel PG | FREE |
| Tryout `tryout-mini`, `tryout-1`, `tryout-2` | FREE |
| Tryout lainnya (34 paket) | PREMIUM (single/bundle/PRO) |
| Latihan Kilat + Ulang Soal Salah | FREE (tamu 1x) |
| Flashcard | FREE (tamu 1x) |
| Roadmap Belajar | FREE (tamu 1x) |
| 5 modul psikotes + hasil | FREE (tamu 1x) |
| Leaderboard | FREE (publik, tanpa auth) |
| Riwayat, rekap, profil, hasil tersimpan | LOGIN |
| Generator tes custom, bank soal, upload, ebook, migrasi | ADMIN |
