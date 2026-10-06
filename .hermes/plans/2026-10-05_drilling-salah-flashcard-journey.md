# Implementation Plan: Drilling Soal Salah, Flashcard Hafalan, dan Journey Belajar 30 Hari

**Date:** 2026-10-05  
**Target Features:**
1. Drilling "Ulang Soal Salah" (`/drill/ulang-salah`)
2. Flashcard Hafalan Interaktif (`/flashcard`)
3. Journey / Roadmap Belajar Harian 30 Hari (`/journey`)  
**Workspace:** `belajar-cpns-saas` (Next.js 14 App Router, TypeScript, Tailwind CSS, `@phosphor-icons/react`, Neon PostgreSQL)  
**Deliverable Path:** `.hermes/plans/2026-10-05_drilling-salah-flashcard-journey.md`

---

## 1. Goal
Menambahkan tiga fitur akselerasi belajar adaptif terinspirasi dari JadiASN ke Lolos.in: **Drilling Ulang Soal Salah** (menguji kembali butir yang gagal dijawab), **Flashcard Hafalan** (flip card kartu kunci pasal UUD, rumus cepat TIU, dan pilar negara), serta **Journey Belajar 30 Hari** (roadmap terstruktur day-by-day dengan progress tracker persisten).

---

## 2. Current Context & Assumptions
- **Soal & Riwayat Ujian:** Riwayat pengerjaan tryout disimpan di browser `localStorage` dengan prefix `exam_result_[id]`, `exam_questions_[id]`, dan `exam_user_answers_[id]`, serta tersimpan di DB Neon `exam_results` jika user terautentikasi.
- **Engine Drill Existing:** `/drill` dan `/drill/[category]/[subCategory]` sudah memiliki interaksi 1-soal-per-layar, feedback instan setelah memilih opsi, dan kalkulasi akurasi.
- **Design System:** Claude Amber theme (`#faf9f5` background, `#c96442` primary accent, Outfit font, `@phosphor-icons/react` saja, tanpa logo BKN/Garuda).
- **Authentication:** `useUser()` hook (`src/lib/useUser.ts`) dan cookie `cpns_token`.

---

## 3. Architecture & Proposed Approach
1. **Drilling Ulang Soal Salah (`/drill/ulang-salah`):**
   - Helper client `src/lib/wrongAnswers.ts` memindai riwayat ujian di `localStorage` (dan fallback fetch dari API jika login) untuk mengisolasi pertanyaan yang dijawab salah (skor < 5 untuk TWK/TIU, skor < 4 untuk TKP).
   - Mode drill interaktif memuat 10 butir soal salah per sesi, menampilkan pembahasan instan, dan menandai soal yang berhasil dijawab benar sebagai "Tuntas".
   - Integrasi tombol CTA "Latih X Soal Salah" di `/drill` dan di kartu diagnostik halaman `/simulasi/hasil/[id]`.
2. **Flashcard Hafalan (`/flashcard`):**
   - Bank kartu berkualitas tinggi disimpan di `src/data/flashcards.ts` mencakup TWK (Pasal UUD 1945 krusial, BPUPKI/PPKI, Butir Pancasila), TIU (Pecahan/Persen istimewa, Rumus Kecepatan/Debit, Negasi Silogisme), dan TKP (Kata Kunci Skor 5).
   - Komponen Flashcard interaktif 3D flip animasi berbasis CSS (front: pertanyaan/istilah, back: jawaban/rumus & konteks trik cepat).
   - Fitur review spaced repetition sederhana: tombol "Belum Hafal" (kartu dikembalikan ke tumpukan) dan "Sudah Paham" (kartu selesai). Progress disimpan di `localStorage`.
