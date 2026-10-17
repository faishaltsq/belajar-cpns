export interface TryoutSeo {
  /** Topik yang benar-benar muncul di paket ini, urut dari jumlah soal terbanyak. */
  topics: string[];
  /** Cuplikan batang soal asli untuk memberi gambaran isi paket. */
  samples: string[];
  /** Jumlah butir per kategori. */
  breakdown: { category: string; count: number }[];
}

/**
 * Data SEO per paket tryout, diturunkan langsung dari bank soal.
 * Tujuannya memberi setiap halaman /simulasi/[id] isi yang berbeda —
 * sebelumnya 37 halaman hanya berbagi satu deskripsi generik.
 */
export const TRYOUT_SEO: Record<string, TryoutSeo> = {
  "tryout-1": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Profesionalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara (Pancasila)","Pilar Negara (UUD 1945)","Bahasa Indonesia","Verbal - Analogi","Verbal - Silogisme","Verbal - Analitis","Numerik - Berhitung","Numerik - Deret Angka","Numerik - Soal Cerita","Figural - Ketidaksamaan","Sosial Budaya","Teknologi Informasi & Komunikasi","Anti Radikalisme","Integritas Diri","Semangat Berprestasi","Kemampuan Beradaptasi","Pengendalian Diri"],
    samples: ["Seorang PNS menemukan rekan kerjanya menyebarkan konten yang merendahkan suku tertentu di media sosial kantor. Tindakan yang paling tepat adalah...","Dalam rangka memperkuat rasa cinta tanah air di kalangan generasi muda, kebijakan institusi pemerintah yang paling relevan adalah...","Sikap yang mencerminkan paham kebangsaan terbuka dalam era globalisasi adalah..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-2": {
    topics: ["Penalaran Kuantitatif","Verbal Analogi","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Sinonim","Verbal Antonim","Penalaran Induktif","Penalaran Deduktif","Integritas Diri","Semangat Berprestasi","Orientasi Pelayanan","Kemampuan Adaptasi","Mengendalikan Diri","Bekerja Mandiri","Kemauan Belajar","Kerjasama Tim","Kepemimpinan"],
    samples: ["Organisasi pergerakan nasional yang pertama kali secara tegas menyatakan tujuannya untuk mencapai kemerdekaan Indonesia dan menumbuhkan nasionalisme tanpa membe","Dalam pidato 1 Juni 1945 di sidang BPUPKI, Ir. Soekarno menegaskan bahwa nasionalisme Indonesia tidak boleh terjebak dalam chauvinisme, melainkan harus berlanda","Ikrar pemersatu yang menjadi tonggak pengukuhan nasionalisme Indonesia melalui komitmen bertanah air satu, berbangsa satu, dan menjunjung bahasa persatuan lahir"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-3": {
    topics: ["Penalaran Kuantitatif","Verbal Analogi","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Sinonim","Verbal Antonim","Penalaran Induktif","Penalaran Deduktif","Integritas Diri","Semangat Berprestasi","Orientasi Pelayanan","Kemampuan Adaptasi","Mengendalikan Diri","Bekerja Mandiri","Kemauan Belajar","Kerjasama Tim","Kepemimpinan"],
    samples: ["Organisasi Indische Partij yang didirikan pada tahun 1912 oleh Tiga Serangkai memiliki kontribusi signifikan terhadap perkembangan nasionalisme Indonesia karena","Surat kabar berbahasa Melayu yang didirikan oleh R.M. Tirto Adhi Soerjo pada tahun 1907 dan diakui sebagai pelopor pers nasional dalam menyemai kesadaran berban","Berdasarkan teori tipologi nasionalisme, paham kebangsaan yang mendasarkan keanggotaan bangsa pada kesetaraan status hukum, partisipasi politik aktif warga nega"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-4": {
    topics: ["Penalaran Kuantitatif","Verbal Analogi","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Sinonim","Verbal Antonim","Penalaran Induktif","Penalaran Deduktif","Integritas Diri","Semangat Berprestasi","Orientasi Pelayanan","Kemampuan Adaptasi","Mengendalikan Diri","Bekerja Mandiri","Kemauan Belajar","Kerjasama Tim","Kepemimpinan"],
    samples: ["Organisasi pergerakan nasional yang pertama kali secara tegas menggunakan istilah 'Indonesia' dalam manifesto politiknya tahun 1925 serta mempromosikan prinsip ","Kongres Pemuda II pada 28 Oktober 1928 yang melahirkan ikrar Sumpah Pemuda diselenggarakan dalam tiga rapat di lokasi berbeda. Rapat penutup yang menghasilkan n","Konsep nasionalisme yang diadopsi para pendiri bangsa Indonesia mengadopsi teori Ernest Renan. Menurut Renan, syarat mutlak berdirinya suatu bangsa adalah..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-5": {
    topics: ["Penalaran Kuantitatif","Verbal Analogi","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Sinonim","Verbal Antonim","Penalaran Induktif","Penalaran Deduktif","Integritas Diri","Semangat Berprestasi","Orientasi Pelayanan","Kemampuan Adaptasi","Mengendalikan Diri","Bekerja Mandiri","Kemauan Belajar","Kerjasama Tim","Kepemimpinan"],
    samples: ["Organisasi pergerakan nasional pertama yang secara tegas dan terang-terangan berhaluan politik dengan tujuan mencapai kemerdekaan Indonesia serta mempopulerkan ","Wujud penguatan kedaulatan maritim dan persatuan wilayah Indonesia dicapai melalui perombakan batas laut warisan kolonial (Territoriale Zee en Maritieme Kringen","Dalam teori kebangsaan, konsep bahwa bangsa merupakan komunitas yang terbentuk atas dasar kesamaan perangai atau tabiat akibat persamaan sejarah serta pengalama"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-6": {
    topics: ["Penalaran Kuantitatif","Verbal Analogi","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Sinonim","Verbal Antonim","Penalaran Induktif","Penalaran Deduktif","Integritas Diri","Semangat Berprestasi","Orientasi Pelayanan","Kemampuan Adaptasi","Mengendalikan Diri","Bekerja Mandiri","Kemauan Belajar","Kerjasama Tim","Kepemimpinan"],
    samples: ["Pada tahun 1925, Perhimpunan Indonesia (PI) di Belanda mencetuskan Manifesto Politik yang menjadi cetak biru nasionalisme modern Indonesia. Salah satu prinsip p","Ernest Renan dalam pidatonya tahun 1882 merumuskan bahwa keberadaan suatu bangsa dan timbulnya rasa nasionalisme bertumpu pada fondasi pokok berupa...","Indische Partij (1912) dicatat sebagai organisasi pergerakan pertama yang menanamkan nasionalisme politik inklusif di Hindia Belanda. Gagasan 'Indische National"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-7": {
    topics: ["TKP","TIU","TWK"],
    samples: ["Menganggap budaya etnis sendiri memiliki derajat kemuliaan absolut dibanding tradisi etnis lain di Indonesia berpotensi memicu disintegrasi. Cara pandang keliru","Pemberian pendidikan dan pelatihan yang setara bagi seluruh aparatur tanpa diskriminasi suku, ras, atau gender mencerminkan nilai integritas aparatur yang selar","Tindakan generasi muda memilih membeli produk industri perangkat lunak karya programmer dalam negeri dibanding mengunduh produk bajakan dari luar negeri merupak"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-8": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Serial Gambar","Verbal Analogi","Verbal Silogisme","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Ketidaksamaan Gambar","Analogi Gambar","Penalaran Spasial / Jaring Kubus"],
    samples: ["Salah satu contoh pelanggaran HAM terkait agama adalah...","Prinsip HAM yang menjamin bahwa setiap individu memiliki hak untuk hidup dan kebebasan pribadi adalah...","Yang bertugas menjaga konstitusionalisme adalah..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-9": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Analogi Gambar","Verbal Analogi","Verbal Silogisme","Serial Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Ketidaksamaan Gambar","Penalaran Spasial / Jaring Kubus"],
    samples: ["Siapa yang memiliki kewenangan untuk menetapkan Rencana Pembangunan Jangka Menengah Daerah (RPJMD)?","Apa yang dimaksud dengan tanggung jawab sosial dalam demokrasi?","Upaya internasional untuk menghentikan praktik perdagangan manusia merupakan contoh dari perlindungan HAM terhadap..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-10": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Serial Gambar","Verbal Analogi","Verbal Silogisme","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Ketidaksamaan Gambar","Analogi Gambar","Penalaran Spasial / Jaring Kubus"],
    samples: ["Apa yang diatur dalam UU No. 32 Tahun 2004 tentang Pemerintahan Daerah?","Program apa yang diinisiasi untuk meningkatkan kemandirian industri pertahanan di Indonesia?","Siapakah perdana menteri Indonesia pada saat terbentuknya Kabinet Pembangunan II?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-11": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Analogi","Verbal Silogisme","Serial Gambar","Penalaran Spasial / Jaring Kubus","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Ketidaksamaan Gambar","Analogi Gambar"],
    samples: ["Bagaimana cara menerapkan sila pertama Pancasila dalam kehidupan sehari- hari?","Dalam proses perumusan konstitusi Indonesia, tokoh yang pertama kali mengusulkan agar Bhinneka Tunggal Ika dijadikan semboyan sesanti negara adalah...","Siapa yang dianggap sebagai arsitek diplomasi Indonesia dalam menyelesaikan konflik dengan Belanda?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-12": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Ketidaksamaan Gambar","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Analogi","Verbal Silogisme","Serial Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Analogi Gambar"],
    samples: ["Apa nama operasi militer yang dilakukan oleh Jepang dalam merebut Hindia Belanda?","Undang-Undang yang mengatur tentang hubungan keuangan antara pemerintah pusat dan pemerintah daerah adalah...","Seorang pedagang menjual dua jenis beras, beras A seharga Rp 15.000 per kg dan beras B seharga Rp 12.000 per kg. Jika ia menjual 40 kg beras A dan 60 kg beras B"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-13": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Analogi","Verbal Silogisme","Analogi Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Ketidaksamaan Gambar","Serial Gambar","Penalaran Spasial / Jaring Kubus"],
    samples: ["Prinsip HAM yang menjamin hak individu untuk tidak ditahan tanpa alasan yang jelas adalah...","Salah satu prinsip HAM yang melarang perlakuan diskriminatif berdasarkan ras, agama, atau gender adalah...","Perjanjian apa yang mengakhiri perang kemerdekaan antara Indonesia dan Belanda?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-14": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Analogi Gambar","Verbal Analogi","Verbal Silogisme","Serial Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Penalaran Spasial / Jaring Kubus","Ketidaksamaan Gambar"],
    samples: ["Lembaga HAM yang berfokus pada perlindungan hak anak di Indonesia adalah...","Ungkapan Bhinneka Tunggal Ika muncul pada awalnya dimaksudkan...","Apa yang dimaksud dengan keadilan distributif dalam organisasi?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-15": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Verbal Analogi","Verbal Silogisme","Ketidaksamaan Gambar","Analogi Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Penalaran Spasial / Jaring Kubus","Serial Gambar"],
    samples: ["Johannes Gutenberg : Percetakan = Louis Pasteur : ...","Apa yang diatur dalam Peraturan Pemerintah No. 25 Tahun 2021 tentang peningkatan kesejahteraan guru?","Siapa yang pertama kali menggunakan konsep Bhinneka Tunggal Ika?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-16": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Serial Gambar","Verbal Analogi","Verbal Silogisme","Ketidaksamaan Gambar","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Analogi Gambar"],
    samples: ["Menyusun undang-undang adalah fungsi DPR…","Apa yang dimaksud dengan demokrasi representatif?","Mengapa nilai persatuan Indonesia menjadi aspek yang penting dalam Pancasila?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-17": {
    topics: ["Pelayanan Publik","Jejaring Kerja","Sosial Budaya","Teknologi Informasi dan Komunikasi","Profesionalisme","Anti Radikalisme","Nasionalisme","Integritas","Bela Negara","Pilar Negara","Bahasa Indonesia","Analogi Gambar","Verbal Analogi","Verbal Silogisme","Verbal Analitis","Numerik Berhitung","Numerik Deret Angka","Numerik Perbandingan Kuantitatif","Numerik Soal Cerita","Serial Gambar","Penalaran Spasial / Jaring Kubus","Ketidaksamaan Gambar"],
    samples: ["Organisasi regional di Asia Tenggara yang menerapkan kerja sama dalam perlindungan HAM adalah...","Program apa yang dicanangkan untuk mengatasi krisis moneter di masa pemerintahan Habibie?","Apa yang dimaksud dengan Operasi Kraai yang dilancarkan oleh Belanda?"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-18": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Gagasan tertulis maupun lisan mengenai landasan filosofis Indonesia pertama kali disampaikan oleh Mr. Mohammad Yamin dalam forum BPUPKI pada ...","Ketetapan MPRS yang menjadi dasar hukum pengesahan Jenderal Soeharto sebagai Pejabat Kepala Negara RI pada tahun 1967 adalah...","Berikut merupakan sasaran kebijakan tata ruang dan kewilayahan dokumen RPJPN 2005-2025, kecuali..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-19": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Pengejawantahan Pancasila pada tataran subjektif dalam konteks kehidupan bermasyarakat dan bernegara mengandung arti...","Pemberlakuan kebijakan sanering lewat pemangkasan mata uang pecahan bernilai Rp2,50 ke atas hingga tersisa separuh nilainya dicanangkan saat kementerian keuanga","Ketetapan MPR mengenai Pedoman Penghayatan dan Pengamalan Pancasila (Ekaprasetya Pancakarsa) disahkan pada..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-20": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Tokoh pergerakan nasional yang ditetapkan oleh otoritas pendudukan Jepang sebagai pimpinan (wakil ketua) BPUPKI adalah...","Ajaran perjuangan Mahatma Gandhi yang mengajak rakyat menggunakan produk-produk buatan dalam negeri dinamakan konsep …","Visi serta tujuan fundamental kemerdekaan bangsa yang bersumber dari Pancasila termaktub pada Pembukaan UUD 1945 bagian alinea..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-21": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Institusi di bawah ini yang fungsinya tergolong lembaga mandiri pemeriksa keuangan dan bukan Lembaga Pemerintah Nonkementerian (LPNK/LPND) adalah...","Taktik bertahan berpusat pada benteng-benteng pertahanan yang diterapkan militer kolonial Belanda guna membendung perlawanan gerilya rakyat Aceh dikenal sebagai","Standardisasi pengucapan dan tata urutan rumusan sila-sila Pancasila dalam agenda protokoler resmi ditetapkan melalui..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-22": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Berdasarkan Pasal 49 UU No. 12 Tahun 2003, batas minimal keanggotaan legislatif tingkat DPRD Provinsi ditetapkan sebanyak ... orang.","Kongres Pemuda II tahun 1928 melahirkan ikrar persatuan yang monumental. Poin kedua dari naskah Sumpah Pemuda tersebut berbunyi …","Penerapan prinsip tata kelola pemerintahan yang bersih dan berintegritas (good governance) dievaluasi melalui pilar berikut, kecuali..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-23": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Pembangunan nasional menargetkan terciptanya manusia Indonesia seutuhnya. Dimensi yang dikecualikan dari batasan konsep tersebut adalah...","Regulasi mengenai ketentuan tanda gambar dan identitas kepartaian dalam ajang kontestasi elektoral termaktub pada UU No. 12 Tahun 2003, khususnya...","Wilayah tapal batas terluar Negara Kesatuan Republik Indonesia berupa Pulau Dana berhadapan langsung dengan teritorial..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-24": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Anggota Gerakan Non-Blok beraliran komunis yang memilih tidak bergabung ke dalam aliansi militer Pakta Warsawa ditunjukkan oleh…","Pernyataan di bawah ini yang tidak termasuk butir kesepakatan KTT Non-Blok ke-10 di Jakarta adalah...","Cabang kekuasaan yang mengemban mandat untuk mengawasi serta menjalankan ketentuan perundang-undangan yaitu ..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-25": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Perubahan arah gerak Perhimpunan Indonesia hingga menjadi organisasi politik berpengaruh terutama dirintis atas inisiatif dan perjuangan...","Berikut ini adalah para pemimpin dunia yang memprakarsai berdirinya Gerakan Non-Blok (GNB), kecuali...","Seorang penulis hendak menyusun tulisan bertema upaya penanggulangan pergaulan bebas di kalangan remaja perkotaan. Urutan kerangka karangan yang paling logis da"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-26": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Berdasarkan ketentuan Pasal 20 UU No. 25 Tahun 2009 tentang Pelayanan Publik, penyusunan dan penetapan standar pelayanan oleh penyelenggara wajib mengikutsertak","Publik menanti perwujudan komitmen pemerintah dalam menaikkan mutu pendidikan lewat alokasi bujet 20% dari APBN serta APBD. Namun kenyataannya, baru segelintir ","Dalam tata hukum Indonesia, Pancasila berkedudukan sebagai..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-27": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Berdasarkan ketentuan UUD 1945 pasca-amendemen, wewenang yang sah dimiliki oleh MPR adalah...","Pada masa awal perkembangannya, blog berfungsi sebagai buku harian digital yang diunggah ke internet sehingga dapat dibaca publik. Kepopulerannya melonjak drast","Pakar yang merumuskan hukum sebagai kaidah mengenai tindakan moral guna mewujudkan keadilan adalah..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-28": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Di bawah ini hal yang bukan termasuk transformasi mendasar dalam struktur ketatanegaraan Indonesia adalah...","Pancasila mencerminkan kepribadian bangsa Indonesia yang sarat dengan keluhuran nilai kemanusiaan. Hal tersebut menunjukkan peran Pancasila sebagai...","Penyelenggaraan Konferensi Asia-Afrika (KAA) di Bandung pada 1955 menjadi tonggak penting perintisan berdirinya organisasi internasional, yaitu ...."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-29": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Penyelenggaraan perdana Konferensi Asia Afrika (KAA) di Bandung berlangsung pada tahun...","Affandi lahir di Cirebon pada 1907 sebagai putra R. Koesoema, seorang mantri ukur pabrik gula Ciledug. Ia mengenyam pendidikan formal relatif tinggi untuk ukura","Aturan perundangan yang mengatur tata hubungan antara aparatur atau pejabat pemerintahan dinamakan..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-30": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Berikut partai yang tidak termasuk empat kekuatan politik utama hasil Pemilu Indonesia 1955, yaitu...","Hierarki peraturan perundang-undangan di Indonesia diatur melalui regulasi...","Pasal-pasal UUD 1945 yang mengalami perubahan pada amendemen pertama meliputi...."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-31": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Sikap memperlakukan manusia selaras dengan harkat dan martabatnya sebagai makhluk ciptaan Tuhan Yang Maha Esa merupakan wujud pengamalan Pancasila sila...","Prinsip hukum internasional yang memuat daya jangkau eksteritorialitas disebut....","Pertemuan delegasi Indonesia, Singapura, Filipina, Malaysia, dan Thailand pada 5 Agustus 1967 menyepakati pembentukan organisasi..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-32": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Berikut yang bukan merupakan klasifikasi hukum berdasarkan sumbernya adalah...","Nilai luhur utama yang menjadi inti penegasan pada sila kelima Pancasila adalah...","Semangat mewujudkan kesatuan yang utuh di ranah ideologi, politik, ekonomi, sosial budaya, dan pertahanan keamanan merupakan manifestasi nilai Pancasila pada si"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-33": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Partisipasi aktif Indonesia dalam menjaga perdamaian dunia mencerminkan mandat politik luar negeri bebas aktif. Komitmen ini diwujudkan melalui pengiriman Konti","Ketentuan pokok yang termaktub di dalam Pasal 31 Ayat (1) UUD 1945 menjamin...","Prinsip trias politika dalam tata kelola pemerintahan bermakna..."],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-34": {
    topics: ["TWK","TIU","TKP"],
    samples: ["Langkah nyata Perserikatan Bangsa-Bangsa (PBB) dalam memediasi sengketa bersenjata antara Indonesia dan Belanda adalah melalui pendirian...","Berikut ini merupakan deretan lembaga independen yang dasar hukum pendiriannya tercantum secara tegas di dalam UUD 1945, kecuali...","Karakter pergaulan masyarakat yang cenderung berorientasi pada hierarki atas, menjunjung tinggi relasi formal, serta berwatak impersonal merefleksikan etos kebu"],
    breakdown: [{"category":"TWK","count":30},{"category":"TIU","count":35},{"category":"TKP","count":45}],
  },
  "tryout-mini": {
    topics: ["Pilar Negara","Nasionalisme","Orientasi Pelayanan","Bahasa Indonesia","Penalaran Induktif","Integritas","Verbal Antonim","Verbal Sinonim","Penalaran Kuantitatif","Verbal Analogi","Numerik - Soal Cerita","Pola Spasial","Figural Serial","Figural Analogi","Integritas Diri","Semangat Berprestasi","Kemauan Belajar","Kepemimpinan","Kerjasama Tim","Kemampuan Adaptasi","Bekerja Mandiri"],
    samples: ["Paham yang memandang kebudayaan dan kelompok sendiri lebih unggul dibanding kelompok lain sehingga menjadi ancaman bagi integrasi dan nasionalisme bangsa disebu","Dalam pidato 1 Juni 1945 di sidang BPUPKI, Ir. Soekarno menegaskan bahwa nasionalisme Indonesia tidak boleh terjebak dalam chauvinisme, melainkan harus berlanda","Seorang pejabat publik mengembalikan cinderamata berupa barang mewah dari rekanan swasta setelah kunjungan dinas karena berpotensi memengaruhi netralitas jabata"],
    breakdown: [{"category":"TWK","count":10},{"category":"TIU","count":10},{"category":"TKP","count":10}],
  },
  "tryout-figural": {
    topics: ["Figural"],
    samples: ["Perhatikan gambar di bawah ini. Carilah pasangan gambar yang memiliki hubungan sama dengan pasangan gambar sebelumnya.","Perhatikan gambar di bawah ini. Carilah pasangan gambar yang memiliki hubungan sama dengan pasangan gambar sebelumnya.","Perhatikan gambar di bawah ini. Carilah pasangan gambar yang memiliki hubungan sama dengan pasangan gambar sebelumnya."],
    breakdown: [{"category":"TIU","count":46}],
  },
  "tryout-figural-2": {
    topics: ["Figural"],
    samples: ["Tentukan satu gambar yang tidak mempunyai persamaan dengan gambar-gambar lainnya, atau tentukan kelanjutan pola gambar.","Tentukan satu gambar yang tidak mempunyai persamaan dengan gambar-gambar lainnya, atau tentukan kelanjutan pola gambar.","Tentukan satu gambar yang tidak mempunyai persamaan dengan gambar-gambar lainnya, atau tentukan kelanjutan pola gambar."],
    breakdown: [{"category":"TIU","count":82}],
  },
};
