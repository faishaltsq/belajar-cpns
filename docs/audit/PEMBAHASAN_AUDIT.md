# Audit Pembahasan vs Soal — Drill & Tryout

Tanggal: 2026-10-21
Cakupan: **37 paket, 3.898 soal** (`src/data/packages/*.json`)

## Ringkasan

Laporan awal (2 screenshot) menunjukkan pembahasan milik soal lain. Setelah ditelusuri,
itu **bukan satu bug** melainkan empat cacat terpisah pada lapisan berbeda:

| # | Cacat | Lapisan | Terdampak | Status |
|---|-------|---------|-----------|--------|
| 1 | Pembahasan diambil dari paket yang salah | runtime | 220 / 330 soal drill (66,7%) | **FIXED** |
| 2 | Prefix `Soal nomor N (...)` tidak ter-strip | runtime | semua drill bersub-kategori bersarang | **FIXED** |
| 3 | Pembahasan kosong di menu Ulang Salah | runtime | seluruh sesi drill | **FIXED** |
| 4 | Pembahasan hanya berisi kunci jawaban | data | 286 soal (tryout-8…17) | OPEN |
| 5 | Peta poin bertentangan dengan bobot opsi | data | 25 soal TKP | OPEN |
| 6 | Pembahasan menyebut huruf opsi yang salah | data | 173 soal (tryout-2…6, mini) | OPEN |
| 7 | Pembahasan figural kosong | data | 59 soal (`tryout-figural-2`) | OPEN |

Cacat 1–3 sudah diperbaiki dan terverifikasi (commit `cf8d87c`). Cacat 4–7 adalah
**isi konten**, bukan kode: perbaikannya butuh penulisan ulang pembahasan per butir.

---

## Cacat 1 — Pembahasan diambil dari paket yang salah (FIXED)

### Akar masalah

`DrillSession.tsx` menggabungkan `tryout-1`, `tryout-2`, `tryout-3` sekaligus. Ketiga
paket menomori soalnya **1–110**, jadi id tidak unik setelah merge. Kode lama membangun
peta pemilik **setelah** merge:

```ts
for (const r of results) for (const q of r.questions) owner[q.id] = r.pkg;
```

Penulis terakhir menang → `tryout-3` menimpa seluruh peta. Setiap kali pengguna menjawab,
`/api/drill/check` dipanggil dengan `packageId` + `id`, dan karena peta selalu menunjuk
`tryout-3`, kunci serta pembahasan diambil dari soal lain yang kebetulan ber-id sama.

### Bukti

`verify-collide.mjs`:

```
tryout-1: n=110 idMin=1 idMax=110
tryout-2: n=110 idMin=1 idMax=110
tryout-3: n=110 idMin=1 idMax=110
IDS IN ALL THREE = 110
last-wins owner distribution: {"tryout-3": 110}
wrong 220/330 = 66.7%
```

Reproduksi verbatim keluhan pengguna — id=18:

| | |
|---|---|
| Dirender | "Sikap musyawarah untuk mencapai mufakat…" (tryout-1) |
| Diquery | "UU No. 23 Tahun 2019 … Komponen Cadangan" (tryout-3) |

Data JSON-nya sendiri **sehat**: `tryout-1#18` berisi
*"Sila keempat menekankan kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam
permusyawaratan"* — cocok sempurna dengan soalnya.

### Perbaikan

`sourcePackage` menempel pada objek soal sejak merge (`mergeDrillPackages` di
`src/lib/drillHelper.ts`), bukan peta terpisah yang dibangun setelahnya.

---

## Cacat 2 — Prefix soal tidak ter-strip (FIXED)

`stripQuestionPrefix` memakai `\([^)]*\)`, yang berhenti di kurung dalam. Sub-kategori
seperti `Pilar Negara (Pancasila)` menyisakan `): ` menempel di depan soal:

```
Soal nomor 18 (Pilar Negara (Pancasila)): Sikap musyawarah…
                                        ^^ sisa
```

Regex baru menoleransi kurung bersarang:
`^Soal\s+(?:nomor|no\.?)\s+\d+(?:\s*\((?:[^()]|\([^()]*\))*\))?\s*:\s*`

---

## Cacat 3 — Pembahasan kosong di Ulang Salah (FIXED)

`toPublicQuestion` membuang `explanation` dari setiap snapshot localStorage, sehingga
snapshot drill tidak pernah menyimpan pembahasan. `ulang-salah/page.tsx` merender
`{q.explanation}` langsung **tanpa fallback** → kotak Pembahasan kosong dari kedua
sumbernya.

Perbaikan: pembahasan disimpan ke `drill_explanations_<sessionId>` **saat sesi selesai**
(bukan saat reveal — kalau saat reveal, kunci bisa bocor sebelum sesi berakhir), lalu
`wrongAnswers.ts` mengisinya kembali. UI kini punya fallback eksplisit.

---

## Cacat 4 — Pembahasan hanya berisi kunci jawaban (OPEN, 286 soal)

Pembahasan tidak menjelaskan apa pun:

```
tryout-10#7  → "Pembahasan: Kunci jawaban yang tepat adalah A."
tryout-12#2  → "Pembahasan: Kunci jawaban yang tepat adalah B."
```

Tersebar di paket hasil impor batch lama:

| paket | jumlah | paket | jumlah |
|-------|--------|-------|--------|
| tryout-11 | 36 | tryout-12 | 28 |
| tryout-17 | 34 | tryout-8 | 27 |
| tryout-14 | 31 | tryout-10 | 27 |
| tryout-15 | 29 | tryout-9 | 26 |
| tryout-16 | 28 | tryout-13 | 20 |

