import json
import sys
from pathlib import Path

# --- TWK DATA (30 unique questions across 6 subcategories) ---
TWK_DATA = [
    # 1. Nasionalisme
    (
        "Nasionalisme",
        "Seorang PNS menemukan rekan kerjanya menyebarkan konten yang merendahkan suku tertentu di media sosial kantor. Tindakan yang paling tepat adalah...",
        [
            ("A", "Menegur secara langsung dengan sopan dan melaporkan ke atasan atau bagian kepatuhan", 5),
            ("B", "Membiarkan karena hal tersebut merupakan hak berpendapat di media sosial pribadi", 0),
            ("C", "Ikut menyebarkan konten tersebut sebagai bahan diskusi di grup kantor", 0),
            ("D", "Memblokir akun rekan tersebut tanpa melakukan langkah pembinaan apapun", 0),
            ("E", "Mengunggah konten balasan yang menyerang suku rekan kerja tersebut", 0),
        ],
        "Pembahasan: Nasionalisme menuntut penghormatan terhadap keberagaman dan penegakan etika berbangsa di lingkungan kerja ASN."
    ),
    (
        "Nasionalisme",
        "Dalam rangka memperkuat rasa cinta tanah air di kalangan generasi muda, kebijakan institusi pemerintah yang paling relevan adalah...",
        [
            ("A", "Mengembangkan program magang kebangsaan dan apresiasi karya inovasi anak bangsa", 5),
            ("B", "Mewajibkan hafalan seluruh pasal undang-undang bagi seluruh siswa sekolah", 0),
            ("C", "Membatasi akses informasi dari media massa luar negeri secara total", 0),
            ("D", "Mengharuskan pemakaian pakaian adat setiap hari kerja tanpa pengecualian", 0),
            ("E", "Memberikan bantuan tunai langsung tanpa pendampingan wawasan kebangsaan", 0),
        ],
        "Pembahasan: Kebijakan substantif yang menumbuhkan karya nyata memperkokoh rasa cinta tanah air secara berkelanjutan."
    ),
    (
        "Nasionalisme",
        "Sikap yang mencerminkan paham kebangsaan terbuka dalam era globalisasi adalah...",
        [
            ("A", "Menyaring pengaruh budaya asing dengan berlandaskan nilai-nilai luhur Pancasila", 5),
            ("B", "Menolak seluruh bentuk kerjasama ekonomi dengan negara-negara berkembang", 0),
            ("C", "Mengadopsi seluruh gaya hidup modern barat demi percepatan pembangunan bangsa", 0),
            ("D", "Menutup perbatasan wilayah bagi semua tenaga kerja ahli dari mancanegara", 0),
            ("E", "Menghapus kurikulum bahasa daerah agar fokus pada penguasaan bahasa internasional", 0),
        ],
        "Pembahasan: Nasionalisme Indonesia bersifat terbuka dan adaptif tanpa meninggalkan kepribadian bangsa."
    ),
    (
        "Nasionalisme",
        "Sebagai aparatur sipil negara di daerah perbatasan, tindakan konkret menjaga kedaulatan bangsa adalah...",
        [
            ("A", "Memberikan pelayanan publik prima dan meningkatkan kesejahteraan warga perbatasan", 5),
            ("B", "Menyerahkan pengawasan wilayah perbatasan sepenuhnya kepada pemerintah pusat", 0),
            ("C", "Menolak alokasi dana pembangunan infrastruktur desa demi penghematan anggaran", 0),
            ("D", "Membatasi interaksi perdagangan warga lokal dengan warga negara tetangga secara sepihak", 0),
            ("E", "Membiarkan pos lintas batas dikelola oleh kelompok swasta tanpa pengawasan", 0),
        ],
        "Pembahasan: Pelayanan prima di beranda terdepan memperkuat ikatan kebangsaan dan kedaulatan NKRI."
    ),
    (
        "Nasionalisme",
        "Upaya pelestarian warisan budaya nusantara di era digital yang paling efektif oleh ASN adalah...",
        [
            ("A", "Mendokumentasikan kearifan lokal dalam platform digital interaktif multi-bahasa", 5),
            ("B", "Melarang pertunjukan seni modern di fasilitas milik instansi pemerintah", 0),
            ("C", "Menyimpan seluruh arsip kebudayaan hanya di perpustakaan fisik daerah", 0),
            ("D", "Menuntut hak paten atas setiap ritual adat tanpa melibatkan masyarakat lokal", 0),
            ("E", "Menyerahkan promosi pariwisata daerah seutuhnya kepada agen perjalanan komersial", 0),
        ],
        "Pembahasan: Digitalisasi kearifan lokal memperluas jangkauan dan memperkuat ketahanan budaya bangsa."
    ),

    # 2. Integritas
    (
        "Integritas",
        "Anda ditawari sejumlah uang oleh seorang warga agar berkas izin usahanya disetujui lebih cepat dari jadwal resmi. Sikap Anda adalah...",
        [
            ("A", "Menolak dengan tegas dan menjelaskan alur pelayanan sesuai SOP yang berlaku", 5),
            ("B", "Menerima uang tersebut tetapi tetap memproses izin sesuai antrean normal", 0),
            ("C", "Menerima uang dan membagikannya kepada rekan kerja satu divisi", 0),
            ("D", "Menunda berkas pemohon tersebut sebagai bentuk sanksi tidak resmi", 0),
            ("E", "Meminta pemohon melipatgandakan jumlah uang demi dana sosial kantor", 0),
        ],
        "Pembahasan: Integritas mensyaratkan penolakan gratifikasi dan komitmen penuh pada prosedur resmi."
    ),
    (
        "Integritas",
        "Ketika menyusun laporan keuangan kegiatan dinas, atasan meminta Anda memasukkan nota fiktif untuk menutupi defisit pos lain. Sikap Anda adalah...",
        [
            ("A", "Menolak perintah tersebut secara santun dan menyampaikan risiko hukum pelaporan palsu", 5),
            ("B", "Mengikuti perintah atasan demi menjaga keharmonisan hubungan kerja", 0),
            ("C", "Mengundurkan diri langsung dari instansi tanpa memberikan klarifikasi", 0),
            ("D", "Membuat nota fiktif namun mencatatnya di buku catatan pribadi sebagai bukti", 0),
            ("E", "Menyebarkan nota tersebut ke media sosial tanpa konfirmasi internal", 0),
        ],
        "Pembahasan: ASN berintegritas wajib menolak manipulasi akuntansi dan berpegang pada transparansi fiskal."
    ),
    (
        "Integritas",
        "Seorang rekan kerja sering menggunakan kendaraan dinas kantor untuk keperluan liburan keluarga setiap akhir pekan. Tindakan Anda adalah...",
        [
            ("A", "Mengingatkan rekan tersebut mengenai aturan penggunaan aset negara dan melapor jika berulang", 5),
            ("B", "Meminjam kendaraan tersebut juga agar mendapat perlakuan setara", 0),
            ("C", "Menyembunyikan kunci kendaraan dinas tanpa berkoordinasi dengan pengelola aset", 0),
            ("D", "Mendiamkan hal itu karena bukan tanggung jawab langsung jabatan Anda", 0),
            ("E", "Memfoto secara diam-diam dan memeras rekan tersebut demi keuntungan pribadi", 0),
        ],
        "Pembahasan: Pengelolaan fasilitas negara harus akuntabel dan bebas dari penyalahgunaan kepentingan pribadi."
    ),
    (
        "Integritas",
        "Saat pelaksanaan seleksi pengadaan barang dan jasa, kerabat dekat Anda mendaftar sebagai peserta lelang. Tindakan Anda adalah...",
        [
            ("A", "Menyatakan potensi benturan kepentingan dan mengundurkan diri dari tim penilai lelang", 5),
            ("B", "Membocorkan spesifikasi teknis penawaran pesaing kepada kerabat Anda", 0),
            ("C", "Memberikan nilai tertinggi kepada kerabat demi menjaga nama baik keluarga", 0),
            ("D", "Menggugurkan penawaran kerabat tanpa memeriksa dokumen kelayakannya", 0),
            ("E", "Meminta komisi khusus apabila kerabat Anda memenangkan tender proyek", 0),
        ],
        "Pembahasan: Deklarasi benturan kepentingan merupakan kewajiban etis mendasar untuk mencegah korupsi."
    ),
    (
        "Integritas",
        "Nilai kejujuran dalam pelayanan publik paling nyata tercermin dalam perilaku...",
        [
            ("A", "Menyampaikan informasi persyaratan perizinan secara transparan tanpa pungutan liar", 5),
            ("B", "Menjanjikan kemudahan pelayanan hanya kepada warga yang dikenal baik", 0),
            ("C", "Menolak melayani warga yang menyampaikan keluhan atas lambatnya birokrasi", 0),
            ("D", "Mengalihkan tanggung jawab pekerjaan sendiri kepada pegawai honorer", 0),
            ("E", "Mengumumkan nama wajib pajak yang belum membayar di papan pengumuman terbuka", 0),
        ],
        "Pembahasan: Kejujuran pelayanan diwujudkan lewat kepastian tarif, waktu, dan syarat tanpa pungutan ilegal."
    ),

    # 3. Bela Negara
    (
        "Bela Negara",
        "Bentuk kesadaran bela negara yang paling mendasar bagi seorang tenaga kesehatan di daerah terpencil adalah...",
        [
            ("A", "Menjalankan tugas medis dengan dedikasi tinggi demi keselamatan jiwa masyarakat", 5),
            ("B", "Mengajukan mutasi tugas ke kota besar sesegera mungkin setelah ditempatkan", 0),
            ("C", "Mengharuskan warga membayar biaya pengobatan darurat di muka sebelum tindakan", 0),
            ("D", "Menolak merawat pasien yang tidak memiliki dokumen kependudukan lengkap", 0),
            ("E", "Menghentikan operasional puskesmas pada hari-hari pasar tradisional", 0),
        ],
        "Pembahasan: Bela negara bagi profesi diwujudkan melalui pengabdian tulus sesuai keahlian demi ketahanan nasional."
    ),
    (
        "Bela Negara",
        "Unsur dasar bela negara yang diwujudkan melalui kerelaan berkorban demi bangsa dan negara terlihat pada...",
        [
            ("A", "ASN yang bersedia bertugas lembur tanpa pamrih saat penanganan darurat bencana alam", 5),
            ("B", "Pegawai yang hanya bekerja bila dijanjikan insentif lembur tambahan oleh pimpinan", 0),
            ("C", "Warga yang menghindar dari kegiatan kerja bakti lingkungan di permukimannya", 0),
            ("D", "Pejabat yang mengutamakan perjalanan dinas luar negeri daripada tugas pelayanan", 0),
            ("E", "Pengusaha yang menimbun bahan pangan saat terjadi krisis pasokan logistik", 0),
        ],
        "Pembahasan: Kerelaan berkorban waktu dan tenaga saat krisis kemanusiaan merupakan bukti nyata bela negara."
    ),
    (
        "Bela Negara",
        "Dalam menghadapi ancaman non-militer berupa penyebaran informasi hoaks yang memecah belah persatuan, tindakan bela negara yang tepat adalah...",
        [
            ("A", "Melakukan verifikasi fakta sumber informasi sebelum membagikan ke ruang publik", 5),
            ("B", "Langsung meneruskan setiap pesan berantai demi memicu kehati-hatian publik", 0),
            ("C", "Menghapus akun media sosial dan menghentikan interaksi dengan masyarakat", 0),
            ("D", "Mendukung narasi hoaks selama menguntungkan kelompok organisasi sendiri", 0),
            ("E", "Membayar buzzer untuk membalas provokasi dengan narasi yang lebih emosional", 0),
        ],
        "Pembahasan: Literasi digital dan verifikasi kebenaran informasi menjaga ketahanan ideologi dan kohesi sosial."
    ),
    (
        "Bela Negara",
        "Landasan hukum kewajiban setiap warga negara ikut serta dalam upaya pembelaan negara diatur dalam UUD 1945 pasal...",
        [
            ("A", "Pasal 27 ayat (3)", 5),
            ("B", "Pasal 29 ayat (2)", 0),
            ("C", "Pasal 31 ayat (1)", 0),
            ("D", "Pasal 33 ayat (2)", 0),
            ("E", "Pasal 34 ayat (1)", 0),
        ],
        "Pembahasan: Pasal 27 ayat (3) UUD 1945 menyatakan setiap warga negara berhak dan wajib ikut serta dalam pembelaan negara."
    ),
    (
        "Bela Negara",
        "Sikap menjaga kedaulatan ekonomi nasional sebagai wujud cinta produk dalam negeri diwujudkan dengan...",
        [
            ("A", "Memprioritaskan pengadaan barang instansi dari produsen UMKM lokal bersertifikasi", 5),
            ("B", "Mengimpor seluruh perabot kantor dari merek ternama luar negeri demi prestise", 0),
            ("C", "Memaksa pelaku UMKM menjual produknya di bawah harga pokok produksi", 0),
            ("D", "Menolak sertifikasi mutu internasional bagi produk kerajinan nusantara", 0),
            ("E", "Menetapkan pajak ganda khusus bagi pedagang pasar tradisional daerah", 0),
        ],
        "Pembahasan: Pengutamaan produk domestik menguatkan fondasi kemandirian ekonomi bangsa."
    ),

    # 4. Pilar Negara (Pancasila)
    (
        "Pilar Negara (Pancasila)",
        "Sila pertama Pancasila, 'Ketuhanan Yang Maha Esa', memberikan jaminan konstitusional bahwa negara...",
        [
            ("A", "Menjamin kemerdekaan tiap-tiap penduduk memeluk agama dan beribadat menurut agamanya", 5),
            ("B", "Menetapkan satu agama resmi tunggal yang wajib dipatuhi seluruh warga negara", 0),
            ("C", "Menyerahkan urusan toleransi beragama sepenuhnya pada hukum adat setempat", 0),
            ("D", "Melarang perayaan hari besar keagamaan di ruang publik demi netralitas aparatur", 0),
            ("E", "Mengharuskan pendirian rumah ibadah mendapat persetujuan seratus persen warga desa", 0),
        ],
        "Pembahasan: Sila pertama menegaskan kebebasan beragama dan toleransi antarumat beragama tanpa diskriminasi."
    ),
    (
        "Pilar Negara (Pancasila)",
        "Pengamalan sila kedua Pancasila dalam pergaulan lingkungan kerja birokrasi dicontohkan dengan...",
        [
            ("A", "Memperlakukan semua rekan kerja secara adil dan bermartabat tanpa diskriminasi gender", 5),
            ("B", "Memberikan hak istimewa cuti kerja hanya kepada staf dengan hubungan kekerabatan", 0),
            ("C", "Menolak berkomunikasi dengan staf bawahan di luar jam kerja kedinasan", 0),
            ("D", "Mengabaikan hak jaminan kesehatan bagi pekerja kontrak di kantor pemerintah", 0),
            ("E", "Mengutamakan promosi jabatan berdasarkan kesamaan suku asal daerah pimpinan", 0),
        ],
        "Pembahasan: Kemanusiaan yang adil dan beradab mewajibkan penghormatan martabat sesama manusia."
    ),
    (
        "Pilar Negara (Pancasila)",
        "Sikap musyawarah untuk mencapai mufakat dalam pengambilan keputusan bersama merupakan implementasi dari sila...",
        [
            ("A", "Keempat Pancasila", 5),
            ("B", "Pertama Pancasila", 0),
            ("C", "Kedua Pancasila", 0),
            ("D", "Ketiga Pancasila", 0),
            ("E", "Kelima Pancasila", 0),
        ],
        "Pembahasan: Sila keempat menekankan kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan."
    ),
    (
        "Pilar Negara (Pancasila)",
        "Keadilan sosial bagi seluruh rakyat Indonesia (sila kelima) dalam alokasi anggaran daerah diwujudkan melalui...",
        [
            ("A", "Pemerataan pembangunan sarana pendidikan dan kesehatan hingga ke pelosok desa", 5),
            ("B", "Pemusatan pembangunan fasilitas mewah hanya di kawasan perumahan elit ibu kota", 0),
            ("C", "Pemberian subsidi listrik hanya kepada industri skala multinasional besar", 0),
            ("D", "Penghentian bantuan operasional sekolah bagi daerah tertinggal dan terpencil", 0),
            ("E", "Penetapan tarif retribusi kesehatan yang sama tanpa memandang tingkat ekonomi warga", 0),
        ],
        "Pembahasan: Keadilan sosial menuntut alokasi sumber daya yang merata guna mengentaskan ketimpangan."
    ),
    (
        "Pilar Negara (Pancasila)",
        "Pancasila sebagai ideologi terbuka memiliki arti bahwa nilai-nilai dasarnya bersifat tetap, namun...",
        [
            ("A", "Penerapannya dapat berkembang dan disesuaikan dengan dinamika perkembangan zaman", 5),
            ("B", "Isi sila-silanya dapat diubah setiap pergantian kepemimpinan nasional", 0),
            ("C", "Dapat digantikan dengan ideologi lain apabila disetujui referendum rakyat", 0),
            ("D", "Hanya berlaku efektif ketika negara berada dalam kondisi darurat militer", 0),
            ("E", "Menyesuaikan sepenuhnya dengan tuntutan liberalisme pasar modal bebas", 0),
        ],
        "Pembahasan: Ideologi terbuka fleksibel dalam aktualisasi dan operasionalisasi tanpa mengubah nilai intinya."
    ),

    # 5. Pilar Negara (UUD 1945)
    (
        "Pilar Negara (UUD 1945)",
        "Berdasarkan Pasal 1 ayat (2) UUD 1945 setelah amandemen, kedaulatan berada di tangan rakyat dan...",
        [
            ("A", "Dilaksanakan menurut Undang-Undang Dasar", 5),
            ("B", "Dilakukan sepenuhnya oleh Majelis Permusyawaratan Rakyat", 0),
            ("C", "Diserahkan mandatnya kepada Presiden sebagai kepala negara", 0),
            ("D", "Dijalankan oleh Dewan Perwakilan Rakyat bersama Mahkamah Agung", 0),
            ("E", "Dikoordinasikan oleh menteri koordinator bidang politik dan hukum", 0),
        ],
        "Pembahasan: Pasal 1 ayat (2) hasil amandemen menegaskan kedaulatan rakyat dilaksanakan menurut UUD."
    ),
    (
        "Pilar Negara (UUD 1945)",
        "Lembaga negara yang berwenang menguji undang-undang terhadap UUD 1945 adalah...",
        [
            ("A", "Mahkamah Konstitusi", 5),
            ("B", "Mahkamah Agung", 0),
            ("C", "Komisi Yudisial", 0),
            ("D", "Dewan Perwakilan Daerah", 0),
            ("E", "Badan Pemeriksa Keuangan", 0),
        ],
        "Pembahasan: Berdasarkan Pasal 24C UUD 1945, Mahkamah Konstitusi berwenang menguji UU terhadap UUD."
    ),
    (
        "Pilar Negara (UUD 1945)",
        "Hak DPR untuk meminta keterangan kepada pemerintah mengenai kebijakan pemerintah yang penting dan strategis disebut hak...",
        [
            ("A", "Interpelasi", 5),
            ("B", "Angket", 0),
            ("C", "Menyatakan Pendapat", 0),
            ("D", "Imunitas", 0),
            ("E", "Petisi", 0),
        ],
        "Pembahasan: Hak interpelasi adalah hak DPR meminta keterangan kepada pemerintah mengenai kebijakan berdampak luas."
    ),
    (
        "Pilar Negara (UUD 1945)",
        "Sesuai Pasal 33 ayat (3) UUD 1945, bumi dan air dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan...",
        [
            ("A", "Dipergunakan untuk sebesar-besar kemakmuran rakyat", 5),
            ("B", "Dikelola oleh perusahaan konglomerasi swasta pemegang konsesi", 0),
            ("C", "Diekspor langsung demi mendongkrak devisa valuta asing negara", 0),
            ("D", "Diserahkan penguasaannya kepada investor asing berkapitalisasi kuat", 0),
            ("E", "Disimpan sebagai cadangan aset tanpa dimanfaatkan untuk publik", 0),
        ],
        "Pembahasan: Amanat Pasal 33 ayat (3) UUD 1945 adalah sebesar-besar kemakmuran rakyat Indonesia."
    ),
    (
        "Pilar Negara (UUD 1945)",
        "Syarat perubahan pasal-pasal dalam UUD 1945 sesuai Pasal 37 mensyaratkan sidang MPR dihadiri oleh sekurang-kurangnya...",
        [
            ("A", "2/3 dari jumlah anggota MPR", 5),
            ("B", "1/2 dari jumlah anggota MPR ditambah satu", 0),
            ("C", "3/4 dari jumlah anggota MPR", 0),
            ("D", "Seluruh anggota DPR tanpa melibatkan DPD", 0),
            ("E", "Suara bulat 100% dari seluruh anggota MPR", 0),
        ],
        "Pembahasan: Pasal 37 ayat (3) UUD 1945 mensyaratkan sidang perubahan pasal dihadiri sekurang-kurangnya 2/3 anggota MPR."
    ),

    # 6. Bahasa Indonesia
    (
        "Bahasa Indonesia",
        "Penulisan kata serapan yang sesuai dengan pedoman baku bahasa Indonesia adalah...",
        [
            ("A", "Standardisasi dan efektivitas", 5),
            ("B", "Standarisasi dan efektifitas", 0),
            ("C", "Standardisasie dan efektiviti", 0),
            ("D", "Standardize dan effectivity", 0),
            ("E", "Setandarisasi dan epektipitas", 0),
        ],
        "Pembahasan: Bentuk baku menurut KBBI dan EYD adalah standardisasi dan efektivitas."
    ),
    (
        "Bahasa Indonesia",
        "Kalimat berikut yang memenuhi syarat sebagai kalimat efektif adalah...",
        [
            ("A", "Pemerintah mencanangkan program percepatan penurunan angka stunting di pedesaan.", 5),
            ("B", "Bagi seluruh para peserta daripada lokakarya diharap segera masuk ruangan.", 0),
            ("C", "Soal perizinan itu belum kami selesaikan karena disebabkan kekurangan data.", 0),
            ("D", "Buku tersebut saya telah membacanya sampai selesai di perpustakaan kota.", 0),
            ("E", "Kepada pimpinan rapat waktu dan tempat kami persilakan dengan hormat.", 0),
        ],
        "Pembahasan: Opsi A hemat kata, lugas, tidak rancu, dan memiliki struktur subjek-predikat yang gramatikal."
    ),
    (
        "Bahasa Indonesia",
        "Makna ungkapan 'rendah hati' dalam kalimat 'Meskipun menjabat sebagai direktur, beliau tetap rendah hati' adalah...",
        [
            ("A", "Tidak sombong dan menghargai orang lain", 5),
            ("B", "Merasa tidak mampu memimpin organisasi", 0),
            ("C", "Sering merasa rendah diri di depan bawahan", 0),
            ("D", "Menyerahkan wewenang kepada staf lain", 0),
            ("E", "Tidak berani mengambil risiko pekerjaan", 0),
        ],
        "Pembahasan: Ungkapan 'rendah hati' bermakna tidak congkak atau tidak sombong."
    ),
    (
        "Bahasa Indonesia",
        "Penggunaan tanda baca titik dua (:) yang tepat terdapat pada kalimat...",
        [
            ("A", "Ibu membeli perabot dapur: wajan, panci, dan spatula.", 5),
            ("B", "Ibu membeli: wajan, panci, dan spatula.", 0),
            ("C", "Perabot dapur yang dibeli: adalah wajan, panci, dan spatula.", 0),
            ("D", "Wajan, panci, dan spatula: dibeli oleh Ibu.", 0),
            ("E", "Ibu: membeli wajan, panci, dan spatula.", 0),
        ],
        "Pembahasan: Tanda titik dua digunakan pada akhir pernyataan lengkap yang diikuti rincian."
    ),
    (
        "Bahasa Indonesia",
        "Ide pokok paragraf umumnya dapat ditemukan pada kalimat...",
        [
            ("A", "Utama yang terletak di awal atau akhir paragraf", 5),
            ("B", "Penjelas yang memuat angka dan persentase statistik", 0),
            ("C", "Semua kalimat tanpa membedakan peran fungsinya", 0),
            ("D", "Tanya retoris yang ditempatkan di tengah wacana", 0),
            ("E", "Kutipan langsung narasumber ahli di bagian lampiran", 0),
        ],
        "Pembahasan: Ide pokok terkandung dalam kalimat utama (deduktif di awal, induktif di akhir, atau campuran)."
    ),
]

