# Personalized Learning

Aplikasi belajar pribadi untuk persiapan **JLPT N3 Desember 2026**, dengan sesi
sekitar 10 menit saat komuter. Pengguna mengendalikan guru AI melalui aplikasi LLM;
website menjadi tempat materi, latihan, penyimpanan pekerjaan, dan feedback.

## Status yang benar-benar tersedia

- **Runtime v1:** Google/Firebase Auth dan allowlist, impor paket JSON v1,
  latihan/draf server, penilaian objektif, penilaian mandiri, riwayat, progres,
  dan Teacher Report untuk pertukaran JSON manual.
- **Fondasi v2:** schema Zod, tipe TypeScript, validator JSON terbatas, dan contoh
  paket/materi, pekerjaan parsial, snapshot report, feedback, serta anotasi.
  Belum terhubung ke route API, database, atau tampilan. Halaman impor saat ini
  **hanya menerima v1**; contoh v2 belum bisa dipakai melalui UI.
- **Tahap berikutnya:** alur guru v2, satu soal per layar dalam bahasa Indonesia,
  draf HP + server, furigana, nikki, progres dari feedback guru, dan pemasangan PWA.
  Materi sepenuhnya offline, audio, Obsidian, API LLM, dan scheduling otomatis ditunda.

Panduan: [PRD](docs/PRD.md), [arsitektur](docs/ARCHITECTURE.md),
[kontrak](docs/CONTENT_CONTRACT.md), [rencana/bukti](docs/IMPLEMENTATION_PLAN.md),
dan [instruksi agen](AGENTS.md). Riwayat M1–M8 tetap disimpan pada bagian arsip.

## Alur manual yang dituju v2

Minta guru LLM membuat JSON paket sesuai kontrak/contoh v2 → salin atau pilih file
untuk preview dan konfirmasi → latihan serta komentar → ekspor snapshot pekerjaan
apa adanya → berikan ke guru → impor feedback dan paket berikutnya secara terpisah.
Guru memilih pengulangan/penyesuaian; pengguna memegang kendali setiap pertukaran.
Diskusi sanggahan di chat dapat menjadi anotasi bertag tanpa menimpa penilaian awal.
Alur ini masih target integrasi, bukan perilaku v1 saat ini.

Akses baca langsung oleh LLM belum dibuktikan. Memiliki URL/API tidak menjamin LLM
bisa membaca data terautentikasi. Jangan melemahkan Auth atau membagikan token untuk
mengakalinya; ekspor manual tetap jalur awal yang didukung.

## Menjalankan aplikasi

Gunakan Node `>=24.15.0 <25` dan npm. `.nvmrc` memilih versi teruji 24.22.1;
npm teruji 11.19.1. Web SDK terkunci memerlukan Node >=24.12.0, Admin >=22,
dan rantai re2/node-gyp menaikkan minimum proyek ke 24.15.0.

```sh
nvm use
npm ci
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Route aktif: `/import`, `/practice`,
`/history`, `/progress`, `/teacher/report`. Konfigurasi Firebase dan UID yang diizinkan
diperlukan; suite emulator membawa konfigurasi demo terpisah. Jangan memakai data
atau kredensial produksi untuk tes. Instal devDependencies sebelum build karena
Tailwind, TypeScript, dan stylesheet shadcn memerlukannya; jangan inisialisasi ulang.

## Pemeriksaan ringan selama pengembangan

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
serta ketahanan draf lokal v2 belum diimplementasikan pada tahap fondasi.
