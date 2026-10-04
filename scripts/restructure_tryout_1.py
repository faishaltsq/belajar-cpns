# -*- coding: utf-8 -*-
import json
import random
import re

random.seed(12345)

# 1. Load Fixed TWK (30 questions)
with open('C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/fixed_twk.json', 'r', encoding='utf-8') as f:
    twk_questions = json.load(f)

# 2. Load Fixed TIU (35 questions)
with open('C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/fixed_tiu.json', 'r', encoding='utf-8') as f:
    tiu_questions = json.load(f)

# 3. Load Existing 12 TKP questions from audit_tkp.json
with open('C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/audit_tkp.json', 'r', encoding='utf-8') as f:
    orig_tkp = json.load(f)

# We take the first 12 unique questions (indices 0 to 11)
existing_12 = orig_tkp[:12]

# Permute options in existing 12 questions so scores 1-5 are not always A=5, B=4, C=3, D=2, E=1
def shuffle_tkp_options(q, target_perm):
    """
    target_perm: a list of 5 integers, e.g. [3, 5, 2, 4, 1] representing scores for A, B, C, D, E
    """
    letters = ['A', 'B', 'C', 'D', 'E']
    opts_by_score = {o['score']: o['text'] for o in q['options']}
    new_options = []
    for l, score in zip(letters, target_perm):
        new_options.append({
            'id': l,
            'text': opts_by_score[score],
            'score': score
        })
    q['options'] = new_options
    return q

# Generate 45 diverse score permutations where each score (especially 5) is evenly distributed across A, B, C, D, E
# 45 questions / 5 letters = 9 times each letter has score 5
all_permutations = []
base_scores = [1, 2, 3, 4, 5]
for target_5_idx in range(5):
    for _ in range(9):
        rem = [s for s in base_scores if s != 5]
        random.shuffle(rem)
        perm = rem[:target_5_idx] + [5] + rem[target_5_idx:]
        all_permutations.append(perm)
random.shuffle(all_permutations)

# Shuffle options of the first 12
shuffled_12 = []
for i, q in enumerate(existing_12):
    q_num = 66 + i
    q['id'] = q_num
    q['text'] = re.sub(r'Soal nomor \d+', f'Soal nomor {q_num}', q['text'])
    shuffled_12.append(shuffle_tkp_options(q, all_permutations[i]))

