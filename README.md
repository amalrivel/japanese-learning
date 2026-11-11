# Personalized Learning

Aplikasi belajar pribadi untuk persiapan **JLPT N3 Desember 2026**, dengan sesi
sekitar 10 menit saat komuter. Pengguna mengendalikan guru AI melalui aplikasi LLM;
website menjadi tempat materi, latihan, penyimpanan pekerjaan, dan feedback.

## Status yang benar-benar tersedia

- **Runtime v1:** Google/Firebase Auth dan allowlist, impor paket JSON v1,
  latihan/draf server, penilaian objektif, penilaian mandiri, riwayat, progres,
  dan Teacher Report untuk pertukaran JSON manual.
- **Alur manual v2:** `/manual` menerima paket/feedback v2 melalui preview dan
  konfirmasi; pekerjaan parsial disimpan di server, snapshot dipilih untuk copy
  atau download, dan assessment/anotasi guru dapat diimpor serta dibaca. Submit
  mengunci pekerjaan, dapat parsial, dan tidak menilai.
- **Pengalaman komuter v2:** satu soal per layar, materi dan furigana terstruktur,
  serta draf HP IndexedDB yang disinkronkan ke server. Konflik dan kegagalan storage
  ditampilkan; pengguna dapat menyimpan darurat ke server atau menyalin input.
- **Progres dan PWA v2:** beranda memilih sesi berikutnya, melanjutkan pekerjaan,
  dan menunjukkan aktivitas serta assessment dalam jendela terpisah. Aplikasi
  dapat ditambahkan ke layar utama browser yang mendukung; tetap memerlukan jaringan.
  Materi offline, audio, Obsidian, API LLM, dan scheduling otomatis ditunda.

Panduan: [PRD](docs/PRD.md), [arsitektur](docs/ARCHITECTURE.md),
[kontrak](docs/CONTENT_CONTRACT.md), [rencana/bukti](docs/IMPLEMENTATION_PLAN.md),
dan [instruksi agen](AGENTS.md). Riwayat M1–M8 tetap disimpan pada bagian arsip.

## Alur manual v2

Minta guru LLM membuat JSON paket sesuai kontrak/contoh v2 → salin atau pilih file
untuk preview dan konfirmasi → latihan serta komentar → ekspor snapshot pekerjaan
apa adanya → berikan ke guru → impor feedback dan paket berikutnya secara terpisah.
Guru memilih pengulangan/penyesuaian; pengguna memegang kendali setiap pertukaran.
Diskusi sanggahan di chat dapat menjadi anotasi bertag tanpa menimpa penilaian awal.
Simpan sebelum membuat snapshot jika perubahan terbaru harus ikut diekspor.
Perubahan otomatis disimpan di HP sebelum dikirim; status membedakan simpan HP
atau server. Tunggu penyimpanan selesai sebelum meninggalkan halaman. Storage dapat
gagal atau dihapus browser, dan membuka ulang materi tetap memerlukan jaringan.

Akses baca langsung oleh LLM belum dibuktikan. Memiliki URL/API tidak menjamin LLM
bisa membaca data terautentikasi. Jangan melemahkan Auth atau membagikan token untuk
mengakalinya; ekspor manual tetap jalur awal yang didukung.

## Progres dan pemasangan

Pilih sesi berikutnya di beranda; pilihan tersimpan untuk akun dan dapat diganti.
Progres aktivitas mencakup maksimal 100 pekerjaan berdasarkan perubahan server terakhir;
assessment mencakup maksimal 100 feedback penilaian berdasarkan waktu impor server.
Snapshot, retry, dan anotasi bukan pekerjaan atau nilai baru. Revisi yang dinilai
lebih dari sekali adalah pengamatan terpisah, bukan ukuran penguasaan. Jawaban tanpa
penilaian dalam jendela belum tentu tidak pernah dinilai. Zona waktu mengikuti perangkat.