# --- TIU DATA (35 unique questions across 7 subcategories, 5 per subcategory) ---
TIU_TEMPLATES = {
    "Verbal - Analogi": [
        (
            "BUKU : PERPUSTAKAAN = LUKISAN : ...",
            [("A", "Galeri", 5), ("B", "Toko", 0), ("C", "Gudang", 0), ("D", "Studio", 0), ("E", "Kanvas", 0)],
            "Pembahasan: Buku dipamerkan/disimpan di perpustakaan, sebagaimana lukisan dipamerkan di galeri."
        ),
        (
            "DOKTER : RUMAH SAKIT = GURU : ...",
            [("A", "Sekolah", 5), ("B", "Pustaka", 0), ("C", "Laboratorium", 0), ("D", "Kantor", 0), ("E", "Kantin", 0)],
            "Pembahasan: Dokter bekerja di rumah sakit, sebagaimana guru bekerja di sekolah."
        ),
        (
            "KENDARAAN : BENSIN = MANUSIA : ...",
            [("A", "Makanan", 5), ("B", "Oksigen", 0), ("C", "Pakaian", 0), ("D", "Tenaga", 0), ("E", "Rumah", 0)],
            "Pembahasan: Kendaraan membutuhkan bensin sebagai sumber energi, manusia membutuhkan makanan."
        ),
        (
            "API : PANAS = ES : ...",
            [("A", "Dingin", 5), ("B", "Beku", 0), ("C", "Cair", 0), ("D", "Salju", 0), ("E", "Kutub", 0)],
            "Pembahasan: Sifat inheren api adalah panas, sedangkan es bersifat dingin."
        ),
        (
            "PADI : PETANI = PUISI : ...",
            [("A", "Penyair", 5), ("B", "Novel", 0), ("C", "Percetakan", 0), ("D", "Kritikus", 0), ("E", "Pustakawan", 0)],
            "Pembahasan: Padi dihasilkan oleh petani, sebagaimana puisi dihasilkan oleh penyair."
        ),
    ],

    "Verbal - Silogisme": [
        (
            "Semua ASN wajib jujur. Budi adalah ASN. Maka...",
            [("A", "Budi wajib jujur", 5), ("B", "Budi belum tentu jujur", 0), ("C", "Orang jujur adalah Budi", 0), ("D", "Hanya Budi yang wajib jujur", 0), ("E", "Budi tidak perlu jujur", 0)],
            "Pembahasan: Menggunakan modus ponens: Semua A adalah B. C adalah A. Kesimpulan: C adalah B."
        ),
        (
            "Semua mamalia bernapas dengan paru-paru. Ikan paus adalah mamalia. Maka...",
            [("A", "Ikan paus bernapas dengan paru-paru", 5), ("B", "Semua yang bernapas dengan paru-paru adalah ikan paus", 0), ("C", "Ikan paus bernapas dengan insang", 0), ("D", "Sebagian mamalia bukan ikan paus", 0), ("E", "Tidak ada kesimpulan yang sah", 0)],
            "Pembahasan: Ikan paus termasuk kategori mamalia, sehingga bernapas dengan paru-paru."
        ),
        (
            "Semua siswa kelas XII lulus ujian. Sebagian siswa kelas XII melanjutkan ke perguruan tinggi. Maka...",
            [("A", "Sebagian siswa yang lulus ujian melanjutkan ke perguruan tinggi", 5), ("B", "Semua siswa yang lulus melanjutkan ke perguruan tinggi", 0), ("C", "Tidak ada siswa yang lulus yang kuliah", 0), ("D", "Siswa yang tidak lulus ujian melanjutkan ke perguruan tinggi", 0), ("E", "Perguruan tinggi hanya menerima kelas XII", 0)],
            "Pembahasan: Kesimpulan partikular: Sebagian siswa yang lulus ujian melanjutkan studi ke perguruan tinggi."
        ),
        (
            "Jika hari hujan lebat, maka jalanan protokol tergenang air. Hari ini jalanan protokol tidak tergenang air. Maka...",
            [("A", "Hari ini tidak hujan lebat", 5), ("B", "Hari ini hujan rintik-rintik", 0), ("C", "Kemarin jalanan tergenang air", 0), ("D", "Besok pasti hujan lebat", 0), ("E", "Saluran air bekerja maksimal", 0)],
            "Pembahasan: Modus tollens: P -> Q. ~Q. Kesimpulan: ~P (Hari ini tidak hujan lebat)."
        ),
        (
            "Semua dokter spesialis memiliki STR aktif. Tidak ada dokter magang yang memiliki STR aktif. Maka...",
            [("A", "Tidak ada dokter magang yang merupakan dokter spesialis", 5), ("B", "Semua dokter spesialis adalah dokter magang", 0), ("C", "Sebagian dokter magang memiliki STR aktif", 0), ("D", "Dokter spesialis tidak perlu STR aktif", 0), ("E", "Semua dokter adalah dokter magang", 0)],
            "Pembahasan: Dua himpunan terpisah: tidak ada dokter magang yang merupakan dokter spesialis."
        ),
    ],

    "Verbal - Analitis": [
        (
            "A duduk di sebelah kiri B. C duduk di sebelah kanan A tetapi di sebelah kiri B. Urutan duduk dari kiri ke kanan adalah...",
            [("A", "A - C - B", 5), ("B", "C - A - B", 0), ("C", "B - C - A", 0), ("D", "A - B - C", 0), ("E", "B - A - C", 0)],
            "Pembahasan: C berada di antara A dan B, sehingga urutannya adalah A - C - B."
        ),
        (
            "Doni lebih tinggi dari Eko. Eko lebih tinggi dari Fani. Siapakah yang paling tinggi di antara ketiganya?",
            [("A", "Doni", 5), ("B", "Eko", 0), ("C", "Fani", 0), ("D", "Doni dan Fani sama tinggi", 0), ("E", "Tidak dapat ditentukan", 0)],
            "Pembahasan: Doni > Eko > Fani, sehingga Doni adalah yang tertinggi."
        ),
        (
            "Buku merah lebih tebal dari buku biru. Buku kuning lebih tipis dari buku biru. Urutan buku dari yang paling tebal adalah...",
            [("A", "Merah, Biru, Kuning", 5), ("B", "Kuning, Biru, Merah", 0), ("C", "Biru, Merah, Kuning", 0), ("D", "Merah, Kuning, Biru", 0), ("E", "Biru, Kuning, Merah", 0)],
            "Pembahasan: Merah > Biru > Kuning."
        ),
        (
            "Kota P terletak di sebelah barat kota Q. Kota R terletak di sebelah timur kota Q. Kota yang terletak paling barat adalah...",
            [("A", "Kota P", 5), ("B", "Kota Q", 0), ("C", "Kota R", 0), ("D", "Kota P dan R", 0), ("E", "Kota Q dan R", 0)],
            "Pembahasan: Posisi barat ke timur: P - Q - R. P adalah yang paling barat."
        ),
        (
            "Dalam lomba lari, Andi finis sebelum Budi. Cici finis setelah Budi namun sebelum Dedi. Urutan finis pertama hingga keempat adalah...",
            [("A", "Andi, Budi, Cici, Dedi", 5), ("B", "Budi, Andi, Cici, Dedi", 0), ("C", "Andi, Cici, Budi, Dedi", 0), ("D", "Dedi, Cici, Budi, Andi", 0), ("E", "Cici, Andi, Budi, Dedi", 0)],
            "Pembahasan: Urutan finis: Andi -> Budi -> Cici -> Dedi."
        ),
    ],

    "Numerik - Berhitung": [
        (
            "Jika 3x + 5 = 20, maka nilai x adalah...",
            [("A", "5", 5), ("B", "3", 0), ("C", "4", 0), ("D", "6", 0), ("E", "7", 0)],
            "Pembahasan: 3x = 20 - 5 = 15 -> x = 5."
        ),
        (
            "Hasil dari 25% dari 400 ditambah 15 adalah...",
            [("A", "115", 5), ("B", "100", 0), ("C", "110", 0), ("D", "125", 0), ("E", "135", 0)],
            "Pembahasan: 25% x 400 = 100. 100 + 15 = 115."
        ),
        (
            "Nilai dari (1/2 + 3/4) x 8 adalah...",
            [("A", "10", 5), ("B", "8", 0), ("C", "12", 0), ("D", "6", 0), ("E", "14", 0)],
            "Pembahasan: 1/2 + 3/4 = 5/4. 5/4 x 8 = 10."
        ),
        (
            "Jika a = 4 dan b = 3, maka nilai dari a^2 - b^2 adalah...",
            [("A", "7", 5), ("B", "9", 0), ("C", "5", 0), ("D", "12", 0), ("E", "1", 0)],
            "Pembahasan: a^2 - b^2 = 16 - 9 = 7."
        ),
        (
            "Hasil dari akar kuadrat 144 ditambah 15 x 2 adalah...",
            [("A", "42", 5), ("B", "36", 0), ("C", "44", 0), ("D", "54", 0), ("E", "27", 0)],
            "Pembahasan: √144 = 12. 15 x 2 = 30. 12 + 30 = 42."
        ),
    ],

    "Numerik - Deret Angka": [
        (
            "2, 5, 10, 17, 26, ... Nilai suku berikutnya adalah...",
            [("A", "37", 5), ("B", "33", 0), ("C", "35", 0), ("D", "39", 0), ("E", "41", 0)],
            "Pembahasan: Pola selisih bertingkat: +3, +5, +7, +9, +11. 26 + 11 = 37."
        ),
        (
            "3, 6, 12, 24, 48, ... Nilai suku berikutnya adalah...",
            [("A", "96", 5), ("B", "72", 0), ("C", "84", 0), ("D", "108", 0), ("E", "120", 0)],
            "Pembahasan: Pola perkalian 2: 48 x 2 = 96."
        ),
        (
            "1, 4, 9, 16, 25, ... Nilai suku berikutnya adalah...",
            [("A", "36", 5), ("B", "30", 0), ("C", "32", 0), ("D", "49", 0), ("E", "40", 0)],
            "Pembahasan: Barisan kuadrat bilangan asli: 6^2 = 36."
        ),
        (
            "100, 95, 85, 70, 50, ... Nilai suku berikutnya adalah...",
            [("A", "25", 5), ("B", "30", 0), ("C", "20", 0), ("D", "35", 0), ("E", "15", 0)],
            "Pembahasan: Pengurangan bertingkat: -5, -10, -15, -20, -25. 50 - 25 = 25."
        ),
        (
            "5, 8, 14, 23, 35, ... Nilai suku berikutnya adalah...",
            [("A", "50", 5), ("B", "48", 0), ("C", "45", 0), ("D", "52", 0), ("E", "55", 0)],
            "Pembahasan: Pola selisih: +3, +6, +9, +12, +15. 35 + 15 = 50."
        ),
    ],

    "Numerik - Soal Cerita": [
        (
            "Mobil A berkecepatan 60 km/jam, mobil B 80 km/jam. Jika jarak kota 240 km, selisih waktu tempuh kedua mobil adalah...",
            [("A", "1 jam", 5), ("B", "30 menit", 0), ("C", "45 menit", 0), ("D", "1,5 jam", 0), ("E", "2 jam", 0)],
            "Pembahasan: Waktu A = 240/60 = 4 jam. Waktu B = 240/80 = 3 jam. Selisih = 4 - 3 = 1 jam."
        ),
        (
            "Sebuah toko memberi diskon 20% untuk kemeja seharga Rp150.000. Berapa harga yang harus dibayar pembeli?",
            [("A", "Rp120.000", 5), ("B", "Rp125.000", 0), ("C", "Rp130.000", 0), ("D", "Rp135.000", 0), ("E", "Rp110.000", 0)],
            "Pembahasan: Diskon = 20% x 150.000 = 30.000. Harga bayar = 150.000 - 30.000 = Rp120.000."
        ),
        (
            "Suatu pekerjaan dapat diselesaikan oleh 6 orang dalam 10 hari. Berapa hari pekerjaan selesai jika dikerjakan oleh 12 orang?",
            [("A", "5 hari", 5), ("B", "4 hari", 0), ("C", "6 hari", 0), ("D", "8 hari", 0), ("E", "3 hari", 0)],
            "Pembahasan: Perbandingan berbalik nilai: 6 x 10 = 12 x H -> H = 60 / 12 = 5 hari."
        ),
        (
            "Sebuah tangki air berkapasitas 500 liter diisi dengan debit kran 25 liter/menit. Waktu yang diperlukan hingga penuh adalah...",
            [("A", "20 menit", 5), ("B", "15 menit", 0), ("C", "25 menit", 0), ("D", "30 menit", 0), ("E", "10 menit", 0)],
            "Pembahasan: Waktu = Volume / Debit = 500 / 25 = 20 menit."
        ),
        (
            "Perbandingan uang Rina dan Rini adalah 3 : 5. Jika jumlah uang mereka Rp80.000, selisih uang mereka adalah...",
            [("A", "Rp20.000", 5), ("B", "Rp15.000", 0), ("C", "Rp25.000", 0), ("D", "Rp30.000", 0), ("E", "Rp10.000", 0)],
            "Pembahasan: Selisih = (5 - 3)/(5 + 3) x 80.000 = 2/8 x 80.000 = Rp20.000."
        ),
    ],

    "Figural - Ketidaksamaan": [
        (
            "Dari gambar pola berikut, gambar yang BERBEDA adalah...",
            [("A", "Gambar A (memiliki sudut tumpul tunggal, sementara yang lain lancip)", 5), ("B", "Gambar B", 0), ("C", "Gambar C", 0), ("D", "Gambar D", 0), ("E", "Gambar E", 0)],
            "Pembahasan: Objek A memiliki karakteristik sudut yang tidak konsisten dengan pola keempat figur lainnya."
        ),
        (
            "Manakah bentuk yang tidak memiliki simetri lipat di antara pilihan figur berikut?",
            [("A", "Trapesium sembarang", 5), ("B", "Persegi panjang", 0), ("C", "Segitiga sama kaki", 0), ("D", "Lingkaran", 0), ("E", "Belah ketupat", 0)],
            "Pembahasan: Trapesium sembarang tidak memiliki sumbu simetri lipat sama sekali."
        ),
        (
            "Berdasarkan orientasi perputaran jarum jam, manakah objek yang arah perputarannya berlawanan dengan objek lainnya?",
            [("A", "Objek 1 (berotasi berlawanan arah jarum jam / counter-clockwise)", 5), ("B", "Objek 2", 0), ("C", "Objek 3", 0), ("D", "Objek 4", 0), ("E", "Objek 5", 0)],
            "Pembahasan: Objek 1 berputar CCW sedangkan empat figur lainnya berputar searah jarum jam (CW)."
        ),
        (
            "Di antara kelompok bangun datar berikut, manakah bangun yang jumlah sisinya tidak genap?",
            [("A", "Pentagon (Segi lima beraturan)", 5), ("B", "Heksagon (Segi enam)", 0), ("C", "Oktagon (Segi delapan)", 0), ("D", "Bujur sangkar (Segi empat)", 0), ("E", "Dekagon (Segi sepuluh)", 0)],
            "Pembahasan: Pentagon memiliki 5 sisi (ganjil), sementara figur lainnya memiliki jumlah sisi genap."
        ),
        (
            "Berdasarkan pola susunan elemen titik dan garis, figur manakah yang menyimpang dari aturan pola matriks?",
            [("A", "Figur E (jumlah titik dalam lingkaran tidak sebanding dengan jumlah garis tepi)", 5), ("B", "Figur A", 0), ("C", "Figur B", 0), ("D", "Figur C", 0), ("E", "Figur D", 0)],
            "Pembahasan: Figur E menyimpang dari aturan relasi jumlah titik = jumlah sisi garis tepi."
        ),
    ],
}

