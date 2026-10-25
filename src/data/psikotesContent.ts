/**
 * Materi penjelas untuk halaman tes psikotes individual.
 *
 * Halaman /psikotes/kraepelin dan /psikotes/kepribadian adalah komponen client
 * yang seluruh logikanya berupa runner, sehingga HTML awalnya hampir tidak
 * berisi teks. Modul ini memasok paragraf yang dirender server lewat
 * `PsikotesGuide`, dengan pola yang sama seperti `drillContent.ts` dan
 * `tryoutSeo.ts`.
 *
 * Aturan isi: setiap angka tentang aplikasi dibaca dari kode, bukan diketik —
 * jumlah butir dari `psikotes_kepribadian.json`, dimensi dari
 * `lib/kepribadian.ts`, mode dari `lib/psikotesModes.ts`, rumus dari
 * `lib/psikotes.ts`. Tidak ada klaim tentang ketentuan instansi, nilai ambang
 * batas, atau norma populasi, karena tidak ada sumbernya di repo ini.
 */
import questions from './psikotes_kepribadian.json';
import { KRAEPELIN_MODES, modeDurationLabel, modePairCount } from '@/lib/psikotesModes';

/** 30 butir — dibaca dari bank soal, bukan diketik. */
export const KEPRIBADIAN_ITEM_COUNT = questions.length;

/**
 * Slot pilihan per dimensi: setiap butir menawarkan dua pernyataan, dan kelima
 * dimensi menerima porsi yang sama (12 dari 60 slot pada data saat ini). Angka
 * dihitung dari bank soal, jadi menambah butir otomatis memperbarui teks.
 */
export const KEPRIBADIAN_DIMENSION_COUNT = new Set(
  questions.flatMap((q) => [q.optionA.dimension, q.optionB.dimension])
).size;
export const KEPRIBADIAN_SLOT_TOTAL = KEPRIBADIAN_ITEM_COUNT * 2;
export const KEPRIBADIAN_DIMENSION_SLOTS = KEPRIBADIAN_SLOT_TOTAL / KEPRIBADIAN_DIMENSION_COUNT;

export interface PsikotesGuideSection {
  heading: string;
  body: string[];
  /** Poin pendek; dipakai bagian "Kesalahan umum". */
  bullets?: string[];
}

export interface PsikotesFaqItem {
  q: string;
  a: string;
}

export interface PsikotesRelatedLink {
  href: string;
  label: string;
  note: string;
}

export interface PsikotesGuideContent {
  /** Paragraf pembuka, dirender tepat setelah judul bagian. */
  lead: string;
  sections: PsikotesGuideSection[];
  related: PsikotesRelatedLink[];
  faq: PsikotesFaqItem[];
}