Paket yang lebih baru (tryout-1…7, 18…34) bersih dari pola ini.

---

## Cacat 5 — Peta poin bertentangan dengan bobot opsi (OPEN, 25 soal TKP)

Pembahasan mempublikasikan peta poin yang tidak cocok dengan skor opsi yang benar-benar
dipakai aplikasi untuk menghitung nilai:

```
tryout-26#88
  Opsi    : A=4, B=3, C=2, D=1, E=5
  Klaim   : "Poin: A=3, B=1, C=4, D=2, E=5"
```

Pengguna membaca satu hal, dinilai dengan hal lain. Tersebar di tryout-25, 26, 27, 28,
31, 32, 34.

Catatan penting: bobot TKP di data memang beragam (126 pola berbeda untuk 1.540 soal),
jadi keberagaman itu sendiri bukan cacat — yang cacat adalah **teks pembahasan yang
menyatakan angka berbeda dari datanya**.

---

## Cacat 6 — Pembahasan menyebut huruf opsi yang salah (OPEN, 173 soal)

Teks pembahasannya benar, hurufnya salah. Contoh `tryout-2#77`:

| Opsi | Skor | Isi |
|------|------|-----|
| B | 1 | Memberikan brosur panduan dan memintanya membaca sendiri |
| **D** | **5** | **Mendampingi pemohon langsung langkah demi langkah** |

> Pembahasan: *"**Pilihan B** bernilai 5 karena memberikan asistensi tuntas (edukatif dan
> solutif), memastikan pemohon terlayani sekaligus mandiri…"*

Kalimatnya mendeskripsikan **D**, tapi menempelkan label **B**. Kasus serupa dan lebih
ekstrem di `tryout-3#70`, di mana pembahasan memuji "Pilihan A" sebagai cerminan
integritas aktif padahal opsi A berbunyi *"Menyindir tindakan curang tersebut dalam
obrolan santai"* (skor 2) — deskripsi itu milik opsi E (skor 5).

Terkonsentrasi di tryout-2 (33), tryout-5 (32), tryout-4 (30), tryout-3 (28),
tryout-6 (23), tryout-mini (9).

---

## Cacat 7 — Pembahasan figural kosong (OPEN, 59 soal)

Seluruh 59 soal `tryout-figural-2` ber-`explanation` kosong. PDF sumbernya hanya memuat
daftar kunci tanpa rationale, dan gambar tidak bisa dibaca ulang secara andal
(`vision_analyze` timeout; percobaan lewat URL produksi berhasil tetapi kalibrasinya
2/5 — satu gambar menghasilkan 4.000 kata yang berdebat dengan dirinya sendiri).

**Tidak diisi dengan karangan.** Menulis pola dari bacaan 2/5 persis kegagalan yang
sedang diperbaiki di sini.

Temuan tambahan: `fig_tiu_03.png` hanya punya 4 panel opsi padahal mendeklarasikan 5 —
opsi E terpotong.

---

## Metodologi & batasnya

Tiga pendekatan dipakai, dan **dua di antaranya saya buang** karena terbukti tidak
andal:

1. **Lexical similarity (dibuang).** Offset-0 menang telak (0,1976 vs baseline ~0,02),
   jadi tidak ada pergeseran global. Tapi skor lexical tidak bisa dipercaya:
   `tryout-1#7` (nota fiktif ↔ "ASN wajib menolak manipulasi akuntansi") adalah
   kecocokan sempurna dengan skor **0,000**, sementara soal `3^1 * 3^2 * …` vs
   "deret pangkat tiga" juga 0,000. Argmax menandai 2.228 soal; verifikasi manual 5
   kandidat teratas → **1 nyata, 4 palsu**.

2. **Pemeriksaan struktural (dipakai).** Deterministik, tanpa model: pola "kunci
   jawaban saja", peta poin vs bobot opsi, huruf opsi vs skor. Ini yang menghasilkan
   cacat 4, 5, dan 6 — semuanya bisa direproduksi tanpa penilaian selera.

3. **Audit semantik LLM (sebagian).** Dikalibrasi dengan menyuntikkan 6 pertukaran
   pembahasan yang disengaja: **6/6 tertangkap** dengan alasan akurat, sementara data
   bersih dinilai OK — sensitivitas dan presisi terbukti. Namun backend model tidak
   stabil (503 pada 4 model berbeda, lalu timeout), sehingga hanya **1.328 dari 3.898
   soal** yang sempat dinilai: 1.116 OK, 156 BAD, 56 tidak terparse.

**Kesimpulan yang jujur:** cacat 1–3 tuntas dan terverifikasi. Cacat 4–7 terukur
presisi, tetapi audit semantik penuh belum selesai — 2.570 soal belum dibaca model.
Angka 156 BAD itu *lower bound*, bukan total.

---

## Gate

| Gate | Hasil |
|------|-------|
| `tsc --noEmit` | 0 error |
| `vitest` | 708 lulus / 66 file |
| `npm run build` | exit 0 |
| Playwright | 160 / 160 |
| Mutation check (drill) | memaksa `sourcePackage: 'tryout-3'` → 3 test gagal |
| Mutation check (pembahasan) | suntik 2 cacat → 2 test gagal, keduanya tertangkap |

Regression test: `tests/drill-package-ownership.test.ts` (8 kasus),
`tests/pembahasan-quality.test.ts` (4 kasus).