3. **Journey Belajar 30 Hari (`/journey`):**
   - Struktur kurikulum harian di `src/data/journeySchedule.ts` dibagi 3 fase:
     - *Fase 1 (Hari 1–10):* Fondasi TWK & Hafalan Konsep.
     - *Fase 2 (Hari 11–20):* Logika & Numerik TIU (Trik Cepat).
     - *Fase 3 (Hari 21–30):* Ketahanan TKP, Psikotes Kraepelin, & Full Tryout CAT.
   - Halaman `/journey` menampilkan timeline interaktif dengan kartu status (Terkunci, Hari Ini, Selesai), progress bar persentase kelulusan kurikulum, dan tombol langsung ke materi/drill/flashcard yang relevan.
   - Progress checklist harian disimpan di `localStorage` (`lolos_journey_progress`) dengan sync ke server jika login.

---

## 4. Step-by-Step Implementation Tasks

### ── Bagian A: Drilling Ulang Soal Salah ──

#### Task 1: Buat Helper Kolektor Soal Salah (`src/lib/wrongAnswers.ts`)
**Path:** `src/lib/wrongAnswers.ts`  
Mengumpulkan semua soal yang pernah salah dijawab dari seluruh riwayat ujian di `localStorage`.
```typescript
import { Question, ExamAnswer } from './types';

export interface WrongQuestionItem {
  question: Question;
  userAnswerId: string | null;
  packageId: string;
  failedAt: string;
}

const STORAGE_KEY_MASTERED = 'lolos_mastered_questions';

export function getMasteredQuestionIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASTERED);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markQuestionMastered(questionId: number) {
  if (typeof window === 'undefined') return;
  const set = getMasteredQuestionIds();
  set.add(questionId);
  localStorage.setItem(STORAGE_KEY_MASTERED, JSON.stringify(Array.from(set)));
}

export function collectWrongQuestions(): WrongQuestionItem[] {
  if (typeof window === 'undefined') return [];
  const mastered = getMasteredQuestionIds();
  const map = new Map<number, WrongQuestionItem>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('exam_result_')) continue;
    const resultId = key.replace('exam_result_', '');

    try {
      const qRaw = localStorage.getItem(`exam_questions_${resultId}`);
      const aRaw = localStorage.getItem(`exam_user_answers_${resultId}`);
      if (!qRaw || !aRaw) continue;

      const questions: Question[] = JSON.parse(qRaw);
      const answers: ExamAnswer[] = JSON.parse(aRaw);
      const ansMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

      questions.forEach((q) => {
        if (mastered.has(q.id)) return;
        const chosenId = ansMap.get(q.id) ?? null;
        const chosenOpt = q.options.find((o) => o.id === chosenId);
        const maxScore = Math.max(...q.options.map((o) => o.score ?? 0));
        const userScore = chosenOpt ? (chosenOpt.score ?? 0) : 0;

        // Kriteria salah: TWK/TIU nilai < 5, TKP nilai < 4
        const isWrong = q.category === 'TKP' ? userScore < 4 : userScore < maxScore;
        if (isWrong) {
          map.set(q.id, {
            question: q,
            userAnswerId: chosenId,
            packageId: resultId.split('-').slice(0, -1).join('-') || resultId,
            failedAt: new Date().toISOString(),
          });
        }
      });
    } catch {}
  }

  return Array.from(map.values());
}
```
**Verifikasi:**
Buka console di browser peramban yang punya riwayat ujian, panggil `collectWrongQuestions()`, pastikan array soal salah teridentifikasi.

---

#### Task 2: Buat Halaman Interaktif `/drill/ulang-salah/page.tsx`
**Path:** `src/app/drill/ulang-salah/page.tsx`  
Mode latihan 10 soal khusus soal salah dengan opsi "Tandai Sudah Paham":
- Load list dari `collectWrongQuestions()`
- Tampilkan indikator counter "Soal Salah Tersisa: X Butir"
- Saat user menjawab benar pada opsi terbaik: tombol "Kuasai & Hapus dari Daftar Salah" aktif dan memanggil `markQuestionMastered(q.id)`.
- Tombol "Latihan Lagi" / "Selesai".
**Verifikasi:**
Navigasi ke `/drill/ulang-salah`. Jika belum ada riwayat salah, tampilkan empty state yang ramah mengarahkan user mencoba tryout CAT terlebih dahulu.

---