export const KEPRIBADIAN_GUIDE: PsikotesGuideContent = {
  lead:
    'Bagian ini menjelaskan apa yang sebenarnya diukur oleh asesmen 30 butir di atas, bagaimana jawaban Anda diolah, dan bagaimana membaca hasilnya — supaya Anda tidak mengerjakan tes kepribadian seperti tes hafalan.',
  sections: [
    {
      heading: 'Apa yang diukur asesmen ini',
      body: [
        `Asesmen ini berisi ${KEPRIBADIAN_ITEM_COUNT} butir pilihan terpaksa. Setiap butir menampilkan dua pernyataan tentang cara kerja, dan Anda harus memilih satu yang lebih menggambarkan diri Anda. Tidak ada opsi netral dan tidak ada butir yang boleh dikosongkan. Format seperti ini memaksa Anda memprioritaskan satu kecenderungan di atas kecenderungan lain, dan pola prioritas itulah yang dibaca oleh penilaian.`,
        `Dari ${KEPRIBADIAN_SLOT_TOTAL} pernyataan yang tersedia — dua pada setiap butir — ${KEPRIBADIAN_DIMENSION_COUNT} dimensi muncul bergantian: Kepemimpinan & Inisiatif, Daya Juang & Prestasi, Ketelitian & Keteraturan, Kerja Sama & Relasi Sosial, serta Kepatuhan & Integritas Regulasi. Masing-masing menempati ${KEPRIBADIAN_DIMENSION_SLOTS} dari ${KEPRIBADIAN_SLOT_TOTAL} slot pilihan, jadi tidak ada dimensi yang lebih mudah menonjol karena lebih sering ditawarkan.`,
        'Yang diukur adalah kecenderungan yang Anda laporkan sendiri, bukan kemampuan yang dinilai penguji. Halaman ini menyebut dirinya latihan karena butirnya disusun khusus untuk platform ini: instrumen ini bukan reproduksi instrumen PAPI Kostick resmi dan tidak memakai norma populasi mana pun. Tidak ada skor baku, tidak ada nilai ambang batas, dan tidak ada keputusan seleksi yang diambil dari hasil di sini.',
      ],
    },
    {
      heading: 'Cara pengerjaan',
      body: [
        'Satu layar menampilkan satu butir dengan dua kartu, A dan B. Setelah Anda menekan salah satu kartu, jawaban langsung tersimpan dan layar bergeser ke butir berikutnya sekitar 150 milidetik kemudian, sehingga Anda tidak perlu menekan tombol lanjut pada setiap butir.',
        'Tombol Sebelumnya membawa Anda kembali ke butir sebelumnya dengan pilihan lama masih terlihat, dan Anda bisa memilih ulang. Tombol itu nonaktif di butir pertama. Di bagian atas layar ada penghitung butir ke berapa yang sedang dibuka serta berapa butir yang sudah terisi, jadi Anda selalu tahu posisi Anda tanpa harus menghitung sendiri.',
        `Tidak ada timer di asesmen ini. Estimasi lima sampai sepuluh menit pada kartu pembuka hanyalah perkiraan, bukan batas waktu yang ditegakkan aplikasi. Tombol untuk melihat analisis profil baru aktif setelah seluruh ${KEPRIBADIAN_ITEM_COUNT} butir terisi, sehingga tidak ada hasil yang dihitung dari jawaban setengah jadi.`,
      ],
    },
    {
      heading: 'Cara penilaian',
      body: [
        `Setiap pilihan menambah satu poin ke dimensi yang tertulis pada pernyataan yang Anda pilih. Karena satu butir hanya menerima satu pilihan, total poin yang dibagikan selalu ${KEPRIBADIAN_ITEM_COUNT} — satu poin per butir — sementara kapasitas tiap dimensi adalah ${KEPRIBADIAN_DIMENSION_SLOTS}.`,
        'Persentase per dimensi dihitung dari poin yang Anda kumpulkan dibagi kapasitas dimensi itu, lalu dibulatkan ke bilangan bulat. Dimensi dengan persentase tertinggi dan kedua tertinggi ditampilkan sebagai karakteristik dominan, disertai satu ringkasan dan dua rekomendasi: satu untuk mempertahankan dimensi teratas, satu untuk melatih dimensi terendah.',
        `Karena total poin hanya ${KEPRIBADIAN_ITEM_COUNT} dari ${KEPRIBADIAN_SLOT_TOTAL} slot, persentase kelima dimensi tidak akan berjumlah 100%. Angka 100% pada satu dimensi berarti seluruh butir yang memuat dimensi tersebut Anda jawab ke arah dimensi itu — bukan nilai kelulusan, bukan peringkat, dan bukan perbandingan dengan peserta lain.`,
      ],
    },
    {
      heading: 'Kesalahan umum',
      body: [
        'Kesalahan yang paling sering terjadi bukan pada jawabannya, melainkan pada cara membaca hasilnya. Beberapa hal yang perlu dihindari:',
      ],
      bullets: [
        'Memilih pernyataan yang terdengar paling ideal, bukan yang paling Anda lakukan sehari-hari. Profil yang terbentuk jadi datar dan tidak memberi informasi apa pun.',
        'Terlalu lama menimbang setiap butir. Pada pilihan terpaksa tidak ada jawaban yang lebih benar, jadi menunda keputusan hanya menambah waktu tanpa menambah akurasi.',
        'Menganggap persentase sebagai nilai kelulusan. Halaman hasil tidak menetapkan ambang batas apa pun.',
        'Mengulang asesmen berkali-kali sampai profil tertentu muncul. Hasilnya berhenti menggambarkan kecenderungan Anda dan hanya menggambarkan pilihan yang Anda kejar.',
        `Berhenti di tengah karena merasa ada butir yang tidak relevan. Tombol analisis terkunci sampai ${KEPRIBADIAN_ITEM_COUNT} butir terisi, dan satu butir yang dilewati tidak bisa diganti dengan tebakan di akhir.`,
      ],
    },
  ],
  related: [
    {
      href: '/psikotes/kecermatan-angka',
      label: 'Kecermatan Angka Hilang',
      note: 'Melatih sisi ketelitian yang tidak terlihat dari kuesioner kepribadian.',
    },
    {
      href: '/psikotes/kecermatan-huruf',
      label: 'Kecermatan Huruf Hilang',
      note: 'Varian huruf dengan beban fokus visual yang berbeda.',
    },
    {
      href: '/simulasi',
      label: 'Simulasi CAT',
      note: 'Uji TWK, TIU, dan TKP dengan timer serta skor otomatis.',
    },
    {
      href: '/drill',
      label: 'Latihan Kilat',
      note: 'Soal pendek per subtopik untuk mengisi waktu di sela latihan.',
    },
  ],
  faq: [
    {
      q: 'Apakah asesmen ini sama dengan PAPI Kostick resmi?',
      a: `Tidak. Butirnya ditulis khusus untuk platform ini, berjumlah ${KEPRIBADIAN_ITEM_COUNT} pasang, dan hanya memetakan ${KEPRIBADIAN_DIMENSION_COUNT} dimensi. Instrumen PAPI Kostick resmi memakai jumlah butir dan dimensi yang berbeda, dan aplikasi ini tidak mengklaim menggantikannya.`,
    },
    {
      q: 'Apakah ada jawaban benar dan salah?',
      a: 'Tidak ada. Kedua pernyataan dalam satu butir sama-sama sah; Anda hanya memilih mana yang lebih menggambarkan kecenderungan kerja Anda. Yang dinilai adalah pola pilihan, bukan kecocokan dengan kunci jawaban.',
    },
    {
      q: 'Berapa lama pengerjaannya?',
      a: `${KEPRIBADIAN_ITEM_COUNT} butir tanpa timer. Estimasi lima sampai sepuluh menit di kartu pembuka hanya perkiraan, bukan batas waktu. Anda bebas mengambil waktu yang Anda butuhkan, meskipun menjawab spontan biasanya menghasilkan pola yang lebih konsisten.`,
    },
    {
      q: 'Mengapa persentase saya tidak berjumlah 100%?',
      a: `Karena setiap butir menyumbang satu poin ke satu dimensi saja, total poin selalu ${KEPRIBADIAN_ITEM_COUNT}, sedangkan kapasitas tiap dimensi ${KEPRIBADIAN_DIMENSION_SLOTS}. Persentase dihitung per dimensi terhadap kapasitas dimensi itu sendiri, bukan terhadap total jawaban.`,
    },
    {
      q: 'Bisakah saya mengubah jawaban sebelumnya?',
      a: 'Bisa. Tombol Sebelumnya mengembalikan Anda ke butir sebelumnya dengan pilihan lama masih tersimpan, dan Anda dapat memilih ulang sebelum menekan tombol analisis.',
    },
    {
      q: 'Di mana hasil saya disimpan?',
      a: 'Hasil dihitung di peramban lalu disimpan ke penyimpanan lokal perangkat, terpisah per akun, dan dibaca kembali oleh halaman hasil. Aplikasi tidak mengirim jawaban Anda ke server saat tombol analisis ditekan.',
    },
  ],
};

