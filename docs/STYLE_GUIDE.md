# Panduan UI — ruang belajar

Filosofi: tenang, terbaca, dan mudah disentuh saat komuter. Gunakan shadcn
Base UI yang sudah terpasang, Lucide, dan token semantik di `globals.css`.

- Mobile-first: satu kolom mulai 320px; perluas hanya saat konten membutuhkan.
- Halaman memakai `learning-page`: lebar maksimal 5xl, padding 16px pada ponsel
  dan 32px di layar lebih besar. Hindari lebar tetap pada formulir.
- Navigasi bersama memakai `WorkspaceNav`, dengan label dan status halaman aktif.
- Satu aksi utama per bagian; gunakan varian Button yang tersedia. Target sentuh
  minimal 44px, fokus keyboard terlihat, dan label kontrol tetap terbaca.
- Judul utama 30–36px dengan tracking rapat; teks isi minimal 16px.
- Kartu memakai `bg-card`, border semantik, radius 2xl, padding 20–24px.
  Hero beranda memakai `bg-primary` sebagai penekanan utama.
- Formulir mempertahankan label, validasi, dan status penyimpanan. Jangan
  menyembunyikan error atau membuat status sukses semu demi tampilan.
- Gunakan warna `background`, `foreground`, `muted`, `primary`, dan
  `destructive`; tema terang/gelap memakai token yang sama.
- Teks panjang harus membungkus; JSON/code boleh bergulir di dalam panelnya.
  Halaman sendiri tidak boleh memiliki scroll horizontal.
- Pertahankan seluruh alur v1 dan v2. Perubahan tampilan tidak mengubah
  penilaian, kepemilikan, persistensi, atau aturan pergantian akun.

Sebelum selesai, periksa mobile/desktop, tema terang/gelap, keyboard, keadaan
kosong/loading/error, lint, typecheck, serta pengujian alur yang terdampak.

## Cakupan penerapan dan verifikasi

Pola ini diterapkan pada beranda, masuk/auth gate, latihan dan detailnya,
riwayat dan detailnya, progres, impor, laporan guru, alur manual v2, dan 404.
Header akun, navigasi, kontrol tema, serta Button berasal dari komponen bersama.

Navigasi produk terbaru tidak menampilkan label v1/v2. Menu Utama menampilkan
ringkasan, Belajar membuka `/manual`, Pekerjaan menuju `/manual/works`, dan
Progres menuju `/#progres`. Workspace belajar dipisahkan menjadi halaman
`/manual/guide` (prompt/panduan), `/manual/import` (impor), `/manual/works`
(daftar), `/manual/study` (materi/latihan), dan `/manual/teacher` (snapshot/feedback).
Ringkasan tidak memuat formulir panjang. Layout workspace mempertahankan state
selama navigasi client; editor aktif tetap mounted agar sinkronisasi draf berlanjut.
Ini tidak menjamin isian impor bertahan setelah refresh atau penutupan tab.
URL layar lama diarahkan ke bagian terbaru, bukan menampilkan data alur v1.

Verifikasi 11 November 2026:

- Tujuh halaman utama diperiksa pada lebar 390px dan 1280px tanpa overflow
  horizontal; tema gelap juga diperiksa pada lebar 390px.
- Lint, typecheck, pemeriksaan whitespace, dan production build lulus.
- Browser suite: 22/26 lulus pada putaran awal. Empat skenario gagal kemudian
  diulang pada kode terbaru dan semuanya lulus, termasuk penyimpanan, alur guru
  manual, draf offline, dan isolasi akun. Kegagalan tautan Beranda ganda telah
  diperbaiki; hasil putaran awal tidak dianggap sebagai seluruh suite lulus.
- Navigasi bersama tetap meminta konfirmasi ketika alur manual memiliki
  perubahan yang belum dipastikan tersimpan.

Pemisahan workspace berikutnya: enam halaman diperiksa pada 390px dan 1280px
tanpa overflow. Build production, 57 tes unit, lint, dan typecheck lulus.
Enam skenario browser relevan telah lulus: sesi beranda, prompt, status impor,
perpindahan halaman/isian impor, alur guru lengkap, serta draf offline/reload.
Alur guru, draf offline, dan regresi respons route terlambat diulang pada kode
terbaru setelah penyesuaian navigasi. Seluruh suite browser tidak diulang penuh.