#### Task 3: Tambahkan Banner "Ulang Soal Salah" di `/drill/page.tsx` & Halaman Hasil
- Di `src/app/drill/page.tsx`: tampilkan card aksen oranye di atas jika terdeteksi `wrongCount > 0` dengan tombol "Latih X Soal Salah Anda Sekarang →".
- Di `src/app/simulasi/hasil/[resultId]/page.tsx`: di samping tombol "Kembali ke Menu", tambahkan tombol sekunder "Perbaiki Jawaban Salah di Sesi Ini".

---

### ── Bagian B: Flashcard Hafalan Interaktif ──

#### Task 4: Susun Dataset Flashcard Kunci (`src/data/flashcards.ts`)
**Path:** `src/data/flashcards.ts`  
Menyediakan 35+ kartu hafalan esensial berbobot tinggi:
- **TWK (15 kartu):**
  - Butir Pengamalan Sila 2 vs Sila 5
  - Pasal 1 ayat 1-3 UUD 1945 (Bentuk, Kedaulatan, Negara Hukum)
  - Pasal 7 (Masa Jabatan Presiden & Wewenang)
  - Pasal 22E (Pemilu)
  - Pasal 27 & 30 (Bela Negara & Hankamrata)
  - Tugas BPUPKI vs PPKI
  - Tokoh Perumus Teks Proklamasi
  - Hierarki Peraturan Perundang-undangan (UU No. 12/2011)
- **TIU (15 kartu):**
  - Pecahan & Persen Istimewa (1/8 = 12.5%, 3/8 = 37.5%, 1/6 = 16.67%, dll.)
  - Pola Kuadrat Istimewa ($25^2$, $35^2$, $(a+b)^2$)
  - Rumus Cepat Kecepatan Rata-rata PP ($2v_1v_2 / (v_1+v_2)$)
  - Rumus Cepat Pekerja Tambahan ($b \times t_1 / s_2$)
  - Negasi Pernyataan Kuantor ("Semua P maka Q" $\to$ "Ada P yang tidak Q")
  - Modus Ponens vs Tollens vs Silogisme
- **TKP (8 kartu):**
  - Formula Skor 5 Pelayanan Publik: Responsif tanpa melanggar SOP
  - Formula Skor 5 Jejaring Kerja: Menjembatani konflik & kolaborasi aktif
  - Formula Skor 5 Anti-Radikalisme: Verifikasi fakta & laporkan ke pihak berwenang

```typescript
export interface Flashcard {
  id: string;
  category: 'TWK' | 'TIU' | 'TKP';
  subTopic: string;
  front: string; // Pertanyaan / Istilah / Rumus yang ditanyakan
  back: string;  // Kunci jawaban lengkap / penjelasan trik cepat
  hint?: string;
}
```

---

#### Task 5: Buat Halaman Flashcard Interaktif 3D Flip (`src/app/flashcard/page.tsx`)
**Path:** `src/app/flashcard/page.tsx`
- Tab Filter Kategori: `Semua` | `TWK (Hafalan)` | `TIU (Rumus Cepat)` | `TKP (Kata Kunci)`
- Kartu Flip 3D (Animasi CSS `transform-style: preserve-3d` dan `rotateY(180deg)`)
- Tombol Kontrol:
  - 🔄 *Klik kartu untuk membalik*
  - ❌ *Belum Hafal* (geser kartu ke belakang untuk diulang)
  - ✅ *Sudah Hafal* (tambah skor hafalan, simpan ID kartu di `localStorage: lolos_mastered_flashcards`)
  - 🔀 *Acak Kartu*
- Progress Counter: "Tuntas: X / Y Kartu (Z%)" dengan reset state.
**Verifikasi:**
Jalankan `npm run dev`, buka `/flashcard`, klik kartu untuk membalik, tekan tombol "Sudah Hafal" dan pastikan counter bertambah serta progress bar bergerak.

---

### ── Bagian C: Journey / Roadmap Belajar 30 Hari ──

