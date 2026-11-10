# Struktur fitur

Kelompokkan kode berdasarkan domain terlebih dahulu:

- `content`: paket materi, impor, validasi, dan proyeksi materi untuk pelajar.
- `practice`: sesi latihan, jawaban, pekerjaan, penilaian, dan draf lokal.
- `analytics`: beranda, ringkasan progres, serta konteks dan laporan guru.

Di dalam setiap domain, gunakan kelompok yang memang diperlukan:

- `components/`: komponen React dan interaksi halaman.
- `model/`: skema, tipe, validasi, dan fungsi domain tanpa persistensi.
- `server/`: akses Firebase Admin dan persistensi server; pertahankan `server-only`.
- `client/`: komunikasi HTTP dari browser.
- `practice/drafts/`: penyimpanan draf, sinkronisasi, dan isolasi pergantian akun.

Route pada `src/app` tetap tipis dan mengimpor modul fitur secara langsung.
Gunakan import relatif untuk modul berdekatan dan alias `@/features/...` lintas
domain. Jangan mengekspor seluruh fitur melalui satu barrel `index.ts` yang
mencampurkan modul browser dan server. Buat folder baru hanya ketika tanggung
jawabnya berbeda; hindari satu folder untuk setiap berkas.

Nama `v2` tetap dipertahankan karena kontrak dan alur v1 masih digunakan.
Pemindahan folder tidak mengubah route, format dokumen, atau data tersimpan.
