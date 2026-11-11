# Arsitektur aplikasi belajar

Keputusan navigasi terbaru (11 November 2026): UI produk hanya memakai alur v2.
Beranda dan `/manual` menjadi tujuan utama; URL layar v1 mengarahkan ke bagian
terbaru. Tidak ada konversi ID pekerjaan v1 menjadi v2. Implementasi API/domain
v1 tetap internal untuk kompatibilitas dan pengujian, bukan alur navigasi produk.
Bagian runtime v1 di bawah menjelaskan kemampuan internal yang dipertahankan.

Workspace terbaru memakai layout persisten di `/manual`. Halaman ringkasan,
panduan (`guide`), impor (`import`), paket/pekerjaan (`works`), latihan (`study`),
dan ekspor/feedback (`teacher`) mempunyai URL masing-masing. Layout mempertahankan
state browser ketika berpindah dengan Link; halaman latihan memakai query `pack`
atau `work` agar dapat dibuka langsung dan dimuat ulang. Respons pemuatan route
yang sudah ditinggalkan diabaikan agar tidak menimpa tampilan yang sedang aktif.

Status (2026-11-02): runtime v1 dipertahankan dan alur guru manual serta
pengalaman komuter v2 tersedia secara lokal. Kesiapan hosted tetap gate terpisah. Tujuan produk di [PRD](PRD.md), detail format di
[CONTENT_CONTRACT](CONTENT_CONTRACT.md), urutan/bukti di [rencana](IMPLEMENTATION_PLAN.md).

## Stack dan batas domain

Gunakan Next.js App Router/TypeScript, Firebase Web Auth, Firebase Admin/Firestore,
Zod, shadcn Base UI, dan npm yang sudah terpasang. Tidak ada repository framework,
database tambahan, atau panggilan API LLM. `src/app` hanya route/layout tipis;
`src/features` memuat aturan domain/UI/persistensi konkret; `src/lib` memuat
infrastruktur bersama. Modul Admin dan persistensi tetap `server-only`.

Fitur dikelompokkan menurut domain `content`, `practice`, dan `analytics`, lalu
menurut tanggung jawab `components`, `model`, `server`, dan `client` bila diperlukan.
Draf lokal ditempatkan bersama dalam `practice/drafts`. Lihat
[panduan struktur fitur](../src/features/README.md) untuk aturan penempatan modul.

Akun Google yang masuk harus terdaftar di `APP_ALLOWED_UIDS`. Semua akses data
melalui Route Handler yang memverifikasi Firebase bearer token (termasuk revocation
check); kepemilikan diturunkan dari token. Firestore client langsung ditolak oleh
rules. Admin melewati rules, sehingga setiap operasi server tetap memeriksa pemilik.

## Runtime v1 yang dipertahankan

Data ada di `users/{uid}/packs`, `packKeys`, dan `attempts`. Paket/kunci immutable
memiliki hash isi yang sama. Draf hanya membawa proyeksi soal tanpa seluruh field
`answer`. Submit mengunci jawaban dan menilai objektif; jawaban manual memakai
self-assessment. Riwayat yang selesai dapat dibuka kembali tanpa mengubah hasil.
Ringkasan memakai maksimal 100 percobaan selesai; report berisi maksimal 20 kesalahan.

| Route aktif | Perilaku v1 saat ini |
| --- | --- |
| `POST /api/packs/import` | Impor v1, 201 baru / 200 duplikat identik / 409 konflik ID |
| `GET /api/packs`, `GET /api/packs/{packId}` | Daftar dan detail proyeksi paket tanpa kunci |
| `POST /api/attempts` | Mulai dengan UUID retry yang sama; tidak mereset pekerjaan |
| `GET /api/attempts`, `GET /api/attempts/{attemptId}` | Daftar/filter dan draf atau review milik akun |
| `PATCH /api/attempts/{attemptId}` | Snapshot jawaban lengkap dan revisi yang diharapkan |
| `POST /api/attempts/{attemptId}/submit` | Semua soal wajib dijawab, nilai objektif di server |
| `POST /api/attempts/{attemptId}/assessments` | Satu penilaian mandiri lengkap |
| `GET /api/progress`, `GET /api/teacher/context` | Ringkasan/report v1, hanya latihan selesai |