#### Task 6: Susun Kurikulum 30 Hari (`src/data/journeySchedule.ts`)
**Path:** `src/data/journeySchedule.ts`
Struktur 30 hari persiapan matang SKD CPNS:
```typescript
export interface JourneyDay {
  day: number;
  phase: 1 | 2 | 3;
  phaseTitle: string;
  title: string;
  description: string;
  category: 'TWK' | 'TIU' | 'TKP' | 'CAMPURAN';
  estimatedMinutes: number;
  actionType: 'drill' | 'flashcard' | 'simulasi' | 'review';
  actionUrl: string;
  actionLabel: string;
}

export const JOURNEY_DAYS: JourneyDay[] = [
  // FASE 1: FONDASI TWK & HAFALAN KONSEP (Hari 1-10)
  {
    day: 1,
    phase: 1,
    phaseTitle: 'Fase 1: Penguasaan Pilar Kebangsaan',
    title: 'Pilar Pancasila & Nilai Bela Negara',
    description: 'Pahami pembeda pengamalan Sila ke-2 vs Sila ke-5 serta 5 nilai dasar bela negara.',
    category: 'TWK',
    estimatedMinutes: 15,
    actionType: 'drill',
    actionUrl: '/drill/TWK/Pancasila',
    actionLabel: 'Kerjakan Drill Pancasila',
  },
  {
    day: 2,
    phase: 1,
    phaseTitle: 'Fase 1: Penguasaan Pilar Kebangsaan',
    title: 'Hafalan Pasal Kunci UUD 1945',
    description: 'Hafalkan pasal-pasal yang paling sering keluar di CAT: Pasal 1, 7, 22E, 27, dan 30.',
    category: 'TWK',
    estimatedMinutes: 15,
    actionType: 'flashcard',
    actionUrl: '/flashcard?category=TWK',
    actionLabel: 'Buka Flashcard UUD 1945',
  },
  // ... Hari 3 s/d 10 (TWK Integritas, Sejarah, Bahasa Indonesia)

  // FASE 2: TRIK NUMERIK & LOGIKA TIU (Hari 11-20)
  {
    day: 11,
    phase: 2,
    phaseTitle: 'Fase 2: Trik Cepat & Logika TIU',
    title: 'Trik Pecahan & Persen Istimewa',
    description: 'Kuasai konversi pecahan cepat tanpa menghitung pembagian bersusun panjang.',
    category: 'TIU',
    estimatedMinutes: 20,
    actionType: 'flashcard',
    actionUrl: '/flashcard?category=TIU',
    actionLabel: 'Hafalkan Trik TIU',
  },
  {
    day: 12,
    phase: 2,
    phaseTitle: 'Fase 2: Trik Cepat & Logika TIU',
    title: 'Pola Deret Angka & Huruf Bertingkat',
    description: 'Latihan mengenali deret larik 2 tingkat dan deret fibonacci dalam hitungan detik.',
    category: 'TIU',
    estimatedMinutes: 20,
    actionType: 'drill',
    actionUrl: '/drill/TIU/Deret%20Angka',
    actionLabel: 'Mulai Drill Deret',
  },
  // ... Hari 13 s/d 20 (Silogisme, Analitis, Soal Cerita, Figural)

  // FASE 3: POLA SKOR 5 TKP, KRAEPELIN, & SIMULASI PENUH (Hari 21-30)
  {
    day: 21,
    phase: 3,
    phaseTitle: 'Fase 3: Strategi TKP & Simulasi Penuh',
    title: 'Pola Jawaban Skor 5 TKP',
    description: 'Bedah kata kunci jawaban bernilai maksimal untuk pelayanan publik dan jejaring kerja.',
    category: 'TKP',
    estimatedMinutes: 20,
    actionType: 'flashcard',
    actionUrl: '/flashcard?category=TKP',
    actionLabel: 'Flashcard Skor 5',
  },
  {
    day: 25,
    phase: 3,
    phaseTitle: 'Fase 3: Strategi TKP & Simulasi Penuh',
    title: 'Tes Ketahanan Konsentrasi Kraepelin',
    description: 'Latih ritme kerja cepat dan stabilitas mental menggunakan simulasi tes koran.',
    category: 'CAMPURAN',
    estimatedMinutes: 15,
    actionType: 'drill',
    actionUrl: '/psikotes/kraepelin',
    actionLabel: 'Mulai Tes Kraepelin',
  },
  {
    day: 30,
    phase: 3,
    phaseTitle: 'Fase 3: Strategi TKP & Simulasi Penuh',
    title: 'Gladi Bersih: Simulasi CAT Penuh 110 Butir',
    description: 'Uji kesiapan akhir dengan batas waktu resmi 100 menit dan target passing grade.',
    category: 'CAMPURAN',
    estimatedMinutes: 100,
    actionType: 'simulasi',
    actionUrl: '/simulasi',
    actionLabel: 'Mulai Simulasi CAT',
  },
];
```