# --- TKP DATA (Varied scenario per subcategory) ---
TKP_SCENARIOS = {
    "Pelayanan Publik": [
        (
            "Anda bertugas di loket perizinan saat antrean membeludak dan sistem jaringan pusat mendadak mengalami gangguan teknis. Sikap Anda menghadapi keluhan warga yang menunggu adalah...",
            [
                ("A", "Menyampaikan permohonan maaf dengan ramah, menjelaskan situasi gangguan, dan mencatat berkas secara manual agar warga tidak menunggu sia-sia", 5),
                ("B", "Meminta seluruh warga menunggu dengan tertib di ruang tunggu sampai perbaikan sistem oleh tim IT selesai", 4),
                ("C", "Melaporkan kendala server tersebut kepada pimpinan unit dan menunggu arahan lebih lanjut", 3),
                ("D", "Menutup loket sementara demi mencegah kesalahan input data manual", 2),
                ("E", "Menyalahkan pihak penyedia server eksternal atas kelambanan infrastruktur kantor", 1),
            ],
            "Pembahasan: Pelayanan publik menuntut empati, komunikasi santun, dan solusi alternatif nyata bagi pengguna layanan."
        ),
        (
            "Seorang pemohon lansia tampak kebingungan mengisi formulir digital pendaftaran di anjungan mandiri kantor pelayanan Anda. Sikap Anda adalah...",
            [
                ("A", "Mendekati beliau dengan hangat dan memandu pengisian formulir langkah demi langkah hingga tuntas", 5),
                ("B", "Mengarahkan beliau untuk meminta bantuan keluarga atau pengunjung lain di sampingnya", 4),
                ("C", "Menyarankan pemohon lansia tersebut datang kembali di hari lain saat ada pendamping", 3),
                ("D", "Meminta pemohon tetap mencoba mandiri sesuai instruksi tertulis di layar monitor", 2),
                ("E", "Mengabaikan karena setiap warga dituntut melek teknologi di era digitalisasi", 1),
            ],
            "Pembahasan: Layanan inklusif ramah kelompok rentan mencerminkan komitmen pelayanan prima aparatur negara."
        ),
    ],

    "Jejaring Kerja": [
        (
            "Instansi Anda sedang merancang program kolaborasi lintas sektoral bersama dinas lain, tetapi perwakilan dinas mitra lambat merespons koordinasi. Tindakan Anda adalah...",
            [
                ("A", "Menghubungi narahubung dinas mitra secara proaktif, mengidentifikasi kendala komunikasi, dan menawarkan jadwal pertemuan fleksibel", 5),
                ("B", "Mengirimkan surat teguran resmi bermaterai ke sekretariat instansi mitra tersebut", 4),
                ("C", "Melanjutkan program kerja instansi sendiri tanpa menunggu kontribusi dinas mitra", 3),
                ("D", "Mengadukan keterlambatan tersebut dalam rapat pimpinan antarinstansi kabupaten", 2),
                ("E", "Menghentikan rencana kerjasama dan mencari proyek internal baru", 1),
            ],
            "Pembahasan: Jejaring kerja efektif dibangun melalui komunikasi proaktif, kemitraan persuasif, dan orientasi solusi bersama."
        ),
        (
            "Dalam tim kerja ad-hoc lintas divisi, anggota tim memiliki perbedaan gaya kerja yang memicu kesalahpahaman target. Sikap Anda sebagai anggota tim adalah...",
            [
                ("A", "Menginisiasi forum koordinasi informal untuk menyelaraskan ekspektasi dan pembagian peran secara transparan", 5),
                ("B", "Fokus menyelesaikan porsi pekerjaan individu tanpa mencampuri divisi lain", 4),
                ("C", "Meminta ketua tim memberi instruksi kaku tanpa ruang diskusi", 3),
                ("D", "Menyampaikan sindiran di grup percakapan agar anggota yang pasif tersadar", 2),
                ("E", "Meminta pemindahan tugas ke kelompok kerja lain yang lebih satu frekuensi", 1),
            ],
            "Pembahasan: Sinergi jejaring kerja memerlukan inisiatif mediasi dan keselarasan visi antarpemangku kepentingan."
        ),
    ],

    "Sosial Budaya": [
        (
            "Anda baru saja ditempatkan di unit kerja daerah terpencil dengan tradisi adat musyawarah yang sangat kuat sebelum suatu program desa dijalankan. Sikap Anda adalah...",
            [
                ("A", "Sowan kepada tokoh adat setempat, mempelajari tata krama lokal, dan menyelaraskan program dinas dengan kearifan lokal", 5),
                ("B", "Langsung melaksanakan program sesuai petunjuk teknis kementerian tanpa perlu melibatkan tokoh desa", 4),
                ("C", "Menunggu instruksi pejabat camat sebelum melakukan interaksi dengan warga setempat", 3),
                ("D", "Menganggap tradisi musyawarah adat memperlambat tenggat waktu pencapaian target dinas", 2),
                ("E", "Menuntut warga beradaptasi dengan budaya birokrasi modern perkotaan yang cepat", 1),
            ],
            "Pembahasan: Kompetensi sosial budaya menuntut adaptabilitas tinggi dan penghormatan tulus terhadap kearifan lokal nusantara."
        ),
        (
            "Di kantor baru Anda terdapat staf dari beragam latar belakang agama dan etnis. Saat menjelang perayaan hari raya salah satu agama, tindakan Anda adalah...",
            [
                ("A", "Ikut membantu kelancaran persiapan teknis dan menggantikan jadwal piket jaga rekan yang sedang merayakan", 5),
                ("B", "Mengucapkan selamat hanya jika rekan kerja tersebut menyapa Anda terlebih dahulu", 4),
                ("C", "Memilih bersikap netral tanpa ikut campur pengaturan jadwal piket kantor", 3),
                ("D", "Memprotes pergeseran jadwal dinas yang dialihkan sementara waktu", 2),
                ("E", "Menolak bertukar jadwal tugas dengan rekan yang merayakan hari besar keagamaan", 1),
            ],
            "Pembahasan: Toleransi dan solidaritas tim yang majemuk menciptakan lingkungan kerja inklusif dan produktif."
        ),
    ],

    "Teknologi Informasi & Komunikasi": [
        (
            "Instansi Anda meluncurkan aplikasi pelayanan baru berbasis cloud, namun sebagian pegawai senior merasa kesulitan mengoperasikannya. Tindakan Anda adalah...",
            [
                ("A", "Membuat panduan ringkas visual dan mendampingi rekan senior saat praktik pengoperasian aplikasi dengan sabar", 5),
                ("B", "Menyarankan bagian kepegawaian memberikan pelatihan khusus di akhir pekan", 4),
                ("C", "Mengerjakan seluruh tugas input data rekan senior agar target instansi tidak terlambat", 3),
                ("D", "Membiarkan mereka belajar sendiri karena panduan manual sudah terlampir di aplikasi", 2),
                ("E", "Mengeluhkan lambatnya adaptasi rekan senior kepada pimpinan unit", 1),
            ],
            "Pembahasan: Pemanfaatan TIK yang berhasil melibatkan transfer pengetahuan kolaboratif dan asistensi berkelanjutan."
        ),
        (
            "Anda menemukan celah keamanan sederhana pada formulir pengaduan masyarakat di situs web instansi. Langkah yang Anda ambil adalah...",
            [
                ("A", "Mendokumentasikan temuan secara terperinci dan melaporkannya segera ke pengelola sistem IT internal secara rahasia", 5),
                ("B", "Mencoba mengeksploitasi celah tersebut untuk menguji seberapa parah kerentanannya", 4),
                ("C", "Menunggu rapat bulanan divisi untuk membahas temuan keamanan informasi tersebut", 3),
                ("D", "Mengunggah tangkapan layar bug tersebut ke komunitas media sosial programmer", 2),
                ("E", "Mendiamkannya karena pengamanan situs web merupakan wewenang pihak ketiga", 1),
            ],
            "Pembahasan: Kepekaan terhadap keamanan siber dan etika pelaporan kerentanan menunjukkan maturitas digital ASN."
        ),
    ],

    "Profesionalisme": [
        (
            "Menjelang batas akhir pengiriman laporan strategis triwulan, laptop pribadi Anda rusak sedangkan komputer kantor sedang dipakai rekan lain. Tindakan Anda adalah...",
            [
                ("A", "Meminjam perangkat cadangan divisi lain, memanfaatkan penyimpanan cloud, dan menuntaskan laporan tepat waktu", 5),
                ("B", "Meminta perpanjangan waktu pengiriman laporan kepada pimpinan dengan alasan musibah laptop", 4),
                ("C", "Menunggu hingga komputer kantor selesai digunakan oleh rekan kerja", 3),
                ("D", "Menyerahkan draf setengah jadi apa adanya kepada atasan langsung", 2),
                ("E", "Menyalahkan rekan kerja yang tidak mau berbagi fasilitas komputer kantor", 1),
            ],
            "Pembahasan: Sikap profesional berfokus pada akuntabilitas hasil kerja dan daya juang mengatasi kendala operasional."
        ),
        (
            "Anda mendapatkan tugas pekerjaan yang sangat rumit dan belum pernah Anda kerjakan sebelumnya dengan tenggat waktu ketat. Sikap Anda adalah...",
            [
                ("A", "Mempelajari regulasi terkait secara intensif, berkonsultasi dengan mentor/ahli, dan menyusun rencana kerja terukur", 5),
                ("B", "Menerima tugas tersebut namun meminta kelonggaran tenggat waktu sejak hari pertama", 4),
                ("C", "Melimpahkan sebagian besar beban tugas tersebut kepada pegawai honorer", 3),
                ("D", "Mengeluhkan kompleksitas tugas kepada rekan kerja satu ruangan", 2),
                ("E", "Menolak tugas tersebut secara halus karena merasa berada di luar deskripsi kerja awal", 1),
            ],
            "Pembahasan: Profesionalisme tercermin dari kesiapan belajar hal baru dan tanggung jawab terhadap penugasan organisasi."
        ),
    ],

    "Anti Radikalisme": [
        (
            "Dalam suatu seminar kedinasan, seorang pembicara tamu mulai menyisipkan narasi yang menentang konsensus Pancasila dan mendorong disintegrasi bangsa. Sikap Anda adalah...",
            [
                ("A", "Menyampaikan sanggahan argumentatif secara santun berbasis konstitusi dan melaporkan materi tersebut ke panitia penyelenggara", 5),
                ("B", "Memilih meninggalkan ruangan seminar secara diam-diam tanpa bersikap", 4),
                ("C", "Mendengarkan saja materi tersebut hingga selesai agar tidak memicu kegaduhan forum", 3),
                ("D", "Merekam video ceramah dan langsung menyebarkannya dengan provokasi di grup warga", 2),
                ("E", "Menyetujui sebagian pandangan narasumber bila relevan dengan kritik sosial", 1),
            ],
            "Pembahasan: Komitmen kebangsaan anti-radikalisme menuntut ketegasan menjaga pilar negara secara konstruktif dan prosedural."
        ),
        (
            "Anda mengamati salah satu bawahan mulai menarik diri dari pergaulan kantor dan kerap menyebarkan propaganda kebencian bernuansa intoleran di media sosial. Tindakan Anda adalah...",
            [
                ("A", "Melakukan dialog empat mata secara persuasif, mengingatkan sumpah janji ASN, dan berkoordinasi dengan bagian pembinaan kepegawaian", 5),
                ("B", "Membiarkannya selama pekerjaan teknis kedinasannya tetap selesai tepat waktu", 4),
                ("C", "Langsung memecat pegawai bersangkutan tanpa mekanisme klarifikasi internal", 3),
                ("D", "Mengucilkan pegawai tersebut dari seluruh kegiatan tim kantor", 2),
                ("E", "Ikut menyukai unggahannya di media sosial agar yang bersangkutan merasa dihargai", 1),
            ],
            "Pembahasan: Pencegahan radikalisme membutuhkan deteksi dini, dialog persuasif, dan mekanisme pembinaan kepegawaian berjenjang."
        ),
    ],
}