Reader v1, route, database, dan UI lama dipertahankan. Halaman impor lama tetap
menerima v1; gunakan `/manual` untuk paket dan feedback v2.

Daftar memakai halaman 20, maksimum 50, dan satu baris tambahan untuk mendeteksi
halaman berikutnya. Cursor base64url memuat timestamp presisi detik/nanodetik, ID,
dan filter; tidak memuat path dokumen. Validasi ulang cursor di bawah UID token.
Konflik revisi 409 memerlukan rekonsiliasi, bukan overwrite diam-diam. Retry submit
identik membandingkan hash jawaban; retry assessment membandingkan hash rating.

Rules/index lokal: `firestore.rules`, `firestore.indexes.json`. Query membutuhkan
composite `status ASC, completedAt DESC, __name__ DESC` dan
`packId ASC, createdAt DESC, __name__ DESC`. Pengecualian indeks untuk `exercises`,
`keys`, `answers`, `results`, `skills`. Keberhasilan emulator bukan bukti indeks cloud siap.
Query paket v2 memerlukan override single-field `ASCENDING` dengan scope `COLLECTION`
pada `learningWorks.work.packId` dan `teacherSnapshots.snapshot.pack.id`, karena map
induk `work` dan `snapshot` dikecualikan dari indexing. Deploy konfigurasi indeks dan
tunggu indeks siap sebelum merilis alur yang memakai query tersebut ke Firestore cloud.

## Progres dan beranda v2

`GET /api/v2/progress` dan `GET /api/v2/home` memakai UID token dan header
private/no-store. `PUT /api/v2/home` memvalidasi dan menyimpan pilihan paket pada
`users/{uid}/settings/learning`; GET tetap read-only. Query pekerjaan mengambil
100 terbaru berdasarkan `work.updatedAt`; query assessment mengambil 100 feedback
terbaru berdasarkan `importedAt` dan hanya membaca snapshot yang dirujuk. Masing-masing
membaca satu dokumen ekstra untuk mendeteksi batas. Query pekerjaan aktif beranda
terpisah. Konfigurasi indeks mengecualikan map besar dan mengindeks hanya field query;
indeks cloud dan pemasangan hosted memerlukan verifikasi terpisah.

Tidak ada service worker atau cache privat untuk PWA online.

## Alur guru manual v2

1. Pengguna menyalin JSON paket dari guru LLM atau memilih file. Preview memvalidasi
   bentuk, ukuran, referensi, duplikat, dan isi teks sebelum konfirmasi impor.
   Paket v2 berisi materi/soal tanpa kunci penilaian. Kunci v1 tidak dikonversi otomatis.
2. UI komuter menampilkan satu soal per layar. Jawaban, komentar, refleksi, dan posisi
   terakhir disimpan sebagai pekerjaan berevisi. Jeda tidak menutup sesi; submit
   adalah keputusan pengguna untuk mengakhiri pengerjaan, bukan hasil penilaian.
3. Saat pengguna meminta laporan, bekukan snapshot beridentitas UUID yang berisi paket dan
   versi pekerjaan. Pekerjaan `in_progress` dan belum lengkap tetap boleh diekspor.
   Identitas snapshot/revisi tetap mengacu isi lama meskipun pengguna melanjutkan.
4. Ekspor hanya snapshot yang dipilih beserta feedback terkait, termasuk snapshot
   lama yang dirujuk feedback. Salinan manual yang dibagikan pengguna adalah jalur
   awal. Draf yang hanya ada di HP belum terlihat server: tampilkan hal itu sebelum
   ekspor dan jangan mengklaim seluruh jawaban sudah masuk laporan.
5. Guru menilai di aplikasi LLM. Pengguna mengimpor feedback lewat preview/konfirmasi.
   Penilaian merujuk snapshot, ID pekerjaan, revisi, dan ID soal yang benar-benar
   dijawab. Feedback boleh mencakup sebagian jawaban; sisanya tetap belum dinilai.
6. Validasi feedback baru dengan snapshot dan seluruh riwayat terkait sebelum
   menyimpan. Satu hasil awal per soal/snapshot; pembahasan tambahan adalah anotasi
   bertag yang merujuk feedback sebelumnya. Penilaian lama tetap ada.