---

#### Task 7: Buat Halaman Journey Interaktif (`src/app/journey/page.tsx`)
**Path:** `src/app/journey/page.tsx`
- **Header:** Judul "Roadmap Belajar 30 Hari Lolos CPNS" + Ringkasan: "Target: 15–20 Menit / Hari".
- **Progress Card:**
  - Persentase penyelesaian (misal: "Hari ke-4 dari 30 · 13% Selesai")
  - Streak hari belajar berturut-turut.
  - Tombol "Lanjutkan Belajar Hari Ini" (auto-scroll ke hari aktif).
- **Timeline Accordion / List:**
  - Tiap kartu hari menampilkan: Nomor Hari, Kategori Badge, Judul, Estimasi Waktu, Checkbox "Tandai Selesai", dan Tombol Aksinya.
  - Status visually distinct:
    - *Selesai:* border hijau lembut, badge centang
    - *Hari Ini:* border aksen oranye tebal, badge "HARI INI", tombol highlight
    - *Belum Selesai:* neutral muted
- Persistensi status checklist tersimpan otomatis di `localStorage: lolos_journey_completed_days`.

---

### ── Bagian D: Integrasi Navigasi & Entry Points ──

#### Task 8: Update Navbar & Quick Links
**Path:** `src/components/Navbar.tsx`
- Tambahkan link `Journey` dan `Flashcard` di navigation bar atau menu "Lainnya" agar pengguna mudah mengakses fitur baru dari mana saja.
- Tambahkan entry point di halaman beranda `src/app/page.tsx`:
  - 3 Grid card fitur akselerasi baru di bawah Hero:
    1. 🎯 **Roadmap 30 Hari** (`/journey`) — Alur belajar terarah dari nol sampai mahir.
    2. 🃏 **Flashcard Hafalan** (`/flashcard`) — Rumus kilat & pasal UUD.
    3. ⚡ **Ulang Soal Salah** (`/drill/ulang-salah`) — Perbaiki kelemahan secara otomatis.

---

## 5. Verification & Tests Plan

1. **Test Helper Soal Salah (`src/lib/wrongAnswers.test.ts`):**
   - Simulasi 2 record ujian dengan 3 soal salah dan 2 soal benar.
   - Panggil `collectWrongQuestions()`, validasi mengembalikan tepat 3 item.
   - Panggil `markQuestionMastered(id)`, validasi jumlah berkurang menjadi 2 item.
2. **Build & Typecheck:**
   - Jalankan `npx next build` di root workspace.
   - Pastikan output exit code 0 dan seluruh route baru terkompilasi:
     - `○ /drill/ulang-salah`
     - `○ /flashcard`
     - `○ /journey`
3. **UI/UX Consistency:**
   - Cek kontras warna, responsivitas mobile (iPhone SE viewport & Desktop), dan kelancaran animasi flip 3D di Safari & Chrome.

---

## 6. Risks, Tradeoffs & Open Questions
- **Persistensi State Tanpa Login:** Pengguna anonim/tamu tetap bisa menggunakan ketiga fitur ini karena state tersimpan aman di `localStorage`. Jika user login, data dapat di-sinkronisasi ke cloud DB di fase berikutnya.
- **Ukuran Dataset Flashcard:** 35–40 kartu di awal adalah titik seimbang antara kelengkapan materi dan tidak membuat pengguna kewalahan (*cognitive overload*). Kartu tambahan dapat ditambah berkala.
