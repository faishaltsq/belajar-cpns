# Fitur Unggulan Kompetitif Platform CPNS (Competitive Edge Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan platform belajar CPNS memiliki keunggulan kompetitif mutlak dibanding kompetitor (SahabatCPNS, BisaCPNS, Belajarbro) dengan menambahkan 4 pilar fitur: (1) Post-Exam Deep Review dengan Filter Salah/Ragu, (2) Radar Diagnostik Kelemahan Sub-Kategori (TWK/TIU/TKP), (3) Live Ranking/Leaderboard Nasional berbasis PostgreSQL, dan (4) Toggle Tampilan Realistis CAT BKN.

**Architecture:** Frontend Next.js 14 App Router (React, Tailwind CSS, Phosphor Icons) berinteraksi dengan API routes Next.js yang terhubung ke Neon Serverless PostgreSQL. Hasil ujian disimpan beserta jawaban per-nomor ke `exam_results` untuk kalkulasi analitik subtopik dan leaderboard real-time. State exam menyimpan referensi full questions untuk rendering tab review interaktif.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Neon Serverless PostgreSQL (`@neondatabase/serverless`), Vitest, Phosphor Icons (`@phosphor-icons/react`).

**Spec:** Dokumen ini merupakan blueprint implementasi dari hasil riset kompetitor CPNS 2026.

## Global Constraints

- Design System: Claude Amber theme (`--background: #faf9f5`, `--primary: #c96442`, `--foreground: #3d3929`, `--card: #f5f4ef`, font Outfit) light mode only.
- Icons: Phosphor Icons (`@phosphor-icons/react`), dilarang lucide-react.
- Database: Neon Serverless PostgreSQL via `src/lib/db.ts` dengan query parameterized tagged template sql.
- Backward compatibility: Semua paket tryout yang ada (1-6, mini, dan custom) harus berfungsi tanpa migrasi manual.
- TDD Mandatory: Setiap modul logika kalkulasi (diagnostic analysis, leaderboard ranking) harus memiliki unit test Vitest sebelum implementasi kode.

## Review Focus

1. **Review Soal Kosong / Belum Dijawab**: User yang melewati soal tanpa menjawab (jawaban null) harus terhitung sebagai salah di TWK/TIU (skor 0) dan TKP (skor 0), serta muncul di filter "Belum Dijawab".
2. **TKP Pola Skoring 1-5**: Review harus menampilkan breakdown skor 1 sampai 5 untuk seluruh opsi A-E, dengan highlight hijau pada opsi berbobot 5.
3. **Penyimpanan Snapshot Jawaban di DB**: Jawaban exam tersimpan dalam format JSONB `{ "1": "A", "2": "C" }` di kolom `answers` tabel `exam_results`.
4. **Leaderboard Tie-Breaking**: Urutan ranking jika total skor sama mengikuti aturan BKN: TKP tertinggi -> TIU tertinggi -> TWK tertinggi -> durasi tercepat.
5. **Keamanan Data Pengguna**: Leaderboard publik hanya menampilkan nomor HP yang disamarkan (contoh: `0812****8899`) dan inisial nama.

---

### Task 1: Engine Diagnostik Sub-Kategori & TDD Unit Test

Membuat utility murni untuk menganalisis kelemahan peserta hingga tingkat subtopik (misal: "TWK - Bela Negara", "TIU - Silogisme", "TKP - Pelayanan Publik").

**Files:**
- Create: `src/lib/diagnostic.ts`
- Create: `tests/diagnostic.test.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `calculateSubcategoryDiagnostic(questions: Question[], answers: ExamAnswer[]): SubcategoryDiagnosticReport`

- [ ] **Step 1: Definisikan type data diagnostik di `src/lib/types.ts`**

Tambahkan interface:
```typescript
export interface SubcategoryStat {
  name: string;
  category: QuestionCategory;
  total: number;
  correct: number; // Untuk TKP: count dapat poin 5 atau 4
  earnedScore: number;
  maxScore: number;
  accuracyPercent: number;
  status: 'KUAT' | 'SEDANG' | 'LEMAH'; // >=80% KUAT, 60-79% SEDANG, <60% LEMAH
}

export interface SubcategoryDiagnosticReport {
  weakestSubcategories: SubcategoryStat[]; // Top 3 paling lemah
  strongestSubcategories: SubcategoryStat[]; // Top 3 paling kuat
  allSubcategories: SubcategoryStat[];
  recommendationNote: string;
}
```

- [ ] **Step 2: Tulis failing test di `tests/diagnostic.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSubcategoryDiagnostic } from '@/lib/diagnostic';
import { Question, ExamAnswer } from '@/lib/types';