Pada Android gunakan menu browser untuk memasang atau menambahkan ke layar utama;
pada iPhone gunakan Bagikan lalu Tambah ke Layar Utama. Opsi berbeda antar-browser.
Aplikasi ini online dan tidak menjanjikan materi tersedia tanpa jaringan.

## Skenario uji pengguna sekitar 10 menit

Dengan akun dan lingkungan uji yang sudah diizinkan, impor contoh paket v2 melalui
`/manual`, baca materi, jawab satu soal dan isi komentar. Jeda, buka kembali pekerjaan,
dan periksa jawaban serta posisi. Simpan lalu buat snapshot dan ekspor konteks; catat
revisi yang diekspor. Sesuaikan target contoh feedback dan anotasi dengan snapshot,
work, revisi, dan ID feedback yang diekspor sebelum impor, lalu periksa hasil guru.
Di beranda lihat cakupan progres dan pilih paket berikutnya. Gunakan data uji saja.

Percobaan pada ponsel pribadi, termasuk pemasangan dan pemulihan setelah aplikasi
tertutup, masih memerlukan pengguna dan lingkungan hosted yang disetujui. Audit
produksi terbaru juga masih menemukan dependency moderat; lihat bukti N5 sebelum
menggunakan lingkungan hosted atau menyatakan rilis siap.

## Privasi dari mesin pencari

Setiap respons aplikasi meminta crawler mesin pencari untuk tidak mengindeks atau
mengikuti tautan (`X-Robots-Tag: noindex, nofollow`); halaman juga menyertakan
metadata robots yang sama. Jangan memblokir crawler melalui `robots.txt` jika
crawler perlu membaca instruksi ini. Mesin pencari dapat memerlukan waktu untuk
memperbarui hasil yang sudah ada dan tidak semua crawler mengikuti instruksi.

Instruksi ini bukan perlindungan akses. Gunakan Firebase Auth, allowlist, dan
konfigurasi hosted yang benar untuk melindungi data. Setelah perubahan tersedia
pada hosted, periksa header dan metadata pada URL publik; jika hasil lama masih
muncul, pemilik dapat menggunakan alat penghapusan mesin pencari yang sesuai.

## Menjalankan aplikasi

Gunakan Node `>=24.15.0 <25` dan npm. `.nvmrc` memilih versi teruji 24.22.1;
npm teruji 11.19.1. Web SDK terkunci memerlukan Node >=24.12.0, Admin >=22,
dan rantai re2/node-gyp menaikkan minimum proyek ke 24.15.0.

```sh
nvm use
npm ci
npm run dev
```

`npm run dev` membaca `.env.local`; `npm run build` dan `npm start` membaca
`.env`. Variabel yang sudah diberikan oleh lingkungan proses tetap didahulukan.
Perubahan nilai berkas yang dipakai server (termasuk
`APP_ALLOWED_UIDS`) dapat dimuat ulang saat development. Perubahan loader sendiri
tetap memerlukan restart. Variabel yang diberikan langsung oleh proses tetap
didahulukan daripada berkas.
Jalankan build ulang setelah mengubah variabel `NEXT_PUBLIC_` karena nilainya
ditanamkan saat build. Kedua berkas diabaikan Git dan harus disediakan sendiri.