7. Paket berikutnya diimpor terpisah sebagai ID baru. Guru/pengguna mengatur jadwal,
   sumber materi, pengulangan, dan perubahan setelah absen melalui chat eksternal.

Persistensi v2 berada di bawah `users/{uid}` dan dipisahkan dari koleksi v1:
`learningPacks`, `learningWorks`, `teacherSnapshots`, dan `teacherFeedback`.
Tidak ada migrasi otomatis. Paket, isi snapshot, dan
feedback immutable; pekerjaan aktif diperbarui dengan transaksi revisi. Snapshot
adalah salinan server yang terverifikasi, bukan bukti otorisasi dari UUID semata.

Operasi membuat snapshot harus berupa mutasi eksplisit; GET konteks tetap read-only.
Impor feedback idempoten menggunakan ID + hash canonical JSON: identik mengembalikan
hasil yang sama, isi berbeda pada ID sama ditolak. Perubahan multi-dokumen tidak
boleh menghasilkan impor sebagian. Metadata daftar feedback pada snapshot berubah
secara transaksional; isi snapshot tetap immutable.
Tidak ada kredensial atau izin tulis khusus untuk LLM.

Route baru berada di `/api/v2`: `packs` (daftar/detail/impor), `works`
(daftar/mulai/detail/simpan/submit), `snapshots` (daftar/buat), dan
`teacher/context` serta `teacher/feedback` (ekspor baca/impor). Daftar memakai
cursor ID dan halaman maksimal 50. Snapshot unik per pekerjaan/revisi; metadata
operasi di bawah pekerjaan menyimpan receipt untuk retry save/submit. Retry dengan
operation ID dan isi sama mengembalikan hasil semula; isi berbeda ditolak.
Setiap paket memiliki satu pekerjaan utama melalui pointer `learningPacks.workId`.
Transaksi start membaca dan memperbarui dokumen paket sehingga klik ganda atau dua
tab mengembalikan pekerjaan yang sama. Duplikat historis tidak dihapus; daftar
memilih pekerjaan berjawaban paling lengkap, lalu terbaru, sebelum pointer tersedia.
Daftar menampilkan judul paket, bukan ID teknis.
Beranda memakai pemilih pekerjaan utama yang sama dan melewati duplikat, termasuk
lintas halaman hasil, saat mencari pekerjaan `in_progress` terbaru. Pekerjaan utama
yang sudah submitted tidak digantikan oleh duplikat aktif yang tersembunyi.
Tindakan Buka hanya mengubah URL; pemuatan editor mengikuti URL dan mengabaikan
respons setelah navigasi berubah. Respons start juga tidak membuka editor jika
pengguna sudah berpindah halaman; pekerjaan yang berhasil dibuat tetap tersimpan.

Submit boleh parsial dan tidak menilai. Pekerjaan submitted bisa dibuka kembali
melalui `POST /api/v2/works/{workId}` dengan operation ID dan revisi yang diharapkan.
Receipt reopen terpisah menjaga retry dan ID pekerjaan tetap sama. Setelah assessment
guru diimpor, metadata `reviewedAt` pada pekerjaan/paket mengunci save, submit,
dan reopen. Riwayat snapshot lama juga diperiksa untuk assessment tanpa marker.
Snapshot dan feedback lama tetap immutable meskipun pekerjaan direvisi sebelum dinilai.
Context membatasi 10 snapshot, 40 feedback, dan 512 KiB;
riwayat yang melampaui batas ditolak tanpa pemotongan. Penanda feedback per snapshot
membuat transaksi impor bersamaan membaca dan memvalidasi ulang seluruh riwayat.

## Penyimpanan draf perangkat

IndexedDB menyimpan jawaban, komentar, refleksi, posisi terakhir, identitas
paket/pekerjaan, dan metadata revisi serta mutasi menurut UID, pekerjaan dan cabang.
Setiap perubahan ditulis lokal dahulu; autosimpan server diserialkan. Payload dan
operation ID yang belum pasti disimpan untuk retry identik setelah reload. Respons
server yang terlambat tidak mengganti ketikan baru. Penanda UID per tab disimpan di
sessionStorage; token, paket, kunci, dan report tidak disimpan dalam draf.