describe('calculateSubcategoryDiagnostic', () => {
  const dummyQuestions: Question[] = [
    {
      id: 1,
      category: 'TWK',
      subCategory: 'Bela Negara',
      text: 'Soal 1',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
    {
      id: 2,
      category: 'TWK',
      subCategory: 'Bela Negara',
      text: 'Soal 2',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
    {
      id: 3,
      category: 'TIU',
      subCategory: 'Silogisme',
      text: 'Soal 3',
      options: [
        { id: 'A', text: 'A', score: 5 },
        { id: 'B', text: 'B', score: 0 },
      ],
      explanation: 'Ket',
    },
  ];

  it('mengidentifikasi subkategori terlemah dan terkuat dengan benar', () => {
    // User jawab benar soal 1 (Bela Negara), salah soal 2 (Bela Negara), salah soal 3 (Silogisme)
    const answers: ExamAnswer[] = [
      { questionId: 1, selectedOptionId: 'A' },
      { questionId: 2, selectedOptionId: 'B' },
      { questionId: 3, selectedOptionId: 'B' },
    ];

    const report = calculateSubcategoryDiagnostic(dummyQuestions, answers);
    expect(report.allSubcategories).toHaveLength(2);

    const silogisme = report.allSubcategories.find((s) => s.name === 'Silogisme');
    expect(silogisme?.accuracyPercent).toBe(0);
    expect(silogisme?.status).toBe('LEMAH');

    const belaNegara = report.allSubcategories.find((s) => s.name === 'Bela Negara');
    expect(belaNegara?.accuracyPercent).toBe(50);
    expect(belaNegara?.status).toBe('LEMAH');

    expect(report.weakestSubcategories[0].name).toBe('Silogisme');
  });
});
```

- [ ] **Step 3: Jalankan test untuk memverifikasi kegagalan**
Run: `npm test tests/diagnostic.test.ts`
Expected: FAIL "Cannot find module '@/lib/diagnostic'"

- [ ] **Step 4: Buat implementasi minimal di `src/lib/diagnostic.ts`**

```typescript
import { Question, ExamAnswer, SubcategoryStat, SubcategoryDiagnosticReport } from '@/lib/types';

export function calculateSubcategoryDiagnostic(
  questions: Question[],
  answers: ExamAnswer[]
): SubcategoryDiagnosticReport {
  const ansMap = new Map<number, string | null>();
  answers.forEach((a) => ansMap.set(a.questionId, a.selectedOptionId));

  const statsMap = new Map<
    string,
    {
      name: string;
      category: Question['category'];
      total: number;
      correct: number;
      earned: number;
      max: number;
    }
  >();

  for (const q of questions) {
    const sub = q.subCategory || 'Umum';
    const key = `${q.category}:${sub}`;
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        name: sub,
        category: q.category,
        total: 0,
        correct: 0,
        earned: 0,
        max: 0,
      });
    }

    const item = statsMap.get(key)!;
    item.total += 1;

    const maxOpt = Math.max(...q.options.map((o) => o.score || 0));
    item.max += maxOpt;

    const chosenId = ansMap.get(q.id);
    const chosenOpt = q.options.find((o) => o.id === chosenId);
    const score = chosenOpt ? chosenOpt.score : 0;
    item.earned += score;

    if (q.category === 'TKP') {
      if (score >= 4) item.correct += 1;
    } else {
      if (score === 5) item.correct += 1;
    }
  }

  const allSubcategories: SubcategoryStat[] = Array.from(statsMap.values()).map((s) => {
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    let status: SubcategoryStat['status'] = 'SEDANG';
    if (accuracy >= 80) status = 'KUAT';
    else if (accuracy < 60) status = 'LEMAH';

    return {
      name: s.name,
      category: s.category,
      total: s.total,
      correct: s.correct,
      earnedScore: s.earned,
      maxScore: s.max,
      accuracyPercent: accuracy,
      status,
    };
  });

  // Sort ascending for weakest (lowest accuracy first)
  const weakestSubcategories = [...allSubcategories]
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 3);

  // Sort descending for strongest
  const strongestSubcategories = [...allSubcategories]
    .sort((a, b) => b.accuracyPercent - a.accuracyPercent)
    .slice(0, 3);

  const weakestNames = weakestSubcategories.map((w) => w.name).join(', ');
  const recommendationNote = weakestSubcategories.length
    ? `Prioritas belajar Anda selanjutnya: Perdalam materi ${weakestNames} untuk mendongkrak skor Passing Grade.`
    : 'Performa merata, pertahankan latihan rutin!';

  return {
    weakestSubcategories,
    strongestSubcategories,
    allSubcategories,
    recommendationNote,
  };
}
```

- [ ] **Step 5: Verifikasi test pass dan commit**
Run: `npm test tests/diagnostic.test.ts`
Expected: PASS 1/1
Run: `git commit -m "feat(diagnostic): subcategory weakness detection engine with unit tests"`

---

### Task 2: Modul Bedah Soal Interaktif (Post-Exam Deep Review)

Membangun komponen review interaktif di halaman hasil ujian (`/simulasi/hasil/[resultId]`) agar peserta bisa mempelajari semua soal dengan filter cerdas.

**Files:**
- Create: `src/components/ExamQuestionReview.tsx`
- Modify: `src/app/simulasi/hasil/[resultId]/page.tsx`
- Modify: `src/app/simulasi/[id]/page.tsx` (simpan questions & answers ke localStorage saat submit)

**Interfaces:**
- `ExamQuestionReview`: Props `{ questions: Question[]; userAnswers: ExamAnswer[] }`

- [ ] **Step 1: Update simpanan di `src/app/simulasi/[id]/page.tsx`**

Pastikan saat `submitExam`, selain `exam_result_${resultId}`, juga disimpan payload lengkap:
```typescript
localStorage.setItem(`exam_questions_${resultId}`, JSON.stringify(questions));
localStorage.setItem(`exam_user_answers_${resultId}`, JSON.stringify(answerArr));
```

- [ ] **Step 2: Buat komponen `src/components/ExamQuestionReview.tsx`**

Fitur dalam komponen:
- 4 tombol filter tab: `Semua (110)`, `❌ Hanya Salah (N)`, `🚩 Ragu-ragu (N)`, `⏳ Terlewat (N)`.
- Navigasi nomor soal di kiri / atas.
- Tampilan kartu soal lengkap:
  - Teks pertanyaan + Gambar (jika ada).
  - List opsi A-E dengan penanda visual:
    - Opsi yang dipilih pengguna (border warna).
    - Opsi yang benar (background hijau muda, badge "Jawaban Benar" & skor).
    - Untuk TKP: Tampilkan bobot skor tiap opsi (1-5).
  - Kotak Pembahasan berwarna cream-accent dengan icon Lampu/Buku: Menampilkan `question.explanation`.

- [ ] **Step 3: Integrasikan ke `src/app/simulasi/hasil/[resultId]/page.tsx`**

Tambahkan tab switcher di bawah kartu skor:
- Tab 1: **Ringkasan & Analisis Kelemahan** (skor, PG, radar subtopik).
- Tab 2: **Bedah Pembahasan Soal** (memuat `<ExamQuestionReview />`).

- [ ] **Step 4: Verifikasi build dan render**
Run: `npm run build`
Expected: Build sukses tanpa error TypeScript.

- [ ] **Step 5: Commit**
`git commit -m "feat(review): interactive post-exam question review with smart mistake filtering"`

---

### Task 3: Visualisasi Radar Kelemahan Sub-Kategori di Halaman Hasil

Menampilkan kartu grafis analisis performa di halaman hasil ujian.

**Files:**
- Create: `src/components/DiagnosticReportCard.tsx`
- Modify: `src/app/simulasi/hasil/[resultId]/page.tsx`

**Features:**
- Highlight 3 titik terlemah dengan badge merah/oranye ("Perlu Perhatian Khusus").
- Progress bar akurasi per subtopik (contoh: *Bela Negara: 40% (2/5 Benar)*).
- Rekomendasi aksi belajar terpersonalisasi.

- [ ] **Step 1: Buat `src/components/DiagnosticReportCard.tsx`**
Styling menggunakan palette Claude Amber (`var(--card)`, `var(--primary)`, `var(--border)`).
Menampilkan:
1. Rekomendasi Pintar (AI-style callout card).
2. Grid subtopik terlemah dengan status badge `LEMAH`, `SEDANG`, `KUAT`.
3. Akurasi persentase per sub-materi.

- [ ] **Step 2: Hubungkan di `src/app/simulasi/hasil/[resultId]/page.tsx`**
Hitung diagnostik saat hasil di-load:
```typescript
const diagnostic = useMemo(() => {
  if (!questions.length || !userAnswers.length) return null;
  return calculateSubcategoryDiagnostic(questions, userAnswers);
}, [questions, userAnswers]);
```

- [ ] **Step 3: Verifikasi via Vitest & Next build**
Run: `npm test && npm run build`
Expected: 44/44 pass, zero build errors.

- [ ] **Step 4: Commit**
`git commit -m "feat(analytics): add subcategory weakness diagnostic card on exam result page"`

---

### Task 4: Real-Time Leaderboard & Peringkat Nasional (Neon PostgreSQL)

Menampilkan ranking seluruh peserta per paket ujian dengan sistem tie-breaker resmi BKN.

**Files:**
- Create: `src/app/api/leaderboard/[packageId]/route.ts`
- Create: `src/components/LeaderboardCard.tsx`
- Create: `tests/leaderboard.test.ts`
- Modify: `src/lib/db.ts` (fungsi fetch leaderboard)

**Logika Tie-Breaker BKN (PermenPAN-RB):**
1. Total skor tertinggi.
2. Jika total sama -> Skor TKP tertinggi.
3. Jika TKP sama -> Skor TIU tertinggi.
4. Jika TIU sama -> Skor TWK tertinggi.
5. Jika semua sama -> Durasi pengerjaan tercepat (`duration_used ASC`).

- [ ] **Step 1: Tulis test logika tie-breaker di `tests/leaderboard.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';