Buka [localhost:3000](http://localhost:3000). Seluruh navigasi memakai alur terbaru:
`/manual` sebagai ringkasan belajar; `/manual/guide` untuk prompt guru AI,
`/manual/import` untuk impor, `/manual/materials` untuk membaca materi,
`/manual/works` untuk latihan tersimpan,
`/manual/study` untuk latihan, dan `/manual/teacher` untuk berbagi jawaban ke guru;
beranda memuat sesi belajar berikutnya. Menu Progres yang kosong sudah dihapus.
URL lama `/import`, `/practice`, `/history`,
`/progress`, dan `/teacher/report` diarahkan ke bagian terbaru yang sesuai.
Konfigurasi Firebase dan UID yang diizinkan
diperlukan; suite emulator membawa konfigurasi demo terpisah. Jangan memakai data
atau kredensial produksi untuk tes. Instal devDependencies sebelum build karena
Tailwind, TypeScript, dan stylesheet shadcn memerlukannya; jangan inisialisasi ulang.

## Google Sign-In lokal dengan emulator

Salin `.env.example` ke `.env.local` (cadangkan konfigurasi lokal yang sudah ada).
Contoh ini memakai nilai fiktif dan proyek `demo-learning-pwa`; kredensial Google
atau Firebase Admin asli tidak diperlukan. Cukup jalankan `npm run dev`:
Auth Emulator, Firestore Emulator, dan Emulator UI dimulai terlebih dahulu,
lalu aplikasi Next.js dijalankan setelah emulator siap. Tekan `Ctrl+C` untuk
menghentikan semuanya. Java 21 atau lebih baru diperlukan oleh Firestore Emulator.
Jika emulator sudah dijalankan secara terpisah, gunakan `npm run dev:app`
untuk menjalankan aplikasi saja.

Buka aplikasi di `http://localhost:3000`, lalu pilih tombol masuk Google.
Popup Firebase Authentication Emulator memungkinkan penambahan akun Google
fiktif, misalnya `learner@example.test`, tanpa login Google sungguhan.
Lihat UID akun di `http://127.0.0.1:4000/auth`, masukkan UID tersebut ke
`APP_ALLOWED_UIDS` dalam `.env.local`, simpan, lalu coba kembali setelah reload environment.
Allowlist tetap berlaku untuk akses API belajar.

Development menyimpan data emulator di `.firebase/dev-data` saat dihentikan
normal dengan `Ctrl+C`, lalu memuatnya kembali pada startup berikutnya. Folder ini
diabaikan Git. Akun fiktif dan UID tetap tersedia antar sesi; penghentian paksa
dapat melewatkan ekspor terakhir. Jangan membagikan isi folder ini.

Auth menggunakan `127.0.0.1:9099`; Firestore melalui Admin SDK menggunakan
`127.0.0.1:8080`. Browser tidak mengakses Firestore langsung. Pertahankan ID
`demo-learning-pwa` pada kedua konfigurasi agar data lokal terisolasi dari Cloud.
Untuk production, gunakan konfigurasi Firebase asli di `.env`, nonaktifkan
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS`, dan jangan pasang kedua variabel host emulator.
Alur Google Sign-In production tetap memakai provider Google yang sama.

## Pemeriksaan ringan selama pengembangan

Di halaman `/manual/guide`, bagian **Mulai dengan guru AI** menyediakan prompt awal
yang dapat disalin ke chat guru pilihan Anda. Prompt menyertakan contoh paket
terbaru dari `examples/learning-pack.v2.json`; salin hasil JSON ke bagian Impor,
periksa Pratinjau, lalu konfirmasi. Jika akses clipboard ditolak, buka teks prompt
dan salin manual. Hasil AI tetap divalidasi oleh aplikasi sebelum disimpan.

Untuk dokumen: periksa tautan, konsistensi status, contoh JSON, dan diff whitespace.
Untuk fondasi v2, gunakan tes terfokus berikut:

```sh
npm exec -- vitest run tests/unit/learning-v2.test.ts tests/unit/content.test.ts
npm run lint
npm run typecheck
git diff --check
```

Jalankan tes relevan selama pengerjaan; lint/typecheck setelah rangkaian perubahan
selesai. Jangan mengulang build atau emulator setelah setiap edit kecil. Prettier
tersedia lewat `format`/`format:check`; batasi ke berkas yang dikerjakan.

## Verifikasi akhir satu alur fungsional

Setelah alur API/persistensi/UI tersambung, jalankan sekali, secara berurutan:

```sh
npm run test:unit
npm run test:emulators
npm run test:e2e:emulators
npm run build
```

Ulangi cek yang gagal/terdampak perbaikan. Pemeriksaan tertunda harus dicatat dan
fitur belum diberi status siap rilis. CI yang ada tetap menjalankan verifikasi
lengkap. Audit dependency dan `npm ls --depth=0` dilakukan saat perubahan dependency
atau persiapan rilis; jangan menghapus pemeriksaan keamanan karena siklus ringan.

Emulator memerlukan Java 21+, Firebase CLI terpasang, binary emulator, dan port
loopback bebas: Auth 9099, Firestore 8080, UI 4000; server tes terisolasi memakai
3100. Project hanya `demo-learning-pwa`. Jalankan suite emulator/browser berurutan,
dan jangan menghentikan server pengguna lain untuk membebaskan port.

Browser memakai `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, Chrome lokal
`/usr/bin/google-chrome`, atau Chromium Playwright. CI memilih Chromium terkelola
kecuali override diberikan. Instal eksplisit bila perlu:
`npm exec -- playwright install chromium`. Workflow CI belum menjadi bukti remote
atas perubahan yang masih belum di-commit.

## Checklist rilis pemilik

Pengembangan v2 boleh berlanjut sambil hambatan hosted dicatat. Deployment dan
perubahan cloud tetap memerlukan permintaan tersendiri; emulator tidak membuktikan
kesiapan layanan hosted.

- Pisahkan konfigurasi development/preview/production. Nama environment ada di
  [arsitektur](docs/ARCHITECTURE.md#security-caching-and-operations). Simpan private
  key di secret hosting, jangan commit service account atau mencetak secret.
- Aktifkan Google sign-in dan domain yang tepat; periksa akun diizinkan/ditolak.
  Konfigurasi Firebase Web bersifat publik, kredensial Admin tidak.
- Terapkan/inspeksi rules dan index dari repository dengan otorisasi pemilik.
  Setelah index siap, uji `/progress` serta history berfilter packId memakai data tes.
- Periksa HTTPS dan `Cache-Control: private, no-store`/`Vary: Authorization` pada
  respons sukses/error. Periksa perilaku sign-out tanpa membagikan data privat.
- Dengan akun tes khusus, uji token dicabut dan akun dinonaktifkan; jangan memakai
  akun pembelajar sungguhan. Pemulihan akun mengikuti prosedur pemilik.
- Jalankan verifikasi akhir dengan Node/Java, emulator, dan browser yang tepat.
  `setInputFiles` menguji pipeline file, bukan dialog file sistem operasi.

Catatan pemilik 2026-10-30: project `japanese-learning-dc116` telah dikonfirmasi
milik aplikasi. Pemilik menerbitkan rules deny-all; satu probe anonim ke dokumen
acak tidak ada ditolak 403. Bukti akses publik sebelumnya masih perlu ditinjau
pemilik. Dua composite index dan lima field exemption belum terlihat di console
saat inspeksi. Lihat [bukti M7](docs/IMPLEMENTATION_PLAN.md#m7-evidence-in-progress-2026-10-30)
untuk batas observasi; jangan menafsirkan catatan lama sebagai audit cloud terkini.

Untuk smoke check API manual, masuk memakai akun tes yang sah, buka Network pada
browser, dan kunjungi `/practice`, `/progress`, serta `/history` dengan filter packId
valid. Periksa status 200 dan dua header di atas untuk request terkait. Catat hanya
status/header; jangan membagikan Authorization, token, body respons, atau kredensial.
Ini pemeriksaan read-only, bukan pengganti tes revocation/disabled-user.

Google login hosted, index produksi, native file picker, BFCache restoration,
dan akses baca langsung LLM tetap membutuhkan bukti masing-masing. PWA install
tetap membutuhkan bukti terpisah. Penyimpanan draf lokal tidak menjamin data tidak
akan dihapus oleh browser atau perangkat.
