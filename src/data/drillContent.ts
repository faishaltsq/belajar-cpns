export interface DrillContent {
  /** Judul H1 halaman. */
  heading: string;
  /** Ringkasan 2–3 kalimat, unik per subtopik. */
  intro: string;
  sections: { heading: string; body: string[] }[];
  tips: string[];
}

/**
 * Konten materi per subtopik drill. Dipakai untuk memberi halaman
 * /drill/[category]/[subCategory] isi yang benar-benar berbeda satu sama lain —
 * sebelumnya 18 halaman hanya berisi shell client-side tanpa teks apa pun.
 */
export const DRILL_CONTENT: Record<string, DrillContent> = {
  // ───────────────────────────── TWK ─────────────────────────────
  Pancasila: {
    heading: 'Latihan Soal Pancasila CPNS: Pilar Negara dan Sejarah Perumusannya',
    intro:
      'Pancasila adalah dasar negara sekaligus sumber hukum tertinggi di Indonesia. Soal TWK bertema Pancasila hampir selalu hadir di setiap paket SKD, dan biasanya menguji tiga hal: urutan serta makna sila, sejarah perumusan, dan penerapan nilai dalam kehidupan ASN.',
    sections: [
      {
        heading: 'Makna lima sila',
        body: [
          'Sila pertama, Ketuhanan Yang Maha Esa, menempatkan Indonesia sebagai negara beragama yang menjamin kebebasan beribadah menurut agamanya masing-masing. Sila kedua, Kemanusiaan yang Adil dan Beradab, menegaskan penghormatan atas harkat dan martabat manusia tanpa membedakan latar belakang.',
          'Sila ketiga, Persatuan Indonesia, menempatkan kepentingan bangsa di atas kepentingan golongan. Sila keempat, Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan, menjadi dasar sistem demokrasi musyawarah. Sila kelima, Keadilan Sosial bagi Seluruh Rakyat Indonesia, menuntut pemerataan hasil pembangunan.',
        ],
      },
      {
        heading: 'Sejarah perumusan yang sering keluar di ujian',
        body: [
          'BPUPKI dibentuk 29 April 1945 dan bersidang pertama kali 29 Mei sampai 1 Juni 1945. Pada 1 Juni 1945 Soekarno menyampaikan pidato dasar negara yang kemudian dikenal sebagai hari lahir Pancasila. Piagam Jakarta disepakati 22 Juni 1945 oleh Panitia Sembilan, dan rumusan final disahkan bersama UUD 1945 pada 18 Agustus 1945 oleh PPKI.',
          'Perubahan penting terjadi pada sila pertama: rumusan Piagam Jakarta memuat tujuh kata yang kemudian dihapus demi menjaga persatuan, sehingga menjadi "Ketuhanan Yang Maha Esa".',
        ],
      },
      {
        heading: 'Fungsi Pancasila',
        body: [
          'Pancasila berkedudukan sebagai dasar negara, pandangan hidup bangsa, ideologi nasional, kepribadian bangsa, dan sumber dari segala sumber hukum. Dalam praktik ASN, nilai Pancasila diterjemahkan menjadi sikap toleran, adil dalam pelayanan, dan mengutamakan kepentingan publik di atas kepentingan pribadi.',
        ],
      },
    ],
    tips: [
      'Hafalkan urutan sila beserta lambangnya. Soal urutan terbalik sering dipakai sebagai jebakan.',
      'Bedakan tanggal: 1 Juni = pidato Soekarno, 22 Juni = Piagam Jakarta, 18 Agustus = pengesahan.',
      'Kalau soal menanyakan "sumber hukum tertinggi", jawabannya Pancasila, bukan UUD 1945.',
      'Soal penerapan nilai biasanya meminta sikap paling mengutamakan kepentingan umum.',
    ],
  },

  'UUD 1945': {
    heading: 'Latihan Soal UUD 1945 CPNS: Pasal Kunci, Amandemen, dan Lembaga Negara',
    intro:
      'UUD 1945 adalah hukum dasar tertulis yang mengatur penyelenggaraan negara. Materi ini menuntut hafalan pasal tertentu sekaligus pemahaman struktur ketatanegaraan setelah empat kali amandemen.',
    sections: [
      {
        heading: 'Pembukaan dan empat alinea',
        body: [
          'Alinea pertama memuat pernyataan kemerdekaan. Alinea kedua memuat cita-cita negara yang merdeka, bersatu, berdaulat, adil, dan makmur. Alinea ketiga memuat pernyataan bahwa kemerdekaan adalah rahmat Tuhan dan hasil perjuangan bangsa. Alinea keempat memuat tujuan negara, dasar negara, dan rumusan Pembukaan UUD 1945.',
          'Pembukaan tidak dapat diubah oleh MPR karena merupakan bagian yang menyatu dengan proklamasi kemerdekaan.',
        ],
      },
      {
        heading: 'Pasal yang paling sering diuji',
        body: [
          'Pasal 1 ayat 1 menegaskan bentuk negara kesatuan republik. Pasal 1 ayat 2 menempatkan kedaulatan di tangan rakyat. Pasal 1 ayat 3 menyatakan Indonesia adalah negara hukum. Pasal 27 ayat 3 mengatur hak dan kewajiban bela negara. Pasal 28 menjamin hak asasi manusia. Pasal 30 mengatur pertahanan dan keamanan. Pasal 31 mengatur hak atas pendidikan.',
        ],
      },
      {
        heading: 'Amandemen dan lembaga negara',
        body: [
          'UUD 1945 diamandemen empat kali: 1999, 2000, 2001, dan 2002. Perubahan besar mencakup pembatasan masa jabatan presiden dua periode, pemilihan presiden langsung, pembentukan MK dan KY, serta penguatan DPD.',
          'Lembaga negara utama meliputi MPR, DPR, DPD, Presiden, MA, MK, KY, BPK, dan lembaga independen lain seperti KPK, KPU, dan Bank Indonesia.',
        ],
      },
    ],
    tips: [
      'Hafalkan pasal 1, 27, 28, 30, 31, 33, dan 37 — ini yang paling sering muncul.',
      'Ingat urutan amandemen: 1999, 2000, 2001, 2002. Soal sering menanyakan amandemen keempat.',
      'Bedakan tugas MA (peradilan) dengan MK (uji undang-undang terhadap UUD).',
      'Masa jabatan presiden: 5 tahun, maksimal dua periode — diatur Pasal 7.',
    ],
  },

  'Bela Negara': {
    heading: 'Latihan Soal Bela Negara CPNS: Dasar Hukum dan Wujud Pengabdian',
    intro:
      'Bela negara adalah hak sekaligus kewajiban setiap warga negara. Soal TWK biasanya menguji dasar hukum, bentuk penyelenggaraan, dan perbedaan ancaman militer dengan nonmiliter.',
    sections: [
      {
        heading: 'Dasar hukum',
        body: [
          'Pasal 27 ayat 3 UUD 1945 menyatakan bahwa setiap warga negara berhak dan wajib ikut serta dalam upaya pembelaan negara. Pasal 30 ayat 1 menegaskan hak dan kewajiban warga negara dalam usaha pertahanan dan keamanan negara.',
          'UU Nomor 3 Tahun 2002 tentang Pertahanan Negara mengatur penyelenggaraan pertahanan negara, termasuk sistem pertahanan semesta yang melibatkan seluruh rakyat.',
        ],
      },
      {
        heading: 'Wujud bela negara',
        body: [
          'Bela negara tidak selalu berarti angkat senjata. Bentuknya mencakup pendidikan kewarganegaraan, pengabdian sebagai prajurit, pengabdian sesuai profesi, serta pengabdian sukarela dalam upaya pertahanan negara.',
          'Bagi ASN, bela negara diwujudkan melalui disiplin kerja, menjaga kerahasiaan negara, menolak korupsi, dan memberikan pelayanan terbaik kepada masyarakat.',
        ],
      },
      {
        heading: 'Ancaman militer dan nonmiliter',
        body: [
          'Ancaman militer meliputi agresi, pelanggaran wilayah, spionase, sabotase, terorisme bersenjata, dan pemberontakan. Ancaman nonmiliter meliputi ideologi, politik, ekonomi, sosial budaya, teknologi informasi, dan keselamatan umum.',
          'TNI menghadapi ancaman militer, sementara Polri menangani keamanan dan ketertiban. Ancaman nonmiliter ditangani lintas kementerian dan lembaga sesuai bidangnya.',
        ],
      },
    ],
    tips: [
      'Ingat pasal 27 ayat 3 dan pasal 30 — keduanya sering muncul bersamaan.',
      'UU 3/2002 adalah rujukan utama pertahanan negara; jangan tertukar dengan UU TNI.',
      'Soal ancaman: jika menyebut ideologi atau ekonomi, itu nonmiliter.',
      'Wujud bela negara paling luas jawabannya adalah "pendidikan kewarganegaraan".',
    ],
  },

  Nasionalisme: {
    heading: 'Latihan Soal Nasionalisme CPNS: Sumpah Pemuda, Bhinneka Tunggal Ika, dan Wawasan Nusantara',
    intro:
      'Nasionalisme menguji kesadaran berbangsa dan bernegara. Materi ini beririsan dengan sejarah pergerakan nasional, semboyan negara, dan konsep wawasan nusantara.',
    sections: [
      {
        heading: 'Sumpah Pemuda 28 Oktober 1928',
        body: [
          'Kongres Pemuda II menghasilkan tiga ikrar: bertumpah darah yang satu, tanah air Indonesia; berbangsa yang satu, bangsa Indonesia; dan menjunjung bahasa persatuan, bahasa Indonesia.',
          'Peristiwa ini menjadi titik balik pergerakan dari kedaerahan menuju persatuan nasional, dan tanggalnya diperingati sebagai Hari Sumpah Pemuda.',
        ],
      },
      {
        heading: 'Bhinneka Tunggal Ika',
        body: [
          'Semboyan ini berasal dari kitab Sutasoma karya Mpu Tantular pada masa Majapahit. Maknanya berbeda-beda tetapi tetap satu, menegaskan bahwa keberagaman suku, agama, dan budaya tidak menghapus identitas bangsa.',
          'Semboyan ini menjadi bagian dari lambang negara Garuda Pancasila dan tercantum dalam Pasal 36A UUD 1945.',
        ],
      },
      {
        heading: 'Wawasan nusantara',
        body: [
          'Wawasan nusantara adalah cara pandang bangsa Indonesia terhadap diri dan lingkungannya sebagai negara kepulauan yang utuh. Konsep ini menempatkan wilayah darat, laut, dan udara sebagai satu kesatuan politik, ekonomi, sosial budaya, serta pertahanan keamanan.',
          'Deklarasi Djuanda 1957 menjadi dasar lahirnya konsep negara kepulauan yang kemudian diakui dalam Konvensi Hukum Laut PBB 1982. Sejak itu Indonesia diakui sebagai negara kepulauan yang mengatur laut teritorial dan zona ekonomi eksklusifnya sendiri.',
        ],
      },
      {
        heading: 'Nasionalisme dalam praktik ASN',
        body: [
          'Nasionalisme bukan sekadar sikap, melainkan perilaku yang bisa diamati. Wujudnya antara lain menggunakan produk dalam negeri, menjaga fasilitas publik, membayar pajak tepat waktu, serta menolak segala bentuk provokasi yang memecah persatuan.',
          'Di lingkungan kerja, nasionalisme tampak dari kesediaan ditempatkan di daerah terpencil, penggunaan bahasa Indonesia yang baik dalam pelayanan, dan sikap adil terhadap masyarakat dari latar belakang apa pun.',
        ],
      },
    ],
    tips: [
      'Hafalkan tiga ikrar Sumpah Pemuda secara berurutan — soal urutan sering muncul.',
      'Sutasoma dan Mpu Tantular adalah pasangan yang wajib diingat untuk Bhinneka Tunggal Ika.',
      'Pasal 36A mengatur lambang negara, bukan Pasal 35 (bendera) atau 36 (lagu).',
      'Deklarasi Djuanda 1957 = lahirnya konsep negara kepulauan.',
    ],
  },

  Integritas: {
    heading: 'Latihan Soal Integritas ASN CPNS: Nilai Dasar, Korupsi, dan Gratifikasi',
    intro:
      'Integritas adalah inti dari nilai dasar ASN. Soal TKP bertema integritas menguji respons terhadap konflik kepentingan, gratifikasi, dan tekanan tidak etis di tempat kerja.',
    sections: [
      {
        heading: 'Nilai dasar ASN',
        body: [
          'UU Nomor 5 Tahun 2014 tentang ASN menetapkan nilai dasar yang mencakup integritas, profesionalisme, netralitas, akuntabilitas, dan pelayanan publik. Nilai-nilai ini kemudian dijabarkan dalam kode etik dan kode perilaku ASN.',
          'Integritas berarti konsisten antara ucapan, pikiran, dan perbuatan, serta menolak segala bentuk penyimpangan termasuk korupsi, kolusi, dan nepotisme.',
        ],
      },
      {
        heading: 'Gratifikasi dan konflik kepentingan',
        body: [
          'Gratifikasi adalah pemberian dalam arti luas, meliputi uang, barang, diskon, pinjaman, tiket perjalanan, dan fasilitas lain yang diberikan karena hubungan jabatan. ASN wajib melaporkan gratifikasi kepada KPK dalam 30 hari kerja sejak diterima.',
          'Konflik kepentingan terjadi ketika kepentingan pribadi memengaruhi keputusan jabatan. Penanganannya melalui deklarasi, rekusal, atau pengalihan tugas.',
        ],
      },
      {
        heading: 'Respons yang dinilai tinggi di TKP',
        body: [
          'Jawaban bernilai 5 biasanya menunjukkan sikap proaktif: menolak dengan sopan disertai alasan, melaporkan ke atasan atau saluran resmi, dan tetap menjaga hubungan kerja yang profesional. Jawaban bernilai rendah biasanya pasif, ikut arus, atau menunda tanpa alasan.',
        ],
      },
    ],
    tips: [
      'Ingat batas waktu pelaporan gratifikasi: 30 hari kerja.',
      'UU 5/2014 adalah rujukan nilai dasar ASN, bukan UU KPK.',
      'Di TKP, pilih jawaban yang menolak secara sopan dan melaporkan lewat jalur resmi.',
      'Hindari jawaban yang membiarkan pelanggaran terjadi demi menjaga perasaan orang lain.',
    ],
  },

  'Bahasa Indonesia': {
    heading: 'Latihan Soal Bahasa Indonesia CPNS: Kata Baku, Ejaan, dan Kalimat Efektif',
    intro:
      'Materi Bahasa Indonesia di TWK menguji ketelitian terhadap kaidah. Soal biasanya meminta identifikasi kata baku, kesalahan ejaan, atau perbaikan kalimat tidak efektif.',
    sections: [
      {
        heading: 'Kata baku yang sering keliru',
        body: [
          'Bentuk baku yang benar antara lain: apotek (bukan apotik), analisis (analisa), praktik (praktek), objek (obyek), subjek (subyek), izin (ijin), silakan (silahkan), dan nomor (nomer).',
          'Kata baku mengikuti KBBI dan tidak berubah meski pengucapan sehari-hari berbeda. Soal biasanya menyajikan dua bentuk dan meminta memilih yang baku.',
        ],
      },
      {
        heading: 'Ejaan dan tanda baca',
        body: [
          'Ejaan Bahasa Indonesia diatur dalam EYD Edisi V yang menggantikan PUEBI pada 2022. Beberapa perubahan penting: penggunaan tanda titik dua, penulisan unsur serapan, dan penyesuaian gabungan kata.',
          'Kata depan seperti di dan ke ditulis terpisah dari kata yang mengikutinya bila menunjukkan tempat, tetapi digabung bila berfungsi sebagai awalan pembentuk kata kerja.',
        ],
      },
      {
        heading: 'Kalimat efektif',
        body: [
          'Kalimat efektif memenuhi syarat kesepadanan struktur, keparalelan bentuk, ketegasan makna, kehematan kata, kecermatan penalaran, dan kelogisan. Ciri kalimat tidak efektif adalah pemborosan kata, subjek ganda, atau kesejajaran yang rusak.',
          'Contoh perbaikan: "Para hadirin sekalian dipersilakan duduk" menjadi "Hadirin dipersilakan duduk" karena kata para dan sekalian sudah melekat pada hadirin.',
        ],
      },
    ],
    tips: [
      'Hafalkan pasangan baku yang paling sering diuji: analisis, apotek, praktik, objek, subjek, izin.',
      'Cek kesejajaran bentuk saat menemukan deret kata dengan "dan" atau "atau".',
      'Waspadai pemborosan: para hadirin, sangat amat, agar supaya, demi untuk.',
      'Bila ragu, pilih kalimat terpendek yang maknanya tetap utuh.',
    ],
  },

  // ───────────────────────────── TIU ─────────────────────────────
  Analogi: {
    heading: 'Latihan Soal Analogi Verbal CPNS: Jenis Hubungan Kata dan Cara Memetakannya',
    intro:
      'Analogi menguji kemampuan menemukan hubungan logis antara dua kata, lalu menerapkan hubungan yang sama pada pasangan lain. Kuncinya bukan menghafal kosakata, melainkan mengklasifikasikan jenis hubungan lebih dulu.',
    sections: [
      {
        heading: 'Jenis hubungan yang paling sering muncul',
        body: [
          'Sinonim: kata bersinonim, misalnya pintar dan cerdas. Antonim: berlawanan makna, misalnya tinggi dan rendah. Sebab-akibat: satu kata menimbulkan yang lain, misalnya hujan dan banjir.',
          'Hubungan bagian-keseluruhan: roda terhadap mobil. Hubungan fungsi: pisau terhadap memotong. Hubungan profesi-tugas: guru terhadap mengajar. Hubungan alat-hasil: kuas terhadap lukisan.',
        ],
      },
      {
        heading: 'Cara memetakan dengan cepat',
        body: [
          'Langkah pertama, baca pasangan soal dan tentukan jenis hubungannya dalam satu kalimat pendek, misalnya "roda adalah bagian dari mobil". Langkah kedua, uji setiap pilihan dengan kalimat yang sama. Pilihan yang membuat kalimat itu masuk akal adalah jawabannya.',
          'Jika lebih dari satu pilihan cocok, periksa tingkat kekhususan hubungan. Hubungan yang lebih spesifik biasanya menjadi jawaban yang benar.',
        ],
      },
      {
        heading: 'Jebakan umum',
        body: [
          'Pilihan yang mirip maknanya dengan kata soal sering dipasang sebagai pengalih. Pastikan hubungan antarkata tetap sejenis, bukan hanya mirip bunyi atau tema.',
          'Waspadai juga pasangan yang hubungannya terbalik arah, misalnya soal berpola sebab-akibat tetapi pilihan berpola akibat-sebab.',
        ],
      },
    ],
    tips: [
      'Selalu ubah pasangan soal menjadi satu kalimat sebelum melihat pilihan.',
      'Kalau dua pilihan terasa benar, pilih hubungan yang lebih spesifik.',
      'Catat jenis hubungan yang paling sering kamu salah, biasanya sebab-akibat dan fungsi.',
      'Jangan terpaku pada makna kata; fokus pada hubungannya.',
    ],
  },

  Silogisme: {
    heading: 'Latihan Soal Silogisme CPNS: Premis, Kuantor, dan Penarikan Kesimpulan',
    intro:
      'Silogisme menguji kemampuan menarik kesimpulan yang sah dari dua premis. Hampir semua soal dapat diselesaikan dengan aturan baku tanpa perlu memahami isi kalimatnya.',
    sections: [
      {
        heading: 'Struktur dasar',
        body: [
          'Silogisme terdiri dari premis mayor, premis minor, dan kesimpulan. Premis mayor bersifat umum, premis minor bersifat khusus, dan kesimpulan menghubungkan keduanya.',
          'Contoh: semua ASN wajib disiplin; Budi adalah ASN; maka Budi wajib disiplin. Pola ini disebut modus ponens.',
        ],
      },
      {
        heading: 'Kuantor dan negasi',
        body: [
          'Kuantor universal mencakup kata semua, setiap, seluruh. Kuantor partikular mencakup sebagian, beberapa, ada yang. Kesimpulan hanya boleh memakai kuantor partikular jika salah satu premis partikular.',
          'Modus tollens berbentuk: jika P maka Q; tidak Q; maka tidak P. Ini sah. Sebaliknya, menyimpulkan "tidak P maka tidak Q" adalah kesalahan penalaran.',
        ],
      },
      {
        heading: 'Kesalahan yang sering dipakai sebagai jebakan',
        body: [
          'Kesalahan paling umum adalah menegasikan anteseden atau mengafirmasi konsekuen. Contoh salah: jika hujan maka jalan basah; jalan tidak basah; maka tidak hujan — ini justru benar (modus tollens). Bandingkan dengan: jika hujan maka jalan basah; jalan basah; maka hujan — ini salah.',
          'Jebakan lain adalah menambah informasi yang tidak ada di premis, misalnya menyimpulkan tentang kelompok yang tidak disebut sama sekali.',
        ],
      },
    ],
    tips: [
      'Ganti isi kalimat dengan huruf P dan Q agar tidak terbawa makna.',
      'Kesimpulan tidak boleh memuat istilah yang tidak ada di premis.',
      'Jika salah satu premis memakai "sebagian", kesimpulan juga harus "sebagian".',
      'Hafalkan dua pola sah: ponens (P maka Q, P, jadi Q) dan tollens (P maka Q, bukan Q, jadi bukan P).',
    ],
  },

  Analitis: {
    heading: 'Latihan Soal Penalaran Analitis CPNS: Urutan, Pengelompokan, dan Syarat',
    intro:
      'Soal analitis menyajikan sekumpulan kondisi lalu meminta kesimpulan yang pasti benar. Yang diuji adalah kemampuan menyusun informasi menjadi satu model yang konsisten.',
    sections: [
      {
        heading: 'Tipe soal yang sering muncul',
        body: [
          'Tipe urutan meminta menyusun posisi atau jadwal berdasarkan petunjuk perbandingan. Tipe pengelompokan meminta membagi objek ke dalam kategori dengan syarat tertentu. Tipe kombinasi meminta memilih susunan yang memenuhi semua syarat.',
          'Pertanyaan biasanya berbentuk "manakah yang pasti benar", "manakah yang mungkin benar", atau "manakah yang tidak mungkin benar".',
        ],
      },
      {
        heading: 'Strategi mengerjakan',
        body: [
          'Mulai dari petunjuk yang paling mengikat, misalnya posisi pasti atau syarat mutlak. Gambarkan skema sederhana di kertas: garis urutan, tabel, atau diagram himpunan.',
          'Setelah model terbentuk, uji setiap pilihan terhadap model. Pilihan yang melanggar satu syarat saja langsung gugur.',
        ],
      },
      {
        heading: 'Membedakan pasti dan mungkin',
        body: [
          'Kata "pasti" berarti berlaku di semua susunan yang valid. Kata "mungkin" berarti cukup ada satu susunan valid yang memenuhinya. Salah membaca kata kunci ini adalah penyebab kesalahan paling sering.',
          'Bila waktu terbatas, kerjakan soal "pasti" lebih dulu karena dapat dijawab dengan satu model, sedangkan soal "mungkin" menuntut penelusuran beberapa kemungkinan.',
        ],
      },
    ],
    tips: [
      'Selalu gambar skema; jangan mengandalkan hafalan di kepala.',
      'Kerjakan petunjuk paling mengikat lebih dulu.',
      'Garis bawahi kata pasti, mungkin, dan tidak mungkin.',
      'Kalau pilihan melanggar satu syarat, langsung buang tanpa memeriksa sisanya.',
    ],
  },

  'Deret Angka': {
    heading: 'Latihan Soal Deret Angka CPNS: Pola Aritmetika, Geometri, dan Bertingkat',
    intro:
      'Deret angka menguji kepekaan terhadap pola bilangan. Hampir semua soal dapat dipecahkan dengan memeriksa selisih, rasio, atau pola bertingkat secara berurutan.',
    sections: [
      {
        heading: 'Pola dasar',
        body: [
          'Pola aritmetika menambah atau mengurangi dengan bilangan tetap, misalnya 3, 7, 11, 15 dengan selisih 4. Pola geometri mengalikan atau membagi dengan bilangan tetap, misalnya 2, 6, 18, 54 dengan rasio 3.',
          'Pola bertingkat terjadi ketika selisih antarsuku membentuk deret baru, misalnya selisihnya 2, 4, 8, 16. Pola Fibonacci menjumlahkan dua suku sebelumnya.',
        ],
      },
      {
        heading: 'Pola campuran',
        body: [
          'Banyak soal memisahkan deret menjadi dua lintasan, misalnya suku ganjil dan suku genap memiliki pola berbeda. Ada juga pola yang bergantian antara operasi tambah dan kali.',
          'Pola kuadrat dan kubik juga sering dipakai, misalnya 1, 4, 9, 16 atau 1, 8, 27, 64, kadang dengan penambahan konstanta.',
        ],
      },
      {
        heading: 'Urutan pemeriksaan yang efisien',
        body: [
          'Periksa selisih antarsuku lebih dulu. Jika tidak konstan, periksa selisih dari selisih. Jika masih gagal, periksa rasio. Setelah itu baru pertimbangkan pola dua lintasan atau pola kuadrat.',
          'Membiasakan urutan ini menghemat waktu karena sebagian besar soal selesai pada pemeriksaan pertama atau kedua.',
        ],
      },
    ],
    tips: [
      'Tulis selisih di bawah setiap suku; pola sering langsung terlihat.',
      'Jika selisih tidak rata, hitung selisih dari selisih sebelum menyerah.',
      'Curigai pola dua lintasan bila jumlah suku ganjil dan angkanya naik-turun.',
      'Hafalkan kuadrat 1–20 dan kubik 1–10 untuk mempercepat pengenalan pola.',
    ],
  },

  'Soal Cerita': {
    heading: 'Latihan Soal Cerita Hitung CPNS: Persentase, Perbandingan, dan Kecepatan',
    intro:
      'Soal cerita menguji penerapan aritmetika dasar pada situasi nyata. Kuncinya adalah menerjemahkan kalimat menjadi persamaan sebelum menghitung.',
    sections: [
      {
        heading: 'Persentase dan untung rugi',
        body: [
          'Persentase perubahan dihitung dari selisih dibagi nilai awal. Untung terjadi bila harga jual lebih besar dari harga beli, dan persentase untung dihitung terhadap harga beli, bukan harga jual.',
          'Diskon bertingkat tidak dijumlahkan. Diskon 20 persen lalu 10 persen setara dengan potongan 28 persen, bukan 30 persen.',
        ],
      },
      {
        heading: 'Perbandingan dan skala',
        body: [
          'Perbandingan senilai berlaku ketika satu besaran naik maka besaran lain naik, misalnya jumlah barang dan total harga. Perbandingan berbalik nilai berlaku ketika satu naik maka yang lain turun, misalnya jumlah pekerja dan waktu penyelesaian.',
          'Untuk pembagian sesuai rasio, jumlahkan angka rasio lalu tentukan nilai satu bagian.',
        ],
      },
      {
        heading: 'Kecepatan dan kerja bersama',
        body: [
          'Kecepatan sama dengan jarak dibagi waktu. Untuk dua kendaraan berlawanan arah, kecepatan dijumlahkan; untuk arah sama, kecepatan dikurangkan.',
          'Pada kerja bersama, jumlahkan laju kerja per satuan waktu, bukan waktunya. Jika A selesai dalam 6 jam dan B dalam 3 jam, laju gabungannya 1/6 + 1/3 = 1/2, sehingga selesai dalam 2 jam.',
        ],
      },
    ],
    tips: [
      'Tulis besaran yang diketahui beserta satuannya sebelum menghitung.',
      'Persentase untung selalu dihitung dari harga beli.',
      'Diskon bertingkat dihitung berurutan, tidak dijumlahkan.',
      'Untuk kerja bersama, jumlahkan laju (1/waktu), bukan waktunya.',
    ],
  },

  Figural: {
    heading: 'Latihan Soal Figural CPNS: Analogi Gambar, Serial Pola, dan Jaring-jaring',
    intro:
      'Soal figural menguji penalaran visual tanpa kata. Tipe yang diuji meliputi analogi gambar, ketidaksamaan, serial pola, rotasi, pencerminan, dan jaring-jaring bangun ruang.',
    sections: [
      {
        heading: 'Analogi dan ketidaksamaan gambar',
        body: [
          'Pada analogi gambar, hubungan antara gambar pertama dan kedua harus diterapkan pada gambar ketiga. Perubahan yang biasa dipakai: rotasi, penambahan atau pengurangan elemen, perubahan jumlah sisi, dan perubahan posisi.',
          'Pada ketidaksamaan, semua gambar memiliki ciri yang sama kecuali satu. Periksa jumlah elemen, jenis garis, arah hadap, dan pola pengulangan secara berurutan.',
        ],
      },
      {
        heading: 'Serial pola',
        body: [
          'Serial pola menampilkan urutan gambar yang berubah mengikuti aturan tetap. Aturan yang umum: rotasi sebesar sudut tertentu, penambahan satu elemen per langkah, pergantian warna atau arsiran, dan pergeseran posisi.',
          'Hitung perubahan antargambar secara eksplisit, misalnya "berputar 45 derajat searah jarum jam setiap langkah", lalu terapkan pada gambar terakhir.',
        ],
      },
      {
        heading: 'Jaring-jaring dan bangun ruang',
        body: [
          'Soal jaring-jaring meminta menentukan bangun ruang yang terbentuk atau sisi yang berhadapan. Latih dengan melipat jaring-jaring secara mental dan menandai sisi yang saling menempel.',
          'Untuk kubus, sisi yang berhadapan pada jaring-jaring biasanya dipisahkan oleh tepat satu sisi lain pada baris atau kolom yang sama.',
        ],
      },
    ],
    tips: [
      'Sebutkan aturan perubahan dalam satu kalimat sebelum memilih jawaban.',
      'Periksa satu ciri pada satu waktu: jumlah, posisi, arah, lalu jenis garis.',
      'Untuk jaring-jaring, tandai sisi yang berhadapan sebelum melipat.',
      'Jangan memilih jawaban karena "terlihat mirip"; pastikan aturannya konsisten.',
    ],
  },

  // ───────────────────────────── TKP ─────────────────────────────
  'Pelayanan Publik': {
    heading: 'Latihan Soal TKP Pelayanan Publik: Respons Terbaik Menghadapi Masyarakat',
    intro:
      'TKP pelayanan publik menguji sikap ASN saat berhadapan dengan masyarakat. Tidak ada jawaban benar atau salah, hanya tingkat kualitas respons dari 1 sampai 5.',
    sections: [
      {
        heading: 'Asas pelayanan publik',
        body: [
          'UU Nomor 25 Tahun 2009 tentang Pelayanan Publik menetapkan asas kepentingan umum, kepastian hukum, kesamaan hak, keseimbangan hak dan kewajiban, keprofesionalan, partisipatif, persamaan perlakuan, keterbukaan, akuntabilitas, fasilitas dan perlakuan khusus bagi kelompok rentan, ketepatan waktu, serta kecepatan dan kemudahan.',
          'Penyelenggara wajib menyusun standar pelayanan dan maklumat pelayanan yang dipublikasikan kepada masyarakat.',
        ],
      },
      {
        heading: 'Pola jawaban bernilai tinggi',
        body: [
          'Respons terbaik biasanya bersifat proaktif dan berorientasi solusi: mendengarkan keluhan sampai selesai, menjelaskan prosedur dengan bahasa sederhana, menawarkan alternatif yang masih dalam kewenangan, dan menindaklanjuti sampai tuntas.',
          'Respons bernilai rendah bersifat menghindar: menyalahkan sistem, menyuruh kembali tanpa penjelasan, atau membiarkan antrean menumpuk tanpa tindakan.',
        ],
      },
      {
        heading: 'Menghadapi keluhan dan keterbatasan',
        body: [
          'Saat permintaan masyarakat di luar kewenangan, jawaban terbaik adalah mengarahkan ke unit yang tepat disertai penjelasan, bukan menolak mentah-mentah.',
          'Saat fasilitas terbatas, jawaban terbaik adalah mengatur prioritas secara adil dan transparan, misalnya kelompok lansia, ibu hamil, dan penyandang disabilitas didahulukan sesuai asas perlakuan khusus.',
        ],
      },
    ],
    tips: [
      'Pilih jawaban yang menyelesaikan masalah, bukan yang sekadar melaporkan.',
      'Utamakan mendengarkan dan menjelaskan sebelum menolak.',
      'Kelompok rentan selalu diprioritaskan menurut UU 25/2009.',
      'Hindari jawaban yang menunggu perintah atasan bila tindakan masih dalam kewenanganmu.',
    ],
  },

  Profesionalisme: {
    heading: 'Latihan Soal TKP Profesionalisme: Kompetensi, Disiplin, dan Etos Kerja',
    intro:
      'Profesionalisme menguji sikap kerja yang konsisten antara tuntutan jabatan dan pelaksanaannya. Soal biasanya menempatkan kamu pada situasi konflik antara kenyamanan pribadi dan tanggung jawab kerja.',
    sections: [
      {
        heading: 'Dimensi profesionalisme',
        body: [
          'Profesionalisme mencakup penguasaan kompetensi bidang, disiplin terhadap aturan dan tenggat, tanggung jawab atas hasil kerja, serta kesediaan meningkatkan kemampuan secara berkelanjutan.',
          'Dalam nilai dasar ASN, profesionalisme berarti bekerja sesuai keahlian, menjaga kualitas, dan tidak menyalahgunakan wewenang.',
        ],
      },
      {
        heading: 'Situasi yang sering diuji',
        body: [
          'Situasi umum meliputi menerima tugas di luar kebiasaan, menghadapi rekan yang tidak disiplin, mendapat kritik atas hasil kerja, dan ditawari jalan pintas yang melanggar prosedur.',
          'Respons terbaik selalu menggabungkan penyelesaian tugas dengan perbaikan proses, misalnya menyelesaikan pekerjaan lalu mengusulkan perbaikan alur agar tidak terulang.',
        ],
      },
      {
        heading: 'Menghadapi rekan yang bermasalah',
        body: [
          'Jawaban bernilai tinggi adalah menegur secara pribadi dengan cara santun, membantu mencari solusi, dan bila tidak berhasil, melaporkan melalui jalur yang benar disertai bukti.',
          'Jawaban bernilai rendah adalah membiarkan, membicarakan di belakang, atau mengambil alih pekerjaan tanpa menyelesaikan akar masalahnya.',
        ],
      },
    ],
    tips: [
      'Pilih jawaban yang menyelesaikan tugas sekaligus memperbaiki proses.',
      'Tegur secara pribadi lebih dulu; eskalasi hanya jika perlu.',
      'Hindari jalan pintas yang melanggar prosedur meski hasilnya lebih cepat.',
      'Tunjukkan inisiatif belajar, bukan hanya menunggu pelatihan dari kantor.',
    ],
  },

  'Anti-Radikalisme': {
    heading: 'Latihan Soal TKP Anti-Radikalisme: Moderasi Beragama dan Sikap ASN',
    intro:
      'Materi anti-radikalisme menguji kemampuan ASN menjaga kerukunan dan menolak segala bentuk kekerasan atas nama ideologi. Soal menempatkan kamu pada situasi perbedaan pandangan yang memanas.',
    sections: [
      {
        heading: 'Empat indikator moderasi beragama',
        body: [
          'Komitmen kebangsaan, yaitu menerima Pancasila dan NKRI sebagai kesepakatan bersama. Toleransi, yaitu menghormati perbedaan keyakinan tanpa mencampuradukkan ajaran.',
          'Anti-kekerasan, yaitu menolak cara-cara kekerasan baik fisik maupun verbal dalam memperjuangkan pandangan. Akomodatif terhadap budaya lokal, yaitu menerima tradisi yang tidak bertentangan dengan prinsip agama.',
        ],
      },
      {
        heading: 'Ciri paham radikal',
        body: [
          'Ciri yang biasa diuji meliputi sikap mengklaim kebenaran paling mutlak, menolak dialog, mengkafirkan pihak lain, mendukung kekerasan, dan mengingkari kesepakatan negara yang sah.',
          'Radikalisasi sering berjalan bertahap: dari intoleransi, lalu penolakan sistem, lalu pembenaran kekerasan, hingga tindakan.',
        ],
      },
      {
        heading: 'Respons ASN',
        body: [
          'Jawaban terbaik adalah membuka dialog, menjelaskan pentingnya kerukunan, melibatkan tokoh agama atau forum resmi, serta melaporkan indikasi ke aparat bila mengarah pada ancaman kekerasan.',
          'Jawaban bernilai rendah adalah membiarkan, ikut menyebarkan konten provokatif, atau mengambil tindakan sendiri di luar kewenangan.',
        ],
      },
    ],
    tips: [
      'Hafalkan empat indikator moderasi beragama.',
      'Pilih dialog dan pelibatan tokoh sebelum eskalasi ke aparat.',
      'Bedakan perbedaan pandangan biasa dengan indikasi radikalisasi.',
      'Jangan memilih jawaban yang membiarkan provokasi menyebar demi menghindari konflik.',
    ],
  },

  'Jejaring Kerja': {
    heading: 'Latihan Soal TKP Jejaring Kerja: Kolaborasi dan Pengelolaan Pemangku Kepentingan',
    intro:
      'Jejaring kerja menguji kemampuan membangun dan memanfaatkan hubungan lintas unit, instansi, dan pihak luar untuk mencapai tujuan organisasi.',
    sections: [
      {
        heading: 'Prinsip kolaborasi',
        body: [
          'Jejaring kerja yang efektif dibangun atas dasar saling percaya, tujuan bersama, dan komunikasi yang terbuka. ASN dituntut aktif membangun relasi sebelum kebutuhan mendesak muncul.',
          'Kolaborasi bukan sekadar berbagi tugas, melainkan menyatukan sumber daya dan informasi agar hasilnya lebih besar daripada bekerja sendiri.',
        ],
      },
      {
        heading: 'Situasi yang sering diuji',
        body: [
          'Situasi umum meliputi bekerja dengan unit yang memiliki prioritas berbeda, menghadapi mitra yang lambat merespons, dan diminta memimpin tim lintas fungsi.',
          'Respons terbaik biasanya menyelaraskan tujuan lebih dulu, menyepakati peran dan tenggat, lalu menjaga komunikasi berkala agar hambatan cepat terdeteksi.',
        ],
      },
      {
        heading: 'Menjaga hubungan jangka panjang',
        body: [
          'Jawaban bernilai tinggi menunjukkan kesediaan memberi lebih dulu, menepati janji, dan menyelesaikan konflik secara langsung tanpa melibatkan pihak ketiga yang tidak perlu.',
          'Jawaban bernilai rendah adalah bekerja sendiri karena menganggap koordinasi memperlambat, atau melimpahkan tanggung jawab ke pihak lain.',
        ],
      },
    ],
    tips: [
      'Selaraskan tujuan sebelum membagi tugas.',
      'Sepakati peran dan tenggat secara eksplisit di awal.',
      'Beri kontribusi lebih dulu sebelum meminta bantuan.',
      'Selesaikan konflik langsung dengan pihak terkait, bukan lewat perantara.',
    ],
  },

  TIK: {
    heading: 'Latihan Soal TKP Teknologi Informasi: Literasi Digital dan Keamanan Data',
    intro:
      'Materi TIK menguji pemanfaatan teknologi untuk meningkatkan kinerja sekaligus kesadaran menjaga keamanan dan kerahasiaan data.',
    sections: [
      {
        heading: 'Pemanfaatan teknologi dalam kerja ASN',
        body: [
          'Transformasi digital ASN diarahkan pada Sistem Pemerintahan Berbasis Elektronik yang menuntut integrasi layanan, data terbuka, dan proses kerja yang efisien.',
          'Respons terbaik terhadap tugas yang masih manual adalah mengusulkan atau mempelajari otomasi sederhana, bukan menolak karena merasa tidak mampu.',
        ],
      },
      {
        heading: 'Keamanan dan kerahasiaan data',
        body: [
          'Data masyarakat bersifat rahasia dan tidak boleh dibagikan tanpa kewenangan. Penggunaan perangkat pribadi untuk menyimpan data dinas memperbesar risiko kebocoran.',
          'Langkah pengamanan dasar meliputi kata sandi kuat, autentikasi dua faktor, pembaruan perangkat lunak, dan kehati-hatian terhadap tautan atau lampiran mencurigakan.',
        ],
      },
      {
        heading: 'Etika digital',
        body: [
          'ASN wajib menjaga netralitas di media sosial, tidak menyebarkan informasi belum terverifikasi, dan tidak menggunakan akun dinas untuk kepentingan pribadi.',
          'Jawaban bernilai rendah adalah menyebarkan data ke grup percakapan, memakai kata sandi bersama, atau mengabaikan prosedur keamanan demi kecepatan.',
        ],
      },
    ],
    tips: [
      'Pilih jawaban yang memanfaatkan teknologi sekaligus menjaga keamanan data.',
      'Data masyarakat tidak boleh dibagikan tanpa kewenangan, sekalipun untuk membantu.',
      'Hindari menyimpan data dinas di perangkat atau akun pribadi.',
      'Verifikasi informasi sebelum membagikannya.',
    ],
  },

  'Sosial Budaya': {
    heading: 'Latihan Soal TKP Sosial Budaya: Keberagaman dan Adaptasi Lingkungan Kerja',
    intro:
      'Materi sosial budaya menguji kemampuan beradaptasi dengan latar belakang rekan kerja dan masyarakat yang beragam tanpa kehilangan sikap profesional.',
    sections: [
      {
        heading: 'Menghadapi keberagaman',
        body: [
          'Indonesia memiliki keragaman suku, agama, bahasa, dan adat. ASN dituntut bersikap inklusif, tidak membedakan pelayanan, dan menghindari gurauan yang menyentuh identitas kelompok.',
          'Respons terbaik terhadap perbedaan kebiasaan kerja adalah memahami latar belakangnya lalu menyepakati aturan kerja bersama.',
        ],
      },
      {
        heading: 'Adaptasi di lingkungan baru',
        body: [
          'Saat ditempatkan di daerah dengan budaya berbeda, jawaban bernilai tinggi adalah mempelajari adat setempat, menghormati tokoh masyarakat, dan menyesuaikan cara komunikasi tanpa mengubah prinsip kerja.',
          'Jawaban bernilai rendah adalah menuntut lingkungan menyesuaikan diri atau menganggap budaya setempat sebagai hambatan.',
        ],
      },
      {
        heading: 'Gotong royong dan kepedulian',
        body: [
          'Nilai gotong royong diwujudkan melalui kesediaan membantu rekan yang kesulitan, partisipasi dalam kegiatan sosial kantor, dan kepedulian terhadap kondisi masyarakat sekitar.',
          'Namun kepedulian tetap harus menjaga batas profesional, misalnya tidak mencampur bantuan pribadi dengan keputusan dinas.',
        ],
      },
    ],
    tips: [
      'Pilih jawaban yang mempelajari dan menghormati budaya setempat.',
      'Hindari gurauan atau komentar yang menyentuh identitas kelompok.',
      'Bantu rekan tanpa melanggar batas kewenangan.',
      'Sikap inklusif berarti melayani semua pihak dengan standar sama.',
    ],
  },
};