Saat tersambung kembali, kirim snapshot dengan revisi server yang diketahui.
Konflik harus memperlihatkan pilihan pemulihan sambil menjaga salinan lokal.
Jangan mengganti draf lokal atau server secara diam-diam. Sign-out yang dapat
batal memperingatkan draf belum tersinkron. Jika akun berubah dari luar tab, request
lama dibatalkan, tampilan diisolasi, dan draf akun lama dibersihkan tanpa dialog;
notifikasi tidak memuat data privat.

IndexedDB dapat gagal, kehabisan ruang, atau dihapus browser. Bedakan status
tersimpan lokal, tersimpan server, dan gagal; jangan menjanjikan ketahanan mutlak.
Jika IndexedDB gagal, simpan server atau salin input tersedia dengan peringatan
bahwa retry dan pemulihan lokal setelah reload tidak dijamin. Tidak ada background
sync atau cache report. Materi tetap membutuhkan internet;
pemasangan ke layar utama tidak menambah jaminan penggunaan offline.

<a id="security-caching-and-operations"></a>

## Keamanan, caching, dan operasi

- Semua route data memakai Auth/allowlist, JSON, dan runtime Node.js untuk Admin/crypto.
  Mutasi browser menolak Origin berbeda; tidak ada fallback cookie/CORS berkredensial.
  Request non-browser boleh tanpa Origin tetapi tetap memerlukan token yang sah.
- Semua respons API privat, termasuk error/HEAD/OPTIONS, memakai
  `Cache-Control: private, no-store` dan `Vary: Authorization`. Fetch client memakai
  `cache:'no-store'`. Tidak ada `use cache`, CDN override, prerender data privat,
  service-worker cache privat, atau report publik bertoken URL.
- Report HTML adalah shell tanpa data; data dimuat setelah Auth. Sign-out dan
  pergantian akun membersihkan state serta membatalkan request tertunda.
- Imported text/ruby ditampilkan sebagai teks React; tanpa HTML mentah, kode,
  fetch URL, atau aksi yang berasal dari instruksi dalam isi. Laporan berisi data
  belajar tidak tepercaya dan tidak boleh menjadi instruksi sistem guru.
- Jangan log body impor, jawaban, report, bearer token, atau exception SDK mentah.
  Error memakai `{error:{code,message,issues?}}`; tampilkan path, bukan nilai rahasia.
  Kode/status v1 tetap: 400 JSON, 401 autentikasi, 403 izin/origin, 404 resource,
  409 konflik, 413 ukuran, 415 media, 422 validasi/versi, 503 konfigurasi, 500 internal.
- Batas byte/depth/jumlah diperiksa sebelum tulis. Pemilik dan referensi diperiksa
  dalam transaksi. Callback transaksi tidak memiliki efek samping karena dapat diulang.
- Public config: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`. Private config:
  `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `APP_ALLOWED_UIDS`.
  Cocokkan project ID dan normalisasi newline private key sekali. SDK diinisialisasi
  lazily; build tidak memerlukan kredensial produksi. Jangan commit file service account.
- Emulator demo: `demo-learning-pwa`, Auth `127.0.0.1:9099`, Firestore
  `127.0.0.1:8080`, UI 4000. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` hanya di dev;
  Admin memakai `FIREBASE_AUTH_EMULATOR_HOST`/`FIRESTORE_EMULATOR_HOST`. Tolak konfigurasi
  emulator dalam produksi dan jangan fallback diam-diam ke cloud saat config dev hilang.
- Pengujian saat coding mengikuti [kebijakan ringan](IMPLEMENTATION_PLAN.md#kebijakan-verifikasi).
  Emulator/rules wajib sebelum alur persistensi dinyatakan selesai; cloud auth,
  HTTPS, revocation, domain, dan indeks tetap verifikasi pemilik yang terpisah.

## Hal yang ditunda

Tidak ada API LLM, integrasi MCP tulis, penjadwalan otomatis, audio, Obsidian,
analytics lanjutan, atau materi sepenuhnya offline. Akses baca langsung LLM harus
diuji tanpa melemahkan Auth. Deployment/provisioning cloud memerlukan permintaan
tersendiri. Bukti dan hambatan cloud lama tetap tersimpan di arsip rencana.