# 4. Now define the 33 NEW TKP questions (Q78 to Q110)
new_33_raw = [
    {
        "subcat": "Pelayanan Publik",
        "text": "Seorang warga mengeluhkan adanya biaya legalisir fotokopi dokumen di instansi Anda, padahal spanduk resmi menyatakan semua pengurusan dokumen gratis. Warga tersebut mulai berbicara dengan nada tinggi dan memancing perhatian pengunjung lain di ruang pelayanan.",
        "options_by_score": {
            5: "Mengajak warga tersebut ke ruangan konsultasi khusus agar tenang, mendengarkan keluhannya dengan sabar, menjelaskan rincian kebijakan dengan transparan, dan mengecek petugas terkait bila ada indikasi pungli.",
            4: "Menjelaskan di tempat secara sopan bahwa pengurusan dokumen memang gratis namun fotokopi merupakan jasa pihak ketiga di luar instansi, sembari meminta maaf atas kesalahpahaman.",
            3: "Menyerahkan keluhan tersebut kepada bagian pengaduan masyarakat untuk dicatat sesuai alur resmi agar pelayanan loket utama tidak terhambat.",
            2: "Menunjukkan tulisan aturan di dinding dan meminta warga tersebut membaca kembali ketentuan sebelum meluapkan kemarahan di hadapan publik.",
            1: "Memanggil petugas keamanan untuk menertibkan warga tersebut karena dianggap telah mengganggu ketertiban umum di ruang pelayanan."
        },
        "explanation": "Pembahasan: Sikap pelayanan publik yang prima mengutamakan penanganan keluhan secara persuasif, menjaga kenyamanan publik dengan membawa ke ruang khusus, serta memberikan transparansi dan ketegasan integritas terkait biaya layanan."
    },
    {
        "subcat": "Jejaring Kerja",
        "text": "Saat menghadiri forum pameran inovasi pelayanan publik tingkat nasional, Anda bertemu pimpinan perusahaan rintisan teknologi (startup) yang memperkenalkan prototipe aplikasi cerdas yang sangat relevan untuk memecahkan kendala arsip digital di unit kerja Anda.",
        "options_by_score": {
            5: "Bertukar kontak profesional secara proaktif, mempelajari profil prototipe tersebut, dan menyusun draf usulan telaah awal untuk dipresentasikan kepada pimpinan sebagai opsi kemitraan resmi.",
            4: "Meminta proposal tertulis dari startup tersebut untuk disimpan sebagai referensi apabila di masa mendatang instansi membutuhkan kerja sama eksternal.",
            3: "Mengapresiasi karyanya dan menyarankan agar mereka mengikuti proses tender pengadaan resmi di portal instansi pemerintah saat pembukaan dibuka.",
            2: "Mendengarkan presentasinya secara sopan tetapi tidak menindaklanjuti karena menganggap inovasi internal kantor sudah cukup memadai.",
            1: "Menolak berdiskusi lebih lanjut karena khawatir dianggap memiliki konflik kepentingan dengan pihak swasta penyedia teknologi."
        },
        "explanation": "Pembahasan: Aspek jejaring kerja menuntut proaktif membangun relasi strategis yang berpotensi memberi nilai tambah bagi instansi melalui jalur dan prosedur yang akuntabel."
    },
    {
        "subcat": "Sosial Budaya",
        "text": "Rekan kerja baru di ruangan Anda berasal dari daerah yang memiliki budaya berbicara dengan nada lantang dan intonasi tegas. Beberapa staf senior merasa tersinggung dan menganggap perilaku tersebut tidak sopan dan memicu ketegangan lingkungan kerja.",
        "options_by_score": {
            5: "Menginisiasi obrolan santai di waktu istirahat untuk saling mengenal latar belakang budaya, membantu rekan baru memahami karakteristik komunikasi lokal, sekaligus mengedukasi rekan lain tentang keberagaman gaya bicara.",
            4: "Mendekati rekan baru tersebut secara pribadi dan menyarankan agar menurunkan volume suaranya saat berkomunikasi dengan rekan senior demi menjaga keharmonisan.",
            3: "Memilih tidak ikut campur dan membiarkan mereka saling beradaptasi seiring berjalannya waktu di tempat kerja.",
            2: "Menyampaikan sindiran halus dalam percakapan kerja agar rekan baru menyadari bahwa gaya bicaranya membuat orang lain tidak nyaman.",
            1: "Mendukung pendapat rekan senior dan meminta pimpinan memindahkan staf baru tersebut ke ruangan lain agar suasana tetap kondusif."
        },
        "explanation": "Pembahasan: Kompetensi sosial budaya memerlukan peran sebagai jembatan perekat kebangsaan, merangkul perbedaan latar belakang, dan menciptakan saling pengertian di lingkungan kerja yang majemuk."
    },
    {
        "subcat": "Teknologi Informasi & Komunikasi",
        "text": "Pimpinan instansi menginstruksikan implementasi platform manajemen proyek digital baru guna memantau capaian kinerja. Sejumlah staf senior mengeluhkan sistem ini rumit dan berencana tetap memakai pelaporan fisik berbasis kertas manual.",
        "options_by_score": {
            5: "Mempelajari fitur platform tersebut secara menyeluruh, lalu menawarkan diri untuk membimbing rekan senior secara bertahap dengan modul ringkas hingga mereka terbiasa menggunakan platform baru.",
            4: "Menyarankan kepada pimpinan untuk menyelenggarakan bimbingan teknis (bimtek) resmi dari vendor aplikasi agar seluruh staf mendapat pelatihan terstandar.",
            3: "Tetap menggunakan platform digital untuk porsi tugas mandiri sendiri tanpa mencampuri keputusan rekan kerja lain yang masih memakai kertas.",
            2: "Mengabaikan penolakan mereka dan mendesak pimpinan memberi teguran kepada siapa pun yang tidak menggunakan aplikasi baru.",
            1: "Ikut kembali menggunakan format kertas manual agar solidaritas tim tetap terjaga dan tidak menimbulkan perpecahan antargenerasi."
        },
        "explanation": "Pembahasan: Pemanfaatan TIK yang efektif mengedepankan kolaborasi, kesediaan berbagi ilmu, dan kemampuan mengedukasi rekan kerja secara persuasif demi kelancaran transformasi digital organisasi."
    },
    {
        "subcat": "Profesionalisme",
        "text": "Tepat pukul 16.30 saat Anda bersiap pulang untuk menghadiri acara syukuran keluarga, pimpinan mengumumkan ada instruksi mendadak dari kementerian pusat yang mewajibkan rekapitulasi data sektoral diserahkan malam ini sebelum pukul 22.00.",
        "options_by_score": {
            5: "Menghubungi keluarga untuk menyampaikan permohonan maaf atas keterlambatan, lalu segera bergabung bersama tim untuk membagi beban kerja rekapitulasi agar tuntas tepat waktu dengan kualitas terbaik.",
            4: "Menyelesaikan sebagian data yang menjadi tanggung jawab primer saya secepat mungkin, lalu meminta izin pulang lebih dulu dan menyerahkan sisanya ke rekan tim.",
            3: "Mengikuti instruksi lembur dengan rasa kesal karena merasa perencanaan atasan buruk dan merusak agenda pribadi yang telah terjadwal.",
            2: "Memohon dispensasi kepada pimpinan agar tidak perlu ikut lembur dengan alasan acara keluarga sudah direncanakan jauh-jauh hari.",
            1: "Langsung pulang diam-diam sebelum daftar presensi lembur dibagikan agar tidak terkena beban penugasan mendadak."
        },
        "explanation": "Pembahasan: Profesionalisme menuntut komitmen tinggi, mendahulukan kepentingan tugas kedinasan yang mendesak, serta menunjukkan tanggung jawab dan loyalitas terhadap institusi negara."
    },
    {
        "subcat": "Anti Radikalisme",
        "text": "Dalam grup percakapan WhatsApp kedinasan unit kerja, seorang rekan kerja aktif membagikan artikel dan video yang menolak sistem demokrasi serta mengajak pembangkangan terhadap ideologi Pancasila dengan dalih penegakan keadilan sosial.",
        "options_by_score": {
            5: "Mengingatkan rekan tersebut secara tegas namun santun di grup bahwa konten tersebut bertentangan dengan sumpah ASN dan Pancasila, lalu melaporkannya ke unit kepatuhan internal/atasan bila berulang.",
            4: "Menghubungi rekan tersebut melalui jalur pribadi untuk meminta menghapus kiriman tersebut agar tidak menimbulkan kegaduhan di lingkungan kerja.",
            3: "Memilih keluar dari grup WhatsApp dinas tersebut agar tidak terpengaruh oleh konten radikal dan menghindari polemik berkepanjangan.",
            2: "Mendiamkan saja unggahan tersebut karena menganggap itu adalah hak kebebasan berpendapat pribadi masing-masing individu.",
            1: "Ikut berdebat menggunakan kata-kata kasar dan menghakimi di grup WhatsApp sehingga menimbulkan permusuhan terbuka."
        },
        "explanation": "Pembahasan: Sikap anti radikalisme bagi ASN memerlukan ketegasan mempertahankan ideologi negara dan sumpah jabatan melalui mekanisme proporsional dan pelaporan sesuai aturan kedinasan."
    },
    {
        "subcat": "Integritas Diri",
        "text": "Seorang sahabat karib Anda di kantor meminta bantuan untuk melakukan presensi sidik jari (titip absen) karena kendaraannya mengalami mogok di jalan tol dan ia khawatir tunjangan kinerjanya dipotong pimpinan.",
        "options_by_score": {
            5: "Menolak permintaannya secara tegas namun penuh pengertian, menyarankan agar ia segera mengabari atasan langsung secara jujur mengenai kendala yang dialami dan menanggung konsekuensi regulasi.",
            4: "Menolak membantu titip absen dan menawarkan bantuan lain seperti memesankan bengkel derek atau kendaraan online agar ia bisa segera tiba.",
            3: "Mengabaikan pesan sahabat tersebut dan berpura-pura tidak membaca chat hingga jam presensi kerja berakhir.",
            2: "Membantunya melakukan presensi kali ini saja dengan syarat ia berjanji tidak akan mengulanginya lagi di kemudian hari.",
            1: "Langsung melakukan titip absen tanpa ragu sebagai bentuk solidaritas persahabatan sejati di tempat kerja."
        },
        "explanation": "Pembahasan: Integritas diri ASN tidak dapat dikompromikan oleh relasi personal atau rasa tidak enak hati. Kejujuran dan ketaatan pada aturan kedinasan adalah harga mati."
    },
    {
        "subcat": "Semangat Berprestasi",
        "text": "Instansi Anda membuka seleksi penerima beasiswa tugas belajar magister ke universitas luar negeri ternama dengan syarat kompetensi bahasa dan proposal riset yang sangat kompetitif. Beberapa rekan kerja menyarankan Anda tidak ikut karena persaingannya mustahil dimenangkan.",
        "options_by_score": {
            5: "Mempersiapkan diri secara intensif, menyusun draf proposal riset yang solutif bagi kemajuan instansi, berlatih tes bahasa secara teratur, dan optimis mengikuti proses seleksi secara maksimal.",
            4: "Mendaftar seleksi tersebut untuk sekadar mencari pengalaman tanpa menargetkan lolos atau gagal demi mengukur batas kemampuan.",
            3: "Berkonsultasi dengan alumni penerima beasiswa sebelumnya dan memutuskan mendaftar hanya jika syaratnya terasa sanggup dipenuhi.",
            2: "Mengurungkan niat mendaftar karena terpengaruh opini rekan kerja bahwa peluang kelulusan pegawai muda sangat minim.",
            1: "Merasa rendah diri dan mengkritik sistem beasiswa instansi yang dianggap hanya menguntungkan pihak-pihak tertentu."
        },
        "explanation": "Pembahasan: Semangat berprestasi dicirikan oleh orientasi pada tantangan tinggi, dorongan mengembangkan kapasitas diri secara berkelanjutan, dan ketekunan mengatasi hambatan mental."
    },
    {
        "subcat": "Kemampuan Beradaptasi",
        "text": "Akibat restrukturisasi organisasi pemerintah, unit kerja Anda dilebur dan Anda dipindahtugaskan ke subbagian baru yang menangani bidang kerja yang sama sekali berbeda dari latar belakang pendidikan dan pengalaman Anda sebelumnya.",
        "options_by_score": {
            5: "Menerima penugasan baru dengan antusias sebagai wahana belajar, segera memetakan regulasi serta alur kerja baru, dan aktif bertanya kepada rekan kerja senior untuk mempercepat penguasaan tugas.",
            4: "Mempelajari tugas baru secara mandiri perlahan-lahan sembari tetap menyesuaikan diri dengan kultur dan ritme kerja rekan di subbagian tersebut.",
            3: "Menjalankan tugas baru hanya sebatas arahan detail dari atasan tanpa berinisiatif mendalami pengetahuan di luar instruksi rutin.",
            2: "Mengajukan komplain kepada bagian kepegawaian karena merasa penempatan tersebut tidak linier dengan kualifikasi ijazah yang dimiliki.",
            1: "Bekerja dengan malas-malasan dan terus menuntut agar dikembalikan ke unit kerja lama yang lebih nyaman dan dikuasai."
        },
        "explanation": "Pembahasan: Kemampuan beradaptasi bagi ASN mencakup keterbukaan terhadap perubahan organisasi, fleksibilitas berpikir, dan kemauan belajar cepat pada situasi lingkungan yang asing."
    },
    {
        "subcat": "Pengendalian Diri",
        "text": "Dalam rapat pleno penyusunan program kerja, konsep inovasi pelayanan publik yang telah Anda siapkan berhari-hari dikritik secara pedas dan sinis oleh rekan dari divisi lain di depan seluruh pejabat struktural.",
        "options_by_score": {
            5: "Mendengarkan seluruh kritikan dengan kepala dingin, mencatat poin-poin substansi yang membangun, lalu meresponsnya secara objektif berbasis data tanpa terbawa emosi personal.",
            4: "Menahan diri dari membalas sindiran saat rapat, lalu mengajak rekan tersebut berdiskusi berdua seusai rapat untuk mengklarifikasi argumennya.",
            3: "Memilih diam dan pasrah tidak memberikan sanggahan apa pun karena merasa malu dan tersinggung di hadapan pimpinan rapat.",
            2: "Memotong pembicaraannya dan membalas kritikan tersebut dengan menyingkap kelemahan proyek divisi rekan tersebut di forum.",
            1: "Menunjukkan ekspresi marah, walk-out dari ruang rapat, dan menolak melanjutkan presentasi program kerja."
        },
        "explanation": "Pembahasan: Pengendalian diri mengukur stabilitas emosi, kematangan sikap dalam menghadapi provokasi atau kritikan, serta kemampuan mengutamakan substansi ketimbang ego pribadi."
    },
    {
        "subcat": "Pelayanan Publik",
        "text": "Seorang penyandang disabilitas pengguna kursi roda datang mengurus berkas pertanahan di kantor Anda. Sayangnya, kantor Anda berada di gedung lama yang belum memiliki jalur ramp khusus dan loket lantai bawah sedang penuh sesak.",
        "options_by_score": {
            5: "Turun langsung menghampiri beliau di lobi lantai satu, memfasilitasi pelayanan di tempat yang nyaman dan aksesibel, serta membantu proses verifikasi berkas hingga selesai tanpa menyulitkan pemohon.",
            4: "Meminta bantuan petugas keamanan untuk mengangkat kursi roda pemohon ke lantai dua tempat loket utama berada agar tetap sesuai alur standar.",
            3: "Menyarankan pemohon tersebut untuk mengurus berkas secara daring dari rumah atau menunggu keluarga pendamping datang membantu.",
            2: "Meminta pemohon menunggu sampai antrean lantai bawah berkurang sebelum memproses berkasnya sesuai nomor urut kedatangan.",
            1: "Meminta pemohon datang kembali minggu depan saat renovasi fasilitas jalur khusus disabilitas di kantor selesai dikerjakan."
        },
        "explanation": "Pembahasan: Pelayanan publik yang adil dan ramah disabilitas menuntut inisiatif jemput bola, empati, dan fleksibilitas prosedur demi pemenuhan hak kelompok rentan."
    },
    {
        "subcat": "Jejaring Kerja",
        "text": "Terjadi perselisihan kewenangan dan anggaran antara divisi Anda dengan dinas sektoral lain terkait pembagian tugas penanganan bencana daerah, yang mengakibatkan distribusi bantuan kemanusiaan tersendat di gudang logistik.",
        "options_by_score": {
            5: "Menginisiasi pertemuan koordinasi teknis terfokus dengan staf dinas mitra untuk menyepakati pembagian peran taktis darurat, mengutamakan keselamatan warga terdampak di atas sekat birokrasi.",
            4: "Mengusulkan kepada atasan Anda untuk menerbitkan nota kesepakatan bersama (MoU) kilat agar terdapat payung hukum formal yang mengikat.",
            3: "Mendistribusikan porsi bantuan yang menjadi wewenang resmi divisi sendiri tanpa menunggu kesiapan dari dinas sektoral yang berselisih.",
            2: "Menunggu instruksi tertulis dari sekretaris daerah untuk menetapkan siapa yang berhak mengambil komando distribusi bantuan.",
            1: "Saling melempar tanggung jawab dan menyalahkan dinas mitra di hadapan media massa atas lambatnya penyaluran logistik."
        },
        "explanation": "Pembahasan: Sinergi jejaring kerja berorientasi pada penyelesaian masalah bersama, mengesampingkan ego sektoral demi kemaslahatan publik dan misi pelayanan yang lebih luas."
    },
    {
        "subcat": "Sosial Budaya",
        "text": "Anda ditugaskan mendampingi pelaksanaan program posyandu terpadu di desa pedalaman. Sebagian warga menolak pemberian imunisasi anak karena percaya pada mitos setempat bahwa vaksin dapat menyebabkan kutukan leluhur.",
        "options_by_score": {
            5: "Melakukan pendekatan persuasif melalui sowan ke tokoh adat dan pemuka agama setempat, menjelaskan manfaat kesehatan vaksin dengan bahasa sederhana dan analogi budaya yang mudah diterima.",
            4: "Mengumpulkan ibu-ibu balita untuk diberikan penyuluhan ilmiah intensif tentang bahaya penyakit menular bila tidak divaksinasi.",
            3: "Melayani imunisasi hanya bagi warga yang bersedia secara sukarela tanpa memaksakan kepada keluarga yang masih menolak tradisi.",
            2: "Meminta bantuan aparat penegak hukum setempat untuk mendesak warga mematuhi instruksi program kesehatan nasional.",
            1: "Menyudahi kegiatan imunisasi lebih awal dan melaporkan kepada pimpinan bahwa warga desa setempat tidak bisa diedukasi secara medis."
        },
        "explanation": "Pembahasan: Pendekatan sosial budaya memerlukan kepekaan kearifan lokal, komunikasi kultural berbasis tokoh panutan, dan penghormatan terhadap keyakinan masyarakat dalam menyukseskan program pemerintah."
    },
    {
        "subcat": "Teknologi Informasi & Komunikasi",
        "text": "Salah satu komputer kerja di ruangan divisi Anda tiba-tiba menampilkan layar peringatan serangan ransomware dan beberapa berkas dokumen penting terkunci ekstensinya. Jika dibiarkan, virus ini berisiko menyebar ke seluruh server lokal kantor.",
        "options_by_score": {
            5: "Segera mencabut kabel jaringan internet/LAN dan memutus koneksi Wi-Fi komputer tersebut, lalu segera melaporkan insiden kepada tim pengelola IT instansi untuk mitigasi pengamanan menyeluruh.",
            4: "Mematikan komputer tersebut secara manual dan memperingatkan seluruh rekan satu ruangan agar berhati-hati membuka email mencurigakan.",
            3: "Mencoba mengunduh aplikasi antivirus gratisan dari internet untuk mencoba mendekripsi berkas yang terkena virus secara mandiri.",
            2: "Menunggu jam istirahat untuk mendatangi divisi IT di lantai lain guna menanyakan prosedur penanganan virus komputer kantor.",
            1: "Mencoba membuka berkas-berkas penting lainnya di komputer tersebut untuk mengecek seberapa banyak data yang belum rusak."
        },
        "explanation": "Pembahasan: Pemanfaatan TIK yang bertanggung jawab mencakup kesadaran keamanan informasi, respons cepat pencegahan penyebaran ancaman siber, dan eskalasi ke unit kompeten."
    },
    {
        "subcat": "Profesionalisme",
        "text": "Menjelang hari raya keagamaan, perwakilan perusahaan penyedia jasa yang proyek pengadaannya sedang Anda evaluasi kinerjanya mengirimkan parsel mewah berisi barang elektronik mahal langsung ke rumah pribadi Anda.",
        "options_by_score": {
            5: "Menolak pemberian tersebut secara santun, menjelaskan larangan penerimaan gratifikasi bagi ASN sesuai aturan KPK, dan melaporkan peristiwa tersebut kepada Unit Pengendalian Gratifikasi (UPG) instansi.",
            4: "Menerima kiriman tersebut agar tidak menyinggung perasaan mitra, namun menyerahkan barangnya ke panti asuhan atas nama instansi.",
            3: "Menyimpan parsel tersebut di kantor dan berencana mengembalikannya setelah proses evaluasi proyek selesai diputuskan.",
            2: "Menerima pemberian tersebut dengan pertimbangan hal itu murni tradisi silaturahmi hari raya tanpa ada perjanjian komitmen apa pun.",
            1: "Meminta vendor tersebut mengganti barang elektronik dengan uang tunai agar lebih fleksibel digunakan dan tidak mencolok."
        },
        "explanation": "Pembahasan: Profesionalisme ASN berlandaskan kepatuhan kode etik, penolakan tegas terhadap segala bentuk gratifikasi atau suap terselubung, dan pelaporan transparan pada unit pengawasan."
    },
    {
        "subcat": "Anti Radikalisme",
        "text": "Sebuah organisasi kemasyarakatan yang rekam jejaknya terafiliasi dengan penyebaran narasi intoleransi dan penolakan konsensus nasional mengajukan permohonan audiensi resmi dan permintaan dana hibah kemitraan ke kantor Anda.",
        "options_by_score": {
            5: "Memeriksa rekam jejak legalitas dan AD/ART organisasi tersebut secara cermat, berkoordinasi dengan badan kesatuan bangsa dan politik (Bakesbangpol), serta memberikan rekomendasi penolakan berbasis regulasi negara.",
            4: "Menolak surat permohonan tersebut secara sepihak tanpa memberikan alasan administratif resmi agar tidak menimbulkan perdebatan.",
            3: "Meneruskan permohonan tersebut ke meja atasan tanpa memberikan telaah catatan kritis apa pun terkait latar belakang organisasi.",
            2: "Menyetujui audiensi tersebut dengan harapan dapat memberikan pencerahan kepada ormas tersebut agar kembali mencintai NKRI.",
            1: "Mendukung pemberian dana hibah tersebut selama proposal kegiatan yang diajukan bertema bakti sosial kemasyarakatan."
        },
        "explanation": "Pembahasan: Kewaspadaan anti radikalisme menuntut ketelitian verifikasi administratif, koordinasi lintas lembaga intelijen/keamanan, serta kehati-hatian dalam mengalokasikan sumber daya negara."
    },
    {
        "subcat": "Integritas Diri",
        "text": "Saat menyusun rekapitulasi realisasi uang harian perjalanan dinas tim, Anda menemukan adanya kelebihan transfer anggaran ke rekening pribadi Anda sebesar Rp3.500.000 akibat kesalahan sistem bendahara yang tidak disadari pihak manapun.",
        "options_by_score": {
            5: "Segera mendatangi bendahara pengeluaran, menyampaikan bukti transfer kelebihan dana tersebut secara jujur, dan menyetorkannya kembali ke kas instansi sesuai bukti setoran resmi.",
            4: "Menghubungi bendahara via telepon untuk mengonfirmasi kelebihan dana dan bersedia mengembalikannya jika diminta oleh pihak keuangan.",
            3: "Mendiamkan dana tersebut di rekening tabungan dan baru akan mengembalikannya apabila ada temuan saat audit internal berlangsung.",
            2: "Menggunakan dana tersebut terlebih dahulu untuk kebutuhan pribadi mendesak dan berniat menggantinya saat gajian bulan depan.",
            1: "Menganggap kelebihan transfer tersebut sebagai rezeki tambahan atau bonus atas kerja keras lembur dinas luar kota yang melelahkan."
        },
        "explanation": "Pembahasan: Integritas diri yang kokoh tercermin dari kejujuran mutlak dalam urusan keuangan negara, bahkan ketika peluang melakukan kecurangan terbuka lebar tanpa ada yang mengawasi."
    },
    {
        "subcat": "Semangat Berprestasi",
        "text": "Evaluasi triwulan menunjukkan bahwa divisi pelayanan tempat Anda bertugas mendapat skor kepuasan publik paling rendah se-kabupaten karena antrean lambat akibat pencatatan buku besar manual.",
        "options_by_score": {
            5: "Menginisiasi perancangan sistem antrean sederhana berbasis spreadsheet terintegrasi, menyusun alur kerja cepat, dan memotivasi tim untuk berinovasi mengubah paradigma kerja agar target kepuasan terlampaui.",
            4: "Menyarankan pimpinan untuk menambah loket pelayanan fisik dan merekrut staf harian lepas demi mengurai antrean panjang.",
            3: "Bekerja lebih cepat pada jam pelayanan rutin sesuai kapasitas tenaga pribadi tanpa mengubah alur sistem kerja yang ada.",
            2: "Menerima hasil evaluasi tersebut dengan pasrah dan menganggap lambatnya pelayanan adalah hal lumrah di instansi pemerintah.",
            1: "Menyalahkan masyarakat yang datang berbondong-bondong di jam yang sama sehingga kapasitas kantor kewalahan."
        },
        "explanation": "Pembahasan: Semangat berprestasi mendorong dorongan kuat untuk melakukan perbaikan mutu berkelanjutan (continuous improvement), mencari solusi inovatif atas kegagalan, dan memacu produktivitas organisasi."
    },
    {
        "subcat": "Kemampuan Beradaptasi",
        "text": "Instansi Anda memberlakukan kebijakan sistem kerja fleksibel (Work From Anywhere) yang mengharuskan penggunaan aplikasi absensi geotagging dinamis dan laporan logbook capaian harian setiap sore.",
        "options_by_score": {
            5: "Menyesuaikan diri secara disiplin dengan sistem monitoring digital, menetapkan target mandiri yang terukur setiap hari, dan membuktikan produktivitas tetap optimal meski tidak diawasi fisik langsung.",
            4: "Mengikuti aturan absensi dan logbook digital tepat waktu sebatas formalitas pemenuhan kewajiban administrasi kehadiran.",
            3: "Mengeluhkan kerepotan mengisi logbook harian kepada rekan kerja namun tetap melaksanakannya karena takut sanksi tunjangan.",
            2: "Meminta kebijakan kelonggaran batas waktu pengisian logbook karena merasa tidak terbiasa bekerja dengan pengawasan sistem online.",
            1: "Memanipulasi koordinat lokasi GPS pada gawai agar tetap terdata hadir saat sedang beraktivitas di luar kepentingan dinas."
        },
        "explanation": "Pembahasan: Adaptabilitas dalam birokrasi modern menuntut akuntabilitas kerja mandiri, integritas penggunaan teknologi, dan kedewasaan mengelola waktu kerja fleksibel."
    },
    {
        "subcat": "Pengendalian Diri",
        "text": "Seorang pemohon izin membentak dan menumpahkan amarahnya kepada Anda di hadapan publik karena berkas perizinannya dinyatakan ditolak akibat ketiadaan sertifikat laik fungsi yang merupakan syarat wajib regulasi.",
        "options_by_score": {
            5: "Menjaga nada bicara tetap tenang dan terkontrol, tidak terpancing emosi, memberikan empati atas kekecewaannya, lalu menerangkan dasar hukum kewajiban syarat tersebut serta membimbing alur pemenuhannya.",
            4: "Mendengarkan luapan amarahnya hingga reda tanpa menyela, lalu meminta pemohon berbicara dengan atasan Anda untuk penjelasan lebih lanjut.",
            3: "Menegur balik pemohon secara tegas di loket bahwa tindakan membentak petugas adalah pelanggaran hukum di fasilitas negara.",
            2: "Memilih meninggalkan loket dan meminta rekan kerja lain menggantikan posisi Anda karena merasa martabat Anda direndahkan.",
            1: "Membalas bentakan pemohon dengan nada lebih keras untuk menunjukkan wibawa petugas pelayanan pemerintah tidak boleh diinjak."
        },
        "explanation": "Pembahasan: Pengendalian diri dalam pelayanan publik menuntut kedewasaan mental, kesabaran menghadapi tekanan emosional publik, dan kemampuan mengubah konflik menjadi solusi solutif."
    },
    {
        "subcat": "Pelayanan Publik",
        "text": "Terjadi lonjakan antrean perpanjangan kartu identitas di kantor Anda akibat masa berlaku serentak, sementara nomor antrean fisik sudah habis sejak pukul 10.00 pagi dan mesin tiket otomatis mengalami gangguan teknis.",
        "options_by_score": {
            5: "Membuka nomor antrean manual darurat, mengelompokkan berkas prioritas (lansia/ibu hamil/disabilitas), serta memberikan estimasi waktu transparan kepada pemohon agar mereka tidak menunggu tanpa kepastian.",
            4: "Mengumumkan kerusakan mesin antrean secara terbuka dan meminta warga yang belum mendapat nomor untuk datang kembali esok hari pukul 07.30.",
            3: "Melaporkan situasi lonjakan kepada kepala kantor dan menunggu instruksi penambahan jam operasional pelayanan.",
            2: "Tetap melayani hanya pemohon yang sempat mengambil nomor pagi tadi secara kaku tanpa memedulikan pemohon lain yang telah datang dari jauh.",
            1: "Menutup pintu gerbang kantor pelayanan lebih awal untuk mencegah penumpukan massa yang semakin ramai di ruang tunggu."
        },
        "explanation": "Pembahasan: Pelayanan publik responsif berani mengambil inisiatif taktis di saat krisis, memberikan kepastian informasi, dan mendahulukan empati bagi kenyamanan warga negara."
    },
    {
        "subcat": "Jejaring Kerja",
        "text": "Untuk menyusun rancangan kebijakan penanggulangan kemiskinan daerah yang tepat sasaran, unit Anda ditugaskan membangun kolaborasi penelitian dengan akademisi universitas negeri lokal dan lembaga swadaya masyarakat.",
        "options_by_score": {
            5: "Menginisiasi forum grup diskusi multipihak, menyelaraskan target data ilmiah dengan kebutuhan praktis instansi, dan membangun nota kemitraan yang saling memberdayakan demi kebijakan berbasis bukti (evidence-based).",
            4: "Menyerahkan kerangka kerja penelitian sepenuhnya kepada akademisi universitas dengan sistem kontrak kerja swakelola murni.",
            3: "Mengundang perwakilan akademisi dan LSM hanya dalam rapat sosialisasi akhir draf kebijakan tanpa melibatkan proses riset sejak awal.",
            2: "Menggunakan data internal kantor yang sudah ada untuk menghemat waktu koordinasi dengan pihak luar yang dinilai berbelit-belit.",
            1: "Menolak kerja sama dengan pihak eksternal karena khawatir data internal instansi bocor ke publik atau disalahgunakan peneliti."
        },
        "explanation": "Pembahasan: Jejaring kerja efektif dibangun atas dasar kesetaraan kemitraan, keterbukaan masukan keilmuan, dan sinergi lintas pemangku kepentingan demi kebijakan berkualitas."
    },
    {
        "subcat": "Sosial Budaya",
        "text": "Saat melakukan survei lapangan di wilayah pemukiman adat pedalaman, kepala suku setempat menyuguhkan hidangan tradisional hewani khas penghormatan tamu. Secara medis dan keyakinan pribadi, Anda tidak dapat mengonsumsi makanan tersebut.",
        "options_by_score": {
            5: "Menyampaikan ucapan terima kasih mendalam atas kehormatan suguhan tersebut, menerangkan alasan pribadi dengan tutur bahasa yang sangat santun dan takzim, serta menikmati hidangan pendamping lain yang disajikan.",
            4: "Mencicipi sedikit hidangan tersebut demi menghormati tuan rumah walau bertentangan dengan rasa nyaman pribadi.",
            3: "Meminta rekan tim lain yang dapat mengonsumsi makanan tersebut untuk menghabiskannya atas nama rombongan survei dinas.",
            2: "Menolak secara langsung dan spontan di hadapan warga karena khawatir melanggar prinsip keyakinan diri.",
            1: "Membuang makanan tersebut secara diam-diam saat kepala suku tidak melihat agar tidak menyinggung perasaannya."
        },
        "explanation": "Pembahasan: Penanganan situasi sosial budaya menuntut kepekaan etika, penghormatan mendalam atas keramahan adat setempat, serta kemampuan berkomunikasi persuasif tanpa mengorbankan integritas diri."
    },
    {
        "subcat": "Teknologi Informasi & Komunikasi",
        "text": "Anda mengetahui bahwa beberapa staf pegawai di divisi Anda menggunakan kata sandi (password) akun Sistem Informasi Kepegawaian (SIM-ASN) yang sangat sederhana seperti '123456' dan menempelkannya di monitor komputer kerja.",
        "options_by_score": {
            5: "Mengingatkan rekan-rekan tersebut tentang risiko kebocoran data rahasia aparatur, membantu mereka memahami praktik keamanan kata sandi yang kuat, dan mengusulkan penerapan autentikasi dua faktor (2FA) ke unit IT.",
            4: "Menyarankan rekan kerja mencabut kertas catatan password di monitor dan menyimpannya di tempat tersembunyi seperti laci terkunci.",
            3: "Membiarkan hal tersebut karena merasa setiap pegawai bertanggung jawab atas keamanan akunnya masing-masing.",
            2: "Menjadikan hal tersebut bahan candaan di ruangan kantor agar mereka malu dan mengubah kata sandi akunnya.",
            1: "Mencoba masuk ke akun rekan tersebut menggunakan password sederhana itu untuk membuktikan kelemahan keamanannya."
        },
        "explanation": "Pembahasan: Kepekaan TIK bagi aparatur sipil negara meliputi kesadaran tinggi terhadap budaya keamanan siber, perlindungan privasi data kedinasan, dan inisiatif edukasi preventif."
    },
    {
        "subcat": "Profesionalisme",
        "text": "Dalam proses pengadaan barang dan jasa pemerintah di mana Anda bertindak sebagai anggota panitia pokja lelang, kerabat dekat Anda mendaftarkan perusahaannya sebagai salah satu peserta tender lelang tersebut.",
        "options_by_score": {
            5: "Secara terbuka mendeklarasikan potensi benturan kepentingan (conflict of interest) kepada ketua pokja lelang dan mengundurkan diri dari proses penilaian tender tersebut demi menjaga objektivitas.",
            4: "Tetap berada di kepanitiaan lelang namun berjanji dalam hati untuk menilai dokumen lelang perusahaan kerabat secara sangat ketat.",
            3: "Membantu memeriksa kelengkapan berkas kerabat di luar jam kerja agar dokumennya tidak gugur dalam seleksi administrasi.",
            2: "Meminta anggota panitia lain untuk memberikan toleransi teknis kepada perusahaan kerabat tersebut demi menjaga hubungan kekeluargaan.",
            1: "Membocorkan harga perkiraan sendiri (HPS) dan dokumen penawaran kompetitor kepada kerabat agar perusahaannya memenangkan lelang."
        },
        "explanation": "Pembahasan: Nilai profesionalisme menuntut pencegahan benturan kepentingan secara dini, komitmen terhadap transparansi dan tata kelola pengadaan yang bersih dan bebas KKN."
    },
    {
        "subcat": "Anti Radikalisme",
        "text": "Sekelompok pemuda di lingkungan tempat tinggal Anda mendatangi rumah warga menjelang peringatan HUT Kemerdekaan RI, menyebarkan pamflet yang mengharamkan upacara bendera dan menyebut penghormatan lambang negara sebagai kemusyrikan.",
        "options_by_score": {
            5: "Berkoordinasi dengan pengurus RT/RW dan Bhabinkamtibmas/Babinsa setempat untuk menindaklanjuti penyebaran narasi tersebut secara preventif, sembari mengajak warga tetap antusias merayakan hari kemerdekaan.",
            4: "Mendatangi kelompok pemuda tersebut dan berdebat keras tentang sejarah perjuangan kemerdekaan bangsa hingga terjadi keributan.",
            3: "Mengumpulkan pamflet-pamflet yang dibagikan ke rumah-rumah warga lalu membakarnya tanpa memberitahu pengurus lingkungan.",
            2: "Mengabaikan aksi pemuda tersebut karena menganggap paham tersebut tidak akan laku di era modern saat ini.",
            1: "Menolak ikut serta memasang bendera Merah Putih di depan rumah agar tidak menjadi sasaran teror kelompok pemuda tersebut."
        },
        "explanation": "Pembahasan: Peran aparatur sipil negara sebagai perekat bangsa mencakup ketanggapan mendeteksi dini benih propaganda radikal di masyarakat dan menyelesaikannya lewat instrumen ketertiban resmi."
    },
    {
        "subcat": "Integritas Diri",
        "text": "Atasan langsung Anda meminta Anda untuk mengubah tanggal surat keluar (mundur/backdate) pada berkas disposisi pertanggungjawaban kegiatan, guna menutupi kelalaian administrasi divisi dari sorotan tim inspektorat.",
        "options_by_score": {
            5: "Menolak perintah pemunduran tanggal surat secara santun namun tegas, menjelaskan konsekuensi hukum pemalsuan dokumen arsip, dan menawarkan solusi perbaikan administrasi yang legal dan transparan.",
            4: "Meminta atasan memberikan surat perintah tertulis bermaterai sebelum Anda bersedia mengubah tanggal berkas disposisi tersebut.",
            3: "Menuruti perintah atasan karena menganggap tanggung jawab hukum sepenuhnya berada di tangan pejabat penandatangan berkas.",
            2: "Menolak secara lisan lalu membocorkan perintah atasan tersebut ke grup percakapan internal kantor untuk mempermalukannya.",
            1: "Mengubah tanggal surat tersebut dengan meminta imbalan promosi kenaikan jabatan atau kompensasi finansial kepada atasan."
        },
        "explanation": "Pembahasan: Integritas diri menguji keteguhan moral dalam menolak instruksi melawan hukum dari atasan, menjunjung tinggi keabsahan dokumen negara, dan memilih jalan perbaikan yang akuntabel."
    },
    {
        "subcat": "Semangat Berprestasi",
        "text": "Draf usulan inovasi pelayanan terpadu satu atap yang Anda ajukan ke kompetisi inovasi pelayanan publik tingkat kementerian dinyatakan tidak lolos seleksi tahap pertama karena dianggap kurang memiliki dampak terukur.",
        "options_by_score": {
            5: "Mempelajari catatan evaluasi dewan juri secara saksama, meminta masukan konstruktif dari para inovator senior, dan melakukan penyempurnaan indikator dampak untuk diimplementasikan nyata di unit kerja.",
            4: "Menerima kegagalan tersebut dan berencana mengajukan kembali draf proposal yang sama pada kompetisi tahun depan tanpa banyak perubahan.",
            3: "Menganggap dewan juri tidak memahami kondisi riil lapangan dan memilih fokus pada tugas-tugas administratif rutin harian.",
            2: "Menyesal telah meluangkan banyak waktu dan tenaga untuk menyusun konsep inovasi yang ternyata tidak dihargai pihak kementerian.",
            1: "Menyampaikan protes tertulis bernada tuduhan kecurangan kepada panitia pelaksana lomba inovasi kementerian di media publik."
        },
        "explanation": "Pembahasan: Sikap pantang menyerah dan mental pembelajar saat menghadapi penolakan atau kegagalan mencerminkan tingginya semangat berprestasi aparatur sipil negara."
    },
    {
        "subcat": "Kemampuan Beradaptasi",
        "text": "Anda mendapatkan surat penugasan dinas ke kantor pelayanan di pos perbatasan pulau terluar negara, di mana fasilitas listrik hanya tersedia malam hari dan akses komunikasi internet sangat terbatas.",
        "options_by_score": {
            5: "Menyambut penugasan dengan dedikasi tinggi sebagai panggilan pengabdian, segera menyiapkan strategi adaptasi fisik dan mental, serta merancang metode pelayanan manual yang tangguh untuk melayani warga perbatasan.",
            4: "Menjalani penugasan tersebut dengan kepatuhan formal sembari berharap masa penugasan di wilayah terluar segera berakhir sesuai SK.",
            3: "Mengajukan peninjauan kembali surat tugas kepada Badan Kepegawaian dengan melampirkan alasan riwayat kesehatan pribadi.",
            2: "Sering mengambil cuti dinas untuk kembali ke kota besar agar tidak terlalu lama merasakan keterbatasan di pos perbatasan.",
            1: "Menolak berangkat bertugas dan mengancam akan mengundurkan diri dari status aparatur sipil negara bila dipaksa ke daerah 3T."
        },
        "explanation": "Pembahasan: Loyalitas dan kemampuan beradaptasi di segala medan penugasan merupakan pilar kesiapsiagaan ASN sebagai garda terdepan kedaulatan dan pelayanan NKRI."
    },
    {
        "subcat": "Pengendalian Diri",
        "text": "Setelah bekerja lembur hingga larut malam selama tiga hari berturut-turut untuk menyusun berkas evaluasi, rekan kerja Anda secara tidak sengaja menimpa (overwrite) file rekapan akhir tersebut hingga hilang.",
        "options_by_score": {
            5: "Menenangkan diri sejenak untuk meredakan ketegangan, menahan diri dari menyalahkan rekan kerja, lalu bersama-sama mencari solusi pemulihan data (file recovery) atau membagi tugas menyusun ulang draf tercepat.",
            4: "Menyampaikan rasa kecewa kepada rekan kerja tersebut secara jujur dan memintanya bertanggung jawab penuh menyusun kembali file yang hilang.",
            3: "Menegur rekan tersebut dengan suara keras di ruangan agar ia menyadari kecerobohannya yang merugikan hasil kerja keras tim.",
            2: "Menolak melanjutkan pekerjaan dan menyerahkan seluruh kelanjutan laporan kepada pimpinan divisi.",
            1: "Mengamuk dan membanting barang di meja kerja karena merasa kerja keras tiga hari lembur sia-sia tanpa arti."
        },
        "explanation": "Pembahasan: Regulasi emosi pada kondisi stres dan kelelahan tinggi menguji kedewasaan personal, ketahanan mental, serta orientasi kerja sama pemecahan masalah (problem-solving mindset)."
    },
    {
        "subcat": "Pelayanan Publik",
        "text": "Seorang ibu hamil dengan balita yang tampak sangat kelelahan datang ke loket kependudukan saat jam pelayanan hampir tutup, sementara seluruh nomor antrean hari itu sudah habis dan loket prioritas sedang melayani warga disabilitas lain.",
        "options_by_score": {
            5: "Menyapa ibu tersebut dengan hangat, menyediakan tempat duduk yang nyaman di ruang tunggu berpendingin, serta berkoordinasi dengan petugas loket untuk memberikan dispensasi pelayanan tambahan setelah loket reguler selesai.",
            4: "Meminta izin kepada pemohon antrean reguler terdekat apakah bersedia bertukar nomor urut dengan ibu hamil tersebut secara sukarela.",
            3: "Menyarankan ibu tersebut untuk pulang beristirahat dan berjanji akan memberikan nomor antrean pertama bila beliau datang esok pagi.",
            2: "Menolak melayani berkasnya secara sopan dengan dalih jam sistem jaringan server pelayanan pusat akan segera ditutup otomatis.",
            1: "Menegur ibu tersebut mengapa baru datang menjelang kantor tutup saat kondisi fisik sedang hamil dan membawa anak kecil."
        },
        "explanation": "Pembahasan: Prinsip dasar pelayanan publik berbasis keadilan sosial (affirmative action) menuntut empati aktif, fleksibilitas berkeadilan, dan kepedulian terhadap kelompok rentan."
    },
    {
        "subcat": "Jejaring Kerja",
        "text": "Sebuah dinas sektoral lain yang menjadi mitra kunci program pengentasan kemiskinan sangat lambat memberikan rekomendasi data verifikasi lapangan, sehingga anggaran penyaluran bantuan sosial daerah terancam hangus.",
        "options_by_score": {
            5: "Mendatangi langsung unit teknis dinas mitra tersebut untuk berkoordinasi secara kekeluargaan, mengidentifikasi kendala verifikasi yang mereka hadapi, dan menawarkan bantuan tim untuk mempercepat proses verifikasi data bersama.",
            4: "Mengirimkan surat peringatan resmi kedua kepada kepala dinas mitra dengan tembusan inspektorat daerah agar segera merespons.",
            3: "Melaporkan keterlambatan mitra dalam rapat koordinasi pimpinan daerah agar mereka mendapat teguran dari Sekretaris Daerah.",
            2: "Menyalurkan bantuan sosial hanya berdasarkan data lama yang belum terverifikasi demi menghindari hangusnya penyerapan anggaran.",
            1: "Membatalkan seluruh program bantuan sosial tersebut dan menyalahkan kelambanan dinas mitra di hadapan publik masyarakat penerima."
        },
        "explanation": "Pembahasan: Kemitraan kerja antar-lembaga birokrasi membutuhkan komunikasi interpersonal yang luwes, pendekatan jemput bola, dan semangat saling membantu mengatasi kebuntuan administratif."
    },
    {
        "subcat": "Profesionalisme",
        "text": "Anda secara tidak sengaja membaca draf dokumen rahasia rencana penetapan lokasi proyek infrastruktur strategis nasional di meja pimpinan. Jika informasi ini dibocorkan kepada kerabat Anda yang berbisnis properti, mereka dapat membeli tanah warga dengan harga murah dan meraup untung miliaran rupiah.",
        "options_by_score": {
            5: "Menutup rapat rahasia tersebut, menjunjung tinggi sumpah jabatan untuk tidak membocorkan informasi rahasia negara kepada siapa pun, dan segera mengamankan berkas tersebut ke tempat aman sesuai protokol.",
            4: "Tidak membocorkan rincian lokasi proyek namun memberi petunjuk samar kepada kerabat untuk bersiap berinvestasi di wilayah umum tersebut.",
            3: "Memilih tidak peduli dan berusaha melupakan apa yang telah Anda baca agar tidak terbebani secara moral kedinasan.",
            2: "Memanfaatkan informasi tersebut untuk membeli sedikit bidang tanah atas nama kerabat jauh sebagai tabungan masa pensiun pribadi.",
            1: "Menjual dokumen peta lokasi tersebut kepada investor properti swasta dengan pembagian keuntungan komisi tanah yang besar."
        },
        "explanation": "Pembahasan: Profesionalisme dan integritas aparatur sipil negara diuji dari kesetiaan menjaga kerahasiaan negara, menolak godaan memperkaya diri atau kelompok melalui penyalahgunaan wewenang dan jabatan publik."
    }
]

