# Plan: Fitur Gap Analysis & Roadmap Pengembangan Meniru JadiASN (`app.jadiasn.id`)

**Date:** 2026-10-05  
**Benchmark:** [JadiASN](https://app.jadiasn.id/) (`jadiasn.id`)  
**Workspace:** `belajar-cpns-saas` (Next.js 14 App Router, TypeScript, Neon PostgreSQL, Tailwind, Phosphor Icons)  
**Deliverable Path:** `.hermes/plans/2026-10-05_gap-analysis-dan-roadmap-fitur-jadiasn.md`

---

## 1. Goal
Menutup gap fitur antara Lolos.in dan JadiASN (`app.jadiasn.id`) melalui roadmap bertahap yang mencakup: Modul Materi/Rangkuman SKD, Cek Formasi CPNS, Mode Drilling Soal Salah (Weakness Drill), dan Journey/Roadmap Belajar Harian, dengan tetap mempertahankan identitas brand Lolos.in (Claude Amber, `#faf9f5`, `#c96442`, light mode, tanpa logo BKN/Garuda resmi).

---

## 2. Current Context & Gap Matrix

### 2.1 Perbandingan Fitur Utama

| Fitur di JadiASN | Status di Lolos.in | Gap & Catatan Kebutuhan | Prioritas |
| :--- | :--- | :--- | :--- |
| **1. Tryout CAT SKD (110 soal)** | ✅ **Sudah Ada** | 34 paket standar BKN + 2 paket khusus (~3.816 butir). Fitur timer, ragu-ragu, auto-submit, skoring BKN sudah lengkap. | Rendah (Sudah Solid) |
| **2. Modul Materi SKD (`/materi`)** | ❌ **Belum Ada** | JadiASN menyediakan materi terstruktur (TWK, TIU, TKP) dengan rangkuman konsep, rumus cepat, dan kisi-kisi permenpan. Lolos.in saat ini belum punya halaman membaca materi. | **P0 (Tinggi)** |
| **3. Cek Formasi CPNS (`/formasi`)** | ❌ **Belum Ada** | Fitur pencarian formasi berdasarkan kualifikasi pendidikan (S-1, D-III, SMA), instansi, dan jabatan. Sangat vital untuk magnet traffic dan engagement. | **P0 (Tinggi)** |
| **4. Drilling / Latihan Soal** | ⚠️ **Sebagian** | Lolos.in sudah punya `/drill` per subkategori (10 soal). Tapi belum ada: **Mode Ulang Salah** (mengulang soal yang dijawab salah di riwayat tryout) dan **Drilling Kelemahan** (otomatis rekomendasikan subtopik terlemah berdasarkan skor diagnostic). | **P1 (Sedang)** |
| **5. Journey Belajar ("Dibimbing")** | ❌ **Belum Ada** | JadiASN punya alur belajar terstruktur 30 hari (Hari 1: TWK Nasionalisme -> Hari 2: TIU Berhitung -> dll). Di Lolos.in user masih memilih paket secara acak. | **P1 (Sedang)** |
| **6. Flashcard Cepat** | ❌ **Belum Ada** | JadiASN punya flashcard kartu hafalan pasal UUD 1945, tokoh bangsa, dan rumus cepat TIU. | **P2 (Opsional)** |
| **7. Live Class / Zoom** | ❌ **Belum Ada** | Butuh instruktur live (operasional tinggi). Bisa disubstitusi dengan rekaman video pembahasan Youtube unlisted / link grup belajar Telegram/WA. | **P3 (Operasional)** |
| **8. Leaderboard Nasional Global** | ⚠️ **Sebagian** | Leaderboard saat ini hanya per paket ujian di halaman hasil. Belum ada halaman leaderboard umum (ranking skor tertinggi seluruh user). | **P2 (Menengah)** |

---

## 3. Proposed Architecture & Approach

Untuk mengeksekusi penambahan fitur ini tanpa merusak fondasi yang sudah stabil, pendekatan dibagi menjadi 3 Tahap Terfokus:

1. **Fase 1 (Paling Cepat & Dampak Besar): Modul Materi SKD Terstruktur (`/materi`)**
   - Buat schema content berbasis Markdown/JSON untuk materi TWK (Pilar Negara, Bela Negara, UUD 1945), TIU (Kemampuan Numerik, Silogisme, Analitis), dan TKP.
   - Buat halaman indeks materi `/materi` dan pembaca materi `/materi/[kategori]/[slug]`.
   - Tambahkan tab "Materi" di `Navbar.tsx`.

2. **Fase 2: Fitur Cek Formasi CPNS Interaktif (`/formasi`)**
   - Dataset referensi formasi CPNS (Instansi, Jabatan, Kualifikasi Pendidikan, Jumlah Kebutuhan).
   - Filter instan di client side (search by jurusan, instansi, jenjang).

3. **Fase 3: Smart Drilling — Mode Ulang Soal Salah (`/drill/salah`)**
   - Mengambil kumpulan `answers` dari riwayat ujian user yang salah, lalu menghasilkan paket drill khusus 10 butir untuk menguji kembali soal-soal yang pernah gagal dijawab.

---

## 4. Step-by-Step Implementation Tasks (Fase 1: Modul Materi SKD)

Berikut adalah rincian task teknis untuk implementer yang siap dieksekusi langkah demi langkah:

### Task 1: Buat Struktur Data Materi SKD
- **File Baru:** `src/data/materi/index.ts`
- **Tujuan:** Menyediakan indeks bab, subtopik, estimasi waktu baca, dan konten inti materi yang bebas hak cipta/orisinal.
- **Implementasi:**
  ```typescript
  // src/data/materi/index.ts
  export interface SubBabMateri {
    slug: string;
    title: string;
    readTimeMinutes: number;
    summary: string;
    content: string; // Markdown format
  }

  export interface KategoriMateri {
    category: 'TWK' | 'TIU' | 'TKP';
    label: string;
    description: string;
    topics: SubBabMateri[];
  }

  export const MATERI_LIST: KategoriMateri[] = [
    {
      category: 'TWK',
      label: 'Tes Wawasan Kebangsaan',
      description: 'Penguasaan pengetahuan dan implementasi pilar kebangsaan, nasionalisme, dan integritas ASN.',
      topics: [
        {
          slug: 'nasionalisme-dan-bela-negara',
          title: 'Nasionalisme & Nilai-Nilai Bela Negara',
          readTimeMinutes: 5,
          summary: 'Konsep cinta tanah air, kesadaran berbangsa, dan 5 indikator nilai dasar bela negara.',
          content: `...`
        },
        {
          slug: 'uud-1945-dan-tata-negara',
          title: 'UUD 1945 & Sistem Ketatanegaraan RI',
          readTimeMinutes: 8,
          summary: 'Struktur lembaga negara, amandemen UUD 1945 I-IV, dan pasal-pasal kunci hak asasi.',
          content: `...`
        },
        {
          slug: 'pancasila-dan-pengamalan-butir',
          title: 'Pancasila & Pengamalan Butir Sila',
          readTimeMinutes: 6,
          summary: 'Kunci membedakan pengamalan Sila ke-2 vs Sila ke-5, dan integritas ASN.',
          content: `...`
        }
      ]
    },
    {
      category: 'TIU',
      label: 'Tes Inteligensia Umum',
      description: 'Kemampuan verbal, logika numerik, dan penalaran analitis sistematis.',
      topics: [
        {
          slug: 'trik-cepat-numerik-pecahan',
          title: 'Trik Hitung Cepat Pecahan & Aljabar',
          readTimeMinutes: 6,
          summary: 'Pola perkalian istimewa, konversi desimal ke persen, dan estimasi nilai tanpa hitung manual.',
          content: `...`
        },
        {
          slug: 'silogisme-dan-penarikan-kesimpulan',
          title: 'Logika Silogisme & Modus Operandi',
          readTimeMinutes: 7,
          summary: 'Modus Ponens, Tollens, Silogisme, serta jebakan kata "Semua" vs "Sebagian".',
          content: `...`
        },
        {
          slug: 'deret-angka-dan-huruf',
          title: 'Pola Deret Angka & Huruf Bertingkat',
          readTimeMinutes: 6,
          summary: 'Mengenali deret larik (lompat 1, 2, 3), deret Fibonacci, dan deret kuadrat/kubik.',
          content: `...`
        }
      ]
    },
    {
      category: 'TKP',
      label: 'Tes Karakteristik Pribadi',
      description: 'Kunci jawaban poin 5 untuk aspek pelayanan publik, jejaring kerja, dan profesionalisme.',
      topics: [
        {
          slug: 'aspek-pelayanan-publik-skor-5',
          title: 'Strategi Jawaban Poin 5: Pelayanan Publik',
          readTimeMinutes: 5,
          summary: 'Ciri jawaban skor 5: berorientasi kepuasan masyarakat, empati, tanpa melanggar regulasi.',
          content: `...`
        },
        {
          slug: 'jejaring-kerja-dan-teknologi-informasi',
          title: 'Jejaring Kerja & Adaptasi Teknologi',
          readTimeMinutes: 5,
          summary: 'Kunci memposisikan diri dalam tim, kolaborasi lintas divisi, dan keterbukaan terhadap inovasi.',
          content: `...`
        }
      ]
    }
  ];
  ```

---

### Task 2: Buat Halaman Katalog Indeks Materi (`/materi`)
- **File Baru:** `src/app/materi/page.tsx`
- **Fitur:**
  - Header judul dan deskripsi modul materi SKD
  - Tab filter kategori: Semua / TWK / TIU / TKP
  - Grid card materi dengan indikator waktu baca, ringkasan, dan badge subtes
  - Search bar materi berdasarkan judul atau kata kunci
  - Tombol CTA "Mulai Baca" menuju `/materi/[kategori]/[slug]`
- **Verifikasi:**
  Jalankan `npm run dev` dan buka `http://localhost:3000/materi`. Pastikan semua list materi tampil dengan styling Claude Amber.

---

### Task 3: Buat Halaman Baca Materi Detail (`/materi/[category]/[slug]`)
- **File Baru:** `src/app/materi/[category]/[slug]/page.tsx`
- **Fitur:**
  - Breadcrumb navigasi: `Beranda > Materi > TWK > Judul Materi`
  - Floating reading progress bar di bagian atas layar
  - Markdown / formatted prose reader yang nyaman dibaca di mobile dan desktop
  - Kotak "Poin Penting untuk Ujian (Cheat Sheet)" di setiap akhir bab
  - Rekomendasi latihan soal terkait (CTA "Langsung Latih Soal Ini di Modul Drill") linking ke `/drill/[category]/...`
- **Verifikasi:**
  Buka salah satu materi, scroll sampai akhir, klik tombol "Latihan Soal Terkait", dan pastikan dialihkan ke halaman drill yang tepat.

---

### Task 4: Tambahkan Link "Materi" di `Navbar.tsx`
- **File:** `src/components/Navbar.tsx`
- **Perubahan:**
  Tambahkan `{ href: '/materi', label: 'Materi' }` ke dalam `NAV_LINKS`.
- **Verifikasi:**
  Buka browser, pastikan link "Materi" muncul di navbar desktop dan menu dropdown mobile.

---

## 5. Step-by-Step Implementation Tasks (Fase 2: Fitur Cek Formasi CPNS)

### Task 5: Siapkan Mock / Data Lookup Formasi CPNS
- **File Baru:** `src/data/formasi/cpns_sample.json`
- **Struktur Data:**
  ```json
  [
    {
      "id": "formasi-1",
      "instansi": "Kementerian Hukum dan HAM",
      "jabatan": "Penjaga Tahanan",
      "pendidikan": "SLTA / SMA Sederajat",
      "jenjang": "SMA",
      "kebutuhan": "Umum",
      "lokasi": "Seluruh Kantor Wilayah Kemenkumham",
      "perkiraan_kuota": "Ribuan Formasi"
    },
    {
      "id": "formasi-2",
      "instansi": "Kejaksaan Republik Indonesia",
      "jabatan": "Pengelola Penanganan Perkara",
      "pendidikan": "D-III Komputer / Manajemen Informatika / Administrasi",
      "jenjang": "D3",
      "kebutuhan": "Umum",
      "lokasi": "Kejaksaan Negeri / Tinggi se-Indonesia",
      "perkiraan_kuota": "Ratusan Formasi"
    },
    {
      "id": "formasi-3",
      "instansi": "Kementerian Keuangan",
      "jabatan": "Analis Kebijakan Pertama",
      "pendidikan": "S-1 Ekonomi / Hukum / Kebijakan Publik",
      "jenjang": "S1",
      "kebutuhan": "Umum & Cumlaude",
      "lokasi": "Pusat & Regional Kemenkeu",
      "perkiraan_kuota": "Tersedia"
    }
  ]
  ```

### Task 6: Buat Halaman Cek Formasi (`/formasi`)
- **File Baru:** `src/app/formasi/page.tsx`
- **Fitur:**
  - Search box input (Cari jurusan atau jabatan)
  - Filter jenjang pendidikan (Semua, SMA/SMK, D3, D4/S1, S2)
  - Card list formasi yang rapi dan informatif
  - Tombol "Set sebagai Target Formasi Saya" (yang otomatis memperbarui data `target_instansi` dan `target_formasi` di profil pengguna `/profil`).

---

## 6. Step-by-Step Implementation Tasks (Fase 3: Mode "Ulang Soal Salah")

### Task 7: Endpoint API Soal Salah (`GET /api/user/wrong-questions`)
- **File Baru:** `src/app/api/user/wrong-questions/route.ts`
- **Logic:**
  - Ambil `user_id` dari session cookie
  - Query riwayat ujian terakhir di `exam_results`
  - Ekstrak id soal yang dijawab salah
  - Query ke tabel `questions` untuk mendapatkan 10 butir soal tersebut
  - Return JSON format siap dikerjakan di mode drill.

### Task 8: Buat Halaman Drill Soal Salah (`/drill/ulang-salah`)
- **File Baru:** `src/app/drill/ulang-salah/page.tsx`
- **Logic:**
  - Load pertanyaan dari `/api/user/wrong-questions`
  - Jalankan engine pengerjaan soal interaktif (serupa dengan `/drill/[category]/[subCategory]`)
  - Berikan feedback pembahasan langsung setelah user memilih jawaban.

---

## 7. Tests & Validation Plan

1. **Routing & Build Verification:**
   - Jalankan `npx next build` untuk memastikan tidak ada dynamic route collision atau TypeScript compilation errors pada `/materi`, `/materi/[category]/[slug]`, `/formasi`, dan `/drill/ulang-salah`.
2. **Design & Brand Compliance:**
   - Background wajib `#faf9f5`
   - Accent color `#c96442`
   - Icon hanya dari `@phosphor-icons/react`
   - Tanpa logo garuda resmi / logo BKN.
3. **Data Integrity Test:**
   - Link latihan soal dari materi detail terhubung langsung ke kategori drill yang valid.

---

## 8. Risks, Tradeoffs & Open Questions

- **Video Pembahasan:** Di JadiASN, setiap soal punya video pembahasan. Untuk Lolos.in, membuat ribuan video membutuhkan biaya dan waktu produksi tinggi. *Keputusan:* Fokus pada **pembahasan teks analitis yang mendalam dan mudah dipahami** terlebih dahulu (lebih disukai peserta yang ingin belajar cepat tanpa buffering).
- **Data Formasi Resmi:** Instansi dan formasi resmi baru diumumkan saat pembukaan seleksi resmi dibuka oleh BKN. *Keputusan:* Gunakan data historis seleksi tahun terakhir sebagai panduan dan referensi pengguna, beri label jelas "Berdasarkan Pengadaan Terakhir & Kisi-Kisi Resmi".