def generate_questions(output_file: str):
    questions = []

    # 1. TWK (30 questions, IDs 1..30)
    for i in range(1, 31):
        sub, text, options_data, explanation = TWK_DATA[i - 1]
        options = [{"id": opt_id, "text": opt_text, "score": score} for opt_id, opt_text, score in options_data]
        questions.append({
            "id": i,
            "category": "TWK",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): {text}",
            "options": options,
            "explanation": explanation
        })

    # 2. TIU (35 questions, IDs 31..65)
    tiu_subs = [
        "Verbal - Analogi",
        "Verbal - Silogisme",
        "Verbal - Analitis",
        "Numerik - Berhitung",
        "Numerik - Deret Angka",
        "Numerik - Soal Cerita",
        "Figural - Ketidaksamaan"
    ]

    for i in range(31, 66):
        sub_idx = (i - 31) % len(tiu_subs)
        sub = tiu_subs[sub_idx]
        variant_idx = (i - 31) // len(tiu_subs)
        text, options_data, explanation = TIU_TEMPLATES[sub][variant_idx]
        options = [{"id": opt_id, "text": opt_text, "score": score} for opt_id, opt_text, score in options_data]
        questions.append({
            "id": i,
            "category": "TIU",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): {text}",
            "options": options,
            "explanation": explanation
        })

    # 3. TKP (45 questions, IDs 66..110)
    tkp_subs = [
        "Pelayanan Publik",
        "Jejaring Kerja",
        "Sosial Budaya",
        "Teknologi Informasi & Komunikasi",
        "Profesionalisme",
        "Anti Radikalisme"
    ]

    for i in range(66, 111):
        sub_idx = (i - 66) % len(tkp_subs)
        sub = tkp_subs[sub_idx]
        scenarios = TKP_SCENARIOS[sub]
        scenario_idx = ((i - 66) // len(tkp_subs)) % len(scenarios)
        scenario_text, options_data, explanation = scenarios[scenario_idx]
        options = [{"id": opt_id, "text": opt_text, "score": score} for opt_id, opt_text, score in options_data]
        questions.append({
            "id": i,
            "category": "TKP",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): {scenario_text}",
            "options": options,
            "explanation": explanation
        })

    out = Path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(questions)} questions to {output_file}")


if __name__ == '__main__':
    output = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent.parent / 'src' / 'data' / 'sample_questions.json')
    generate_questions(output)