interface RankEntry {
  userId: string;
  totalScore: number;
  scoreTkp: number;
  scoreTiu: number;
  scoreTwk: number;
  durationUsed: number;
}

function sortLeaderboard(entries: RankEntry[]): RankEntry[] {
  return [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.scoreTkp !== a.scoreTkp) return b.scoreTkp - a.scoreTkp;
    if (b.scoreTiu !== a.scoreTiu) return b.scoreTiu - a.scoreTiu;
    if (b.scoreTwk !== a.scoreTwk) return b.scoreTwk - a.scoreTwk;
    return a.durationUsed - b.durationUsed;
  });
}

describe('BKN Tie-breaker rule', () => {
  it('mengurutkan berdasarkan TKP jika total skor sama', () => {
    const list: RankEntry[] = [
      { userId: 'A', totalScore: 400, scoreTkp: 170, scoreTiu: 130, scoreTwk: 100, durationUsed: 5000 },
      { userId: 'B', totalScore: 400, scoreTkp: 185, scoreTiu: 120, scoreTwk: 95, durationUsed: 5200 },
    ];
    const sorted = sortLeaderboard(list);
    expect(sorted[0].userId).toBe('B'); // B menang karena TKP 185 > 170
  });
});
```

- [ ] **Step 2: Jalankan test tie-breaker**
Run: `npm test tests/leaderboard.test.ts`
Expected: PASS

- [ ] **Step 3: Tambah query leaderboard di `src/lib/db.ts`**

Tambahkan fungsi:
```typescript
export async function getPackageLeaderboard(packageId: string, limit = 50) {
  const sql = getDb();
  if (!sql) return [];
  return sql`
    SELECT
      r.id,
      r.total_score,
      r.score_tkp,
      r.score_tiu,
      r.score_twk,
      r.duration_used,
      r.is_passed,
      r.finished_at,
      COALESCE(u.name, 'Peserta ' || SUBSTRING(r.id::text, 1, 4)) as user_name,
      CASE 
        WHEN u.phone IS NOT NULL THEN SUBSTRING(u.phone, 1, 4) || '****' || SUBSTRING(u.phone, LENGTH(u.phone)-3, 4)
        ELSE '0812****' || SUBSTRING(r.id::text, 1, 4)
      END as masked_phone
    FROM exam_results r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.package_id = ${packageId}
    ORDER BY
      r.total_score DESC,
      r.score_tkp DESC,
      r.score_tiu DESC,
      r.score_twk DESC,
      r.duration_used ASC
    LIMIT ${limit}
  `;
}
```

- [ ] **Step 4: Buat API route `src/app/api/leaderboard/[packageId]/route.ts`**
Return format JSON leaderboard dengan cache 60 detik.

- [ ] **Step 5: Buat komponen `src/components/LeaderboardCard.tsx`**
Komponen tabel ranking:
- Kolom: Peringkat (#1, #2, #3 pakai icon Trophy/Medali), Nama/No.HP (disamarkan), TWK, TIU, TKP, Total Skor, Status Kelulusan (Lulus/Gugur).
- Posisi ranking user yang sedang login di-highlight dengan latar `--secondary`.

- [ ] **Step 6: Pasang di halaman hasil ujian & katalog tryout**
User bisa melihat posisi mereka di ranking nasional setelah ujian selesai.

- [ ] **Step 7: Verifikasi & Commit**
Run: `npm test && npm run build`
`git commit -m "feat(leaderboard): real-time national ranking with BKN tie-breaker rules"`

---

### Task 5: Toggle Tampilan Realistis CAT BKN (Layout Mode BKN Asli)

Menyediakan opsi switch di sesi ujian: peserta bisa memilih antara **Mode Modern Clean** (default Claude Amber) atau **Mode Simulasi BKN Resmi** (layout abu-abu/biru khas sistem CAT BKN yang dipakai saat ujian sesungguhnya di BKN/Kanreg).

**Files:**
- Create: `src/components/BKNThemeLayout.tsx`
- Modify: `src/app/simulasi/[id]/page.tsx`

**Features:**
- Tombol switch: `[Modern View] | [🖥️ Simulasi Tampilan BKN Resmi]`.
- Dalam mode BKN:
  - Header khas CAT BKN: Logo Garuda / BKN, nama peserta, nomor peserta simulasi.
  - Sidebar nomor soal di sisi kanan dengan warna khas: Putih (Belum dijawab), Hijau (Sudah dijawab), Merah (Ragu-ragu).
  - Teks soal dengan font Arial/Sans ukuran tegas dan tombol navigasi besar di bawah.
- Nilai jual: *"Latih mental Anda agar tidak kaget saat melihat layar ujian asli di gedung BKN."*

- [ ] **Step 1: Buat wrapper style / komponen `BKNThemeLayout.tsx`**
Menerima state questions, currentIndex, answers, timer, dan render dengan layout CAT BKN klasik.

- [ ] **Step 2: Tambahkan toggle mode di header `simulasi/[id]/page.tsx`**
Simpan preferensi mode ke `localStorage.getItem('cat_view_mode')`.

- [ ] **Step 3: Verifikasi responsivitas & build**
Run: `npm run build`

- [ ] **Step 4: Commit**
`git commit -m "feat(ui): add authentic BKN CAT layout mode toggle for realistic exam conditioning"`

---

### Task 6: Drill Mode / Latihan Kilat 10 Soal per Subtopik (Fitur Cepat Latihan)

Memungkinkan peserta melatih topik tertentu (misal hanya 10 soal Silogisme, atau 10 soal Deret Angka) tanpa harus mengerjakan full tryout 100 menit.

**Files:**
- Create: `src/app/drill/page.tsx`
- Create: `src/app/drill/[category]/[subCategory]/page.tsx`
- Modify: `src/components/Navbar.tsx` (tambahkan menu "Latihan Kilat")

**Features:**
- Daftar topik dengan progress bar penguasaan.
- Sesi latihan 10 soal langsung dengan pembahasan instan per nomor (bukan nunggu submit akhir).
- Instant gratification: Begitu klik jawaban, langsung tahu benar/salah + trik menjawabnya.

- [ ] **Step 1: Buat route pemilihan topik `src/app/drill/page.tsx`**
Pilihan kategori: TWK, TIU, TKP, beserta pill topik masing-masing.

- [ ] **Step 2: Buat route pengerjaan latihan kilat**
Timer santai (tidak ada batas gugur), feedback instan setelah memilih opsi.

- [ ] **Step 3: Verifikasi test & build**
Run: `npm test && npm run build`

- [ ] **Step 4: Commit**
`git commit -m "feat(drill): add 10-question focused drill mode with instant explanation per subcategory"`

---

## Ringkasan Matriks Keunggulan Dibanding Kompetitor

| Fitur | Platform Kita (Nyoal Dulu / CPNSMaster) | SahabatCPNS | BisaCPNS | Belajarbro |
|---|---|---|---|---|
| **Simulasi CAT BKN Standar** | ✅ 110 Soal / 100 Menit | ✅ Ada | ✅ Ada | ✅ Ada |
| **Post-Exam Mistake Filter** | ✅ Filter 1-klik "Hanya Salah" & "Ragu" | ❌ Harus scroll | ❌ Harus scroll | ❌ Parsial |
| **Radar Kelemahan Sub-Kategori** | ✅ Analisis otomatis 19 subtopik resmi | ❌ Hanya TWK/TIU/TKP | ❌ Terbatas | ❌ Tidak ada |
| **Leaderboard Tie-Breaker BKN** | ✅ Real-time PostgreSQL tie-breaking | ✅ Ada | ✅ Ada | ❌ Statis |
| **Toggle Tampilan Resmi BKN** | ✅ Modern Claude Amber vs BKN Asli | ❌ Hanya 1 tampilan | ❌ Hanya 1 tampilan | ❌ Hanya 1 tampilan |
| **Latihan Kilat / Drill Mode** | ✅ 10 soal instant explanation | ❌ Harus paket besar | ❌ Terbatas | ❌ Tidak ada |
| **Figural Soal Asli Ebook** | ✅ High-res image bank | ⚠️ Vektor sederhana | ⚠️ Terbatas | ⚠️ Terbatas |
