import json
from pathlib import Path

def generate_questions(output_file: str):
    questions = []
    
    twk_subs = [
        ("Nasionalisme", "Cinta tanah air dan penjagaan kedaulatan bangsa"),
        ("Integritas", "Kejujuran dan etika aparatur sipil negara"),
        ("Bela Negara", "Kesadaran peran aktif warga negara dalam pertahanan"),
        ("Pilar Negara (Pancasila)", "Pengamalan nilai-nilai luhur Pancasila dalam kebijakan"),
        ("Pilar Negara (UUD 1945)", "Sistem ketatanegaraan dan pasal amandemen UUD 1945"),
        ("Bahasa Indonesia", "Penalaran wacana logis dan ejaan baku bahasa Indonesia")
    ]
    
    for i in range(1, 31):
        sub, desc = twk_subs[(i - 1) % len(twk_subs)]
        questions.append({
            "id": i,
            "category": "TWK",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): Terkait dengan prinsip {desc}, manakah tindakan yang paling tepat dilakukan oleh seorang aparatur sipil negara dalam situasi konflik kepentingan?",
            "options": [
                {"id": "A", "text": "Mengutamakan kepentingan bangsa dan negara di atas kepentingan pribadi atau kelompok", "score": 5},
                {"id": "B", "text": "Menunggu instruksi tertulis sebelum mengambil langkah apapun", "score": 0},
                {"id": "C", "text": "Menyerahkan keputusan sepenuhnya kepada pihak yang memiliki pengaruh politik", "score": 0},
                {"id": "D", "text": "Menghindari keterlibatan agar tidak menjadi sasaran kritik publik", "score": 0},
                {"id": "E", "text": "Mengambil jalan kompromi meskipun bertentangan dengan peraturan perundangan", "score": 0}
            ],
            "explanation": f"Pembahasan: Opsi A merupakan wujud nyata integritas dan pilar {sub} sesuai nilai dasar ASN."
        })
        
    tiu_subs = [
        ("Verbal - Analogi", "Hubungan kata dan padanan makna"),
        ("Verbal - Silogisme", "Penarikan kesimpulan logis dari premis mayor dan minor"),
        ("Verbal - Analitis", "Urutan logis posisi dan syarat tertentu"),
        ("Numerik - Berhitung", "Operasi pecahan, persentase, dan aljabar praktis"),
        ("Numerik - Deret Angka", "Pola barisan bilangan bertingkat dan selisih"),
        ("Numerik - Soal Cerita", "Perbandingan senilai, kecepatan, debit, dan waktu"),
        ("Figural - Ketidaksamaan", "Pola rotasi, pencerminan, dan simetri gambar")
    ]
    
    for i in range(31, 66):
        sub, desc = tiu_subs[(i - 31) % len(tiu_subs)]
        questions.append({
            "id": i,
            "category": "TIU",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): Berdasarkan kaidah {desc}, jika semua anggota tim berintegritas tinggi dan sebagian anggota berprestasi di tingkat nasional, maka simpulan yang paling sah adalah...",
            "options": [
                {"id": "A", "text": "Sebagian anggota tim yang berintegritas tinggi berprestasi di tingkat nasional", "score": 5},
                {"id": "B", "text": "Semua anggota tim pasti berprestasi di tingkat nasional", "score": 0},
                {"id": "C", "text": "Tidak ada anggota tim yang berprestasi di tingkat nasional", "score": 0},
                {"id": "D", "text": "Hanya anggota yang tidak berintegritas yang berprestasi", "score": 0},
                {"id": "E", "text": "Tidak dapat diambil kesimpulan yang sah dari kedua premis", "score": 0}
            ],
            "explanation": f"Pembahasan: Menggunakan kaidah silogisme partikular, simpulan yang sah adalah opsi A."
        })
        
    tkp_subs = [
        ("Pelayanan Publik", "Orientasi kepuasan masyarakat secara ramah dan profesional"),
        ("Jejaring Kerja", "Kemitraan, kolaborasi tim, dan sinergi lintas instansi"),
        ("Sosial Budaya", "Adaptasi di lingkungan majemuk dan toleransi"),
        ("Teknologi Informasi & Komunikasi", "Pemanfaatan solusi digital untuk efektivitas layanan"),
        ("Profesionalisme", "Disiplin kerja, tanggung jawab, dan integritas kinerja"),
        ("Anti Radikalisme", "Ketahanan terhadap paham radikal dan kesetiaan pada NKRI")
    ]
    
    for i in range(66, 111):
        sub, desc = tkp_subs[(i - 66) % len(tkp_subs)]
        questions.append({
            "id": i,
            "category": "TKP",
            "subCategory": sub,
            "text": f"Soal nomor {i} ({sub}): Anda bertugas di loket pelayanan publik saat antrean sangat panjang dan sistem mengalami gangguan server sementara. Sikap Anda menghadapi keluhan warga adalah...",
            "options": [
                {"id": "A", "text": "Menyampaikan permohonan maaf dengan ramah, menjelaskan kondisi server, dan mencatat berkas secara manual agar warga tidak menunggu sia-sia", "score": 5},
                {"id": "B", "text": "Meminta warga menunggu dengan tenang hingga staf IT selesai memperbaiki sistem", "score": 4},
                {"id": "C", "text": "Melaporkan kejadian kepada atasan langsung dan menunggu arahan lebih lanjut", "score": 3},
                {"id": "D", "text": "Menutup loket sementara waktu hingga server kembali normal untuk mencegah kesalahan input", "score": 2},
                {"id": "E", "text": "Menyalahkan pihak penyedia jaringan internet atas seringnya server kantor bermasalah", "score": 1}
            ],
            "explanation": f"Pembahasan: Opsi A bernilai 5 karena mengedepankan inisiatif solutif dan orientasi {sub} yang tinggi."
        })
        
    out = Path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(questions)} questions to {output_file}")

if __name__ == '__main__':
    generate_questions('src/data/sample_questions.json')