export const KRAEPELIN_GUIDE: PsikotesGuideContent = {
  lead:
    'Bagian ini menjelaskan aturan penjumlahan yang dipakai, cara kolom bergerak, dan cara empat angka pada halaman hasil dihitung — supaya Anda berlatih dengan target yang jelas, bukan sekadar mengejar kecepatan.',
  sections: [
    {
      heading: 'Apa yang diukur tes ini',
      body: [
        'Tugasnya sederhana: dua angka yang berdekatan dijumlahkan, lalu Anda menuliskan satuan dari hasilnya. Kalau 8 + 7 = 15, yang dimasukkan adalah 5. Karena setiap angka hanya satu digit, hasilnya selalu 0 sampai 18 dan jawaban yang diminta selalu satu digit.',
        'Dari tugas sesederhana itu aplikasi mengukur empat hal: akurasi (berapa jawaban benar), kecepatan (jawaban per menit), stabilitas (seberapa rata kecepatan antar kolom), dan tren (apakah kecepatan naik atau turun di paruh akhir sesi).',
        'Keempatnya dipisahkan dengan sengaja: menambah kecepatan tanpa menjaga akurasi hanya memindahkan masalah, dan kecepatan tinggi di dua kolom pertama yang lalu anjlok tetap terbaca sebagai performa tidak stabil.',
        `Tersedia tiga mode. ${KRAEPELIN_MODES.kilat.label}: ${KRAEPELIN_MODES.kilat.columns} kolom, ${KRAEPELIN_MODES.kilat.durationPerCol} detik per kolom, ${KRAEPELIN_MODES.kilat.numbersPerCol} angka per kolom — total ${modeDurationLabel('kilat')}. ${KRAEPELIN_MODES.standar.label}: ${KRAEPELIN_MODES.standar.columns} kolom, ${KRAEPELIN_MODES.standar.durationPerCol} detik per kolom, ${KRAEPELIN_MODES.standar.numbersPerCol} angka per kolom — ${modeDurationLabel('standar')}. ${KRAEPELIN_MODES.simulasi.label}: ${KRAEPELIN_MODES.simulasi.columns} kolom, ${KRAEPELIN_MODES.simulasi.durationPerCol} detik per kolom, ${KRAEPELIN_MODES.simulasi.numbersPerCol} angka per kolom — ${modeDurationLabel('simulasi')}, dan mode inilah yang paling berguna untuk membaca tren daya tahan.`,
      ],
    },
    {
      heading: 'Cara pengerjaan',
      body: [
        'Setelah Anda memilih mode dan menekan tombol mulai, aplikasi menghitung mundur tiga detik lalu membuka kolom pertama. Angka tampil sebagai satu lajur vertikal; pasangan aktif disorot dan lajur menggulir otomatis mengikutinya, jadi Anda tidak perlu menggeser layar.',
        `Anda menjawab lewat tombol angka di layar atau tombol angka pada keyboard fisik. Setiap jawaban menggeser penanda satu angka ke bawah, jadi kolom ${KRAEPELIN_MODES.kilat.numbersPerCol} angka menghasilkan paling banyak ${modePairCount('kilat')} pasangan, kolom ${KRAEPELIN_MODES.standar.numbersPerCol} angka menghasilkan ${modePairCount('standar')}, dan kolom ${KRAEPELIN_MODES.simulasi.numbersPerCol} angka menghasilkan ${modePairCount('simulasi')}. Setelah jawaban masuk, bingkai pasangan berkedip hijau atau merah sekitar 250 milidetik sebagai umpan balik.`,
        'Timer berjalan per kolom, bukan untuk seluruh sesi. Bilah waktu memendek sesuai sisa detik dan berubah warna ketika sisanya tinggal 30 persen. Saat waktu habis, aplikasi otomatis pindah ke kolom berikutnya dan penanda kembali ke pasangan paling atas. Jawaban yang sudah masuk tidak bisa direvisi, dan tidak ada tombol kembali ke kolom sebelumnya.',
      ],
    },
    {
      heading: 'Cara penilaian',
      body: [
        'Jawaban benar dihitung dari sisa bagi sepuluh atas jumlah dua angka, lalu dibandingkan dengan digit yang Anda tekan. Akurasi total adalah jawaban benar dibagi jawaban yang Anda kirim, dikali seratus, dibulatkan ke bilangan bulat.',
        `Kecepatan dihitung per kolom: jumlah jawaban dibagi durasi kolom dalam menit. Kolom ${KRAEPELIN_MODES.standar.durationPerCol} detik berarti pembaginya setengah menit, sehingga enam jawaban terbaca sebagai dua belas soal per menit. Angka di halaman hasil adalah rata-rata seluruh kolom, dibulatkan dua angka desimal.`,
        'Stabilitas adalah simpangan baku populasi dari kecepatan antar kolom — makin kecil, makin rata. Kolom yang Anda lewati sepenuhnya tetap dihitung dengan kecepatan nol, sehingga satu kolom kosong menarik rata-rata dan simpangan sekaligus.',
        'Tren daya tahan membandingkan rata-rata paruh kedua dengan paruh pertama. Selisih lebih dari lima persen dari rata-rata keseluruhan disebut meningkat atau menurun; di luar itu disebut stabil. Halaman hasil menampilkan keempat angka ini beserta grafik per kolom. Yang tidak ada di sana: skor IQ, nilai ambang batas, peringkat, dan perbandingan dengan peserta lain.',
      ],
    },
    {
      heading: 'Kesalahan umum',
      body: [
        'Sebagian besar latihan yang gagal bukan karena hitungannya salah, melainkan karena ritmenya tidak dijaga. Beberapa hal yang paling sering merugikan:',
      ],
      bullets: [
        'Mengejar kecepatan sampai salah hitung. Akurasi dan kecepatan dilaporkan terpisah, jadi kecepatan tinggi dengan akurasi rendah tidak terbaca sebagai kemajuan.',
        'Berhenti menjawab saat bilah waktu berubah merah. Kolom yang tidak dijawab sama sekali tercatat nol dan langsung menurunkan rata-rata kecepatan serta stabilitas.',
        'Menghitung penuh lalu memotong digit di kepala. Biasakan langsung menyebut satuan hasilnya; kebiasaan ini yang menjaga ritme di kolom terakhir.',
        `Hanya memakai mode terpendek. Tren daya tahan baru terbaca pada sesi yang cukup panjang, jadi sesekali pakai mode ${KRAEPELIN_MODES.simulasi.columns} kolom.`,
        'Mengabaikan keyboard fisik. Tombol angka pada keyboard lebih cepat dijangkau tanpa memindahkan pandangan dari deret angka.',
        'Menganggap arah baca di aplikasi sama dengan lembar kertas. Pasangan aktif selalu angka yang disorot dan angka tepat di bawahnya, lalu penanda bergerak ke bawah.',
      ],
    },
  ],
  related: [
    {
      href: '/psikotes/kecermatan-angka',
      label: 'Kecermatan Angka Hilang',
      note: 'Ketelitian visual pada angka, tanpa beban berhitung.',
    },
    {
      href: '/psikotes/kecermatan-huruf',
      label: 'Kecermatan Huruf Hilang',
      note: 'Latihan fokus yang sama dengan materi huruf.',
    },
    {
      href: '/simulasi',
      label: 'Simulasi CAT',
      note: 'Latihan TWK, TIU, dan TKP dengan timer dan skor otomatis.',
    },
    {
      href: '/drill',
      label: 'Latihan Kilat',
      note: 'Soal pendek per subtopik bila waktu latihan Anda terbatas.',
    },
  ],
  faq: [
    {
      q: 'Apakah ini tes Kraepelin yang dipakai pada seleksi resmi?',
      a: 'Bukan. Ini latihan dengan deret angka acak yang dibuat di peramban setiap sesi. Panjang kolom, jumlah kolom, dan durasinya mengikuti mode yang Anda pilih di aplikasi ini, bukan ketentuan instansi mana pun.',
    },
    {
      q: 'Berapa lama satu sesi berlangsung?',
      a: `Tergantung mode: ${KRAEPELIN_MODES.kilat.label} ${KRAEPELIN_MODES.kilat.columns} kolom kali ${KRAEPELIN_MODES.kilat.durationPerCol} detik atau ${modeDurationLabel('kilat')}, ${KRAEPELIN_MODES.standar.label} ${KRAEPELIN_MODES.standar.columns} kolom kali ${KRAEPELIN_MODES.standar.durationPerCol} detik atau ${modeDurationLabel('standar')}, dan ${KRAEPELIN_MODES.simulasi.label} ${KRAEPELIN_MODES.simulasi.columns} kolom kali ${KRAEPELIN_MODES.simulasi.durationPerCol} detik atau ${modeDurationLabel('simulasi')}. Semuanya ditambah hitungan mundur tiga detik sebelum kolom pertama.`,
    },
    {
      q: 'Mengapa jawabannya hanya satu digit?',
      a: 'Karena yang diminta adalah satuan dari hasil penjumlahan. Contoh 8 + 7 = 15, jawabannya 5. Aplikasi mengambil sisa bagi sepuluh dari jumlah kedua angka, jadi pasangan yang berjumlah 10 atau lebih tetap dijawab dengan satu digit.',
    },
    {
      q: 'Apakah jawaban salah mengurangi skor?',
      a: 'Tidak ada pengurangan poin. Semua jawaban dihitung, lalu akurasi dihitung dari proporsi jawaban yang benar. Menebak tetap menambah jumlah jawaban, tetapi setiap tebakan yang salah menurunkan akurasi.',
    },
    {
      q: 'Apakah angkanya sama setiap kali saya mengulang?',
      a: 'Tidak. Setiap kolom dibangkitkan acak saat sesi dimulai, jadi tidak ada deret yang bisa dihafalkan dan hasil antar sesi tidak bisa dibandingkan dengan menghafal posisi.',
    },
    {
      q: 'Bisakah saya kembali ke kolom sebelumnya?',
      a: 'Tidak. Saat waktu kolom habis, aplikasi otomatis pindah ke kolom berikutnya dan penanda kembali ke pasangan paling atas. Jawaban yang sudah masuk tidak bisa direvisi.',
    },
  ],
};