# Shuffle options of the 33 new questions using permutations 12 to 44
new_33_formatted = []
for i, item in enumerate(new_33_raw):
    q_num = 78 + i
    perm = all_permutations[12 + i]
    letters = ['A', 'B', 'C', 'D', 'E']
    options = []
    for l, score in zip(letters, perm):
        options.append({
            'id': l,
            'text': item['options_by_score'][score],
            'score': score
        })
    new_33_formatted.append({
        'id': q_num,
        'category': 'TKP',
        'text': f"Soal nomor {q_num} ({item['subcat']}): {item['text']}",
        'image': None,
        'options': options,
        'explanation': item['explanation']
    })

# Combine all TKP: 12 shuffled + 33 new = 45 unique TKP questions
all_tkp = shuffled_12 + new_33_formatted

# Combine all: TWK (30) + TIU (35) + TKP (45) = 110 questions
all_110 = twk_questions + tiu_questions + all_tkp

# Ensure all IDs are strictly 1 to 110
for i, q in enumerate(all_110):
    q['id'] = i + 1

# Save to destination file: src/data/sample_questions.json
with open('C:/Users/cubeb/OneDrive/Documents/coding/projects/belajar-cpns-saas/src/data/sample_questions.json', 'w', encoding='utf-8') as f:
    json.dump(all_110, f, indent=2, ensure_ascii=False)

print('Success! sample_questions.json written with exactly 110 questions.')
