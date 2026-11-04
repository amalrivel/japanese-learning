# Personalized Learning — arah produk v2

Status (2026-11-01): runtime v1 dipertahankan dan alur guru manual v2 tersedia
secara lokal. Pengalaman komuter dan penyimpanan draf perangkat masih N3;
progres v2 dan PWA masih N4. Lihat [rencana implementasi](IMPLEMENTATION_PLAN.md) untuk bukti
setiap tahap, [arsitektur](ARCHITECTURE.md) untuk batas sistem, dan
[kontrak data](CONTENT_CONTRACT.md) untuk format yang sah.

## Tujuan dan pengguna

Aplikasi pribadi untuk membantu satu pembelajar yang sulit memulai, enggan mencari
materi, dan belum mengetahui perkembangannya. Target awal adalah JLPT N3 pada
Desember 2026, dengan perkiraan kemampuan awal N3. Tanggal ujian tepat belum dicatat.
Fokus pembelajaran: pemahaman materi ujian dan membaca. Kaiwa memakai jalur lain.

Keberhasilan berarti kebiasaan belajar lebih teratur dan kemampuan bahasa Jepang
meningkat dari waktu ke waktu. Aktivitas mengerjakan dan kemampuan yang sudah
dinilai harus dibedakan; aplikasi tidak mengklaim skor kelulusan atau penguasaan
hanya dari banyaknya latihan.

## Guru dan kendali pengguna

Guru adalah LLM eksternal yang dipilih pengguna, misalnya ChatGPT atau aplikasi LLM
lain. Pengguna mengatur permintaan, sumber buku, ritme, materi, dan personalisasi
melalui chat di aplikasi tersebut. Website menyimpan materi, pekerjaan, laporan,
dan feedback; website tidak memanggil API LLM atau membuat jadwal otomatis.

Guru menentukan urutan materi, pengulangan, serta penyesuaian setelah absen atau
sesi tidak selesai. Permintaan pengguna tetap mengendalikan keputusan itu. Tidak
ada algoritma spaced repetition atau target harian kaku yang dipaksakan website.
Akses baca langsung oleh LLM adalah integrasi mendatang yang harus dibuktikan;
pertukaran manual merupakan jalur awal yang harus selalu berfungsi.

## Perjalanan belajar yang dituju

1. Masuk dengan akun Google yang diizinkan. Data hanya untuk pemilik akun tersebut.
2. Salin JSON dari aplikasi LLM atau pilih file, tinjau materi/soal, lalu konfirmasi
   impor. Format tidak valid ditolak tanpa menulis sebagian data.
3. Halaman utama menampilkan materi sesi berikutnya dan pintasan melanjutkan
   pekerjaan. Sesi sekitar 10 menit, satu soal per layar, nyaman di kereta.
4. Baca materi lalu jawab latihan. Tambahkan komentar tentang keraguan, alasan,
   atau soal yang dirasa keliru. Tidak ada pembukaan kunci otomatis setelah submit.
5. Berhenti kapan saja. Jawaban, komentar, refleksi, dan posisi terakhir disimpan
   di perangkat dan server. Status membedakan simpan lokal, simpan server, serta
   konflik/gagal simpan. Materi tetap memerlukan internet untuk dibuka.
6. Isi refleksi 3–2–1: hingga tiga hal dipahami, dua hal membingungkan, dan satu
   pertanyaan atau langkah berikutnya. Refleksi boleh belum lengkap saat jeda.
7. Atas kendali pengguna, ekspor snapshot pekerjaan apa adanya, termasuk pekerjaan
   belum selesai, ke guru. Jawaban kosong bukan jawaban salah. Laporan menyatakan
   batas cakupannya dan hanya memuat data yang sudah masuk ke snapshot.
8. Guru membaca jawaban/komentar lalu memberi penilaian, pembahasan, dan materi
   berikutnya untuk diimpor. Feedback merujuk versi pekerjaan yang diperiksa.
9. Diskusikan sanggahan di aplikasi LLM. Hasil diskusi diimpor sebagai catatan
   tambahan bertag yang merujuk feedback lama; penilaian awal tetap tersimpan.
10. Lihat aktivitas, target, dan perubahan kemampuan yang sudah mendapat penilaian.
    Tidak ada nilai kemampuan untuk jawaban yang belum diperiksa.

## Materi dan pengalaman penggunaan

- Bahasa antarmuka dan feedback awal: Indonesia; materi belajar: Jepang.
- Mobile first, kontrol sentuh mudah, satu soal per layar, tanpa batas waktu.
  Perjalanan pagi dan pulang boleh menjadi sesi sama atau berbeda sesuai permintaan.
- Materi teks dengan furigana terstruktur. Guru memilih `toggle` untuk bacaan atau
  `hidden` untuk latihan kanji. Teks diimpor sebagai data, bukan HTML/Markdown aktif.
- Pilihan ganda, isian satu bagian kosong, jawaban pendek, refleksi terbuka, dan
  tulisan bebas. Semua penilaian v2 berasal dari feedback guru yang diimpor.
- Nikki/storytelling memakai topik dalam prompt guru atau topik pilihan pengguna.
  Guru menanggapi bahasa, keraguan, dan penyampaian cerita. Tidak ada penilaian
  mandiri yang diwajibkan untuk menyelesaikan alur baru.
- Bisa dipasang di layar utama ponsel setelah tahap PWA selesai. Penyimpanan draf
  lokal tidak berarti materi dapat dibuka atau seluruh aplikasi bekerja offline.

## Kriteria keberhasilan

| Kebutuhan | Bukti penerimaan |
| --- | --- |
| Mudah mulai | Materi sesi berikutnya dan pekerjaan terakhir mudah ditemukan di ponsel |
| Aman saat komuter | Jeda, putus koneksi, dan reload tidak diam-diam menghapus draf lokal yang berhasil disimpan |
| Guru mendapat konteks | Snapshot memuat materi, jawaban parsial, komentar, refleksi, dan feedback terkait |
| Feedback tertunda | Tidak ada hasil baru sebelum feedback guru diimpor untuk snapshot yang tepat |
| Diskusi terjaga | Anotasi menambah catatan tanpa mengganti pekerjaan atau penilaian awal |
| Progres jujur | Aktivitas, belum dinilai, dan hasil penilaian ditampilkan terpisah |
| Privasi | Akun lain tidak dapat membaca/menulis data; laporan tidak masuk cache bersama |
| Siklus lengkap | Impor → latihan/jeda → ekspor → impor feedback → materi berikutnya tanpa API LLM |

## Batas pengembangan awal

Tetap memakai Next.js, Firebase Auth/Admin, Firestore, npm, dan komponen Base UI
yang ada. Tidak ada migrasi/penghapusan data v1 pada tahap fondasi. Tidak ada akses
publik, peran guru lintas akun, API tulis untuk LLM, atau deployment otomatis.

Audio/listening, kaiwa, integrasi Obsidian/memory jangka panjang, pemanggilan API
LLM, penjadwalan/notifikasi otomatis, analytics lanjutan, dan penggunaan materi
sepenuhnya offline ditunda. Sumber buku serta preferensi guru dikelola di chat LLM.
Ekspor laporan belajar tetap perlu; fitur backup penuh dan penghapusan akun belum
menjadi kebutuhan saat ini.
