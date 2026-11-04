# Rencana implementasi aktif — alur guru AI v2

Diperbarui 2026-11-01 (Asia/Tokyo). [PRD](PRD.md) menentukan tujuan,
[arsitektur](ARCHITECTURE.md) menentukan batas, dan
[kontrak](CONTENT_CONTRACT.md) menentukan bentuk data. Panduan baru berbahasa
Indonesia; catatan historis di bagian arsip dipertahankan dalam bentuk aslinya.

## Status aktif

| Tahap | Status | Hasil yang diperlukan |
| --- | --- | --- |
| N0 Penyelarasan panduan | Selesai | Enam panduan selaras, target dibedakan dari runtime v1 |
| N1 Fondasi data v2 | Selesai | Skema, tipe, contoh dan tes ringan; tanpa perubahan runtime |
| N2 Alur guru manual | Selesai secara lokal | Impor paket → pekerjaan → snapshot → impor feedback/anotasi |
| N3 Pengalaman komuter | Selesai secara lokal | Bahasa Indonesia, satu soal per layar, materi/furigana, nikki, draf HP + server |
| N4 Progres dan PWA | Selesai secara lokal | Aktivitas vs hasil guru, target belajar, halaman utama sesi berikutnya, pemasangan online |
| N5 Verifikasi akhir | Belum dimulai | Suite lengkap dan gate hosted yang terbukti, bukan diasumsikan |

M1–M6 adalah implementasi v1 yang telah diuji. M7 masih memiliki gate hosted dan
M8 dulu ditunda; keduanya tetap riwayat. Gate rilis hosted tidak menghalangi
pengembangan lokal N0–N4. Jangan menandai produk siap rilis hanya karena fondasi
baru atau tes lokal berhasil. Tidak ada deployment/provisioning yang tersirat.

## Kebijakan verifikasi

1. Dokumen: cek tautan lokal, JSON contoh, istilah/status, dan `git diff --check`.
   Tidak perlu emulator, browser, atau build untuk perubahan dokumentasi.
2. Saat coding: satu kelompok tes unit relevan untuk logika baru/berubah. Jalankan
   lint/typecheck setelah rangkaian perubahan selesai. Tidak mengulang suite penuh
   setelah setiap edit kecil. Jangan menambahkan tes yang hanya menyalin implementasi.
3. Setelah satu alur fungsional API/persistensi/UI tersambung: jalankan unit lengkap,
   `test:emulators`, `test:e2e:emulators`, dan build sekali secara berurutan. Ulangi
   pemeriksaan yang gagal/terdampak perbaikan berikutnya, bukan semua tanpa alasan.
4. Pada tahap yang baru memuat schema/pure logic, emulator/browser/build belum
   relevan dan ditunda. Catat sebagai ditunda, jangan dilaporkan lulus.
5. Persistensi, ownership, dan rules harus punya bukti emulator demo sebelum tahap
   alurnya selesai. Rilis tetap memerlukan verifikasi lengkap serta gate hosted.
   Jangan menurunkan validasi/isolasi data agar tes cepat atau menghapus tes yang ada.
6. CI verifikasi lengkap yang sudah ada tetap dipertahankan. Audit dependency dan
   dependency tree diperiksa ketika dependency berubah atau menjelang rilis.

## N0 — Penyelarasan panduan

Perbarui PRD, ARCHITECTURE, CONTENT_CONTRACT, IMPLEMENTATION_PLAN, README, AGENTS.
Pertahankan blok instruksi Next.js, bukti lama, data/contoh v1, dan pekerjaan lain.
Target: JLPT N3 Desember 2026, sesi sekitar 10 menit, mobile first, guru eksternal
atas kendali pengguna. Pertukaran manual didahulukan. Refleksi 3–2–1 berarti tiga
hal dipahami, dua hal membingungkan, satu pertanyaan/langkah, bukan pola membaca 3 kali.

**Selesai bila:** panduan tidak mengklaim endpoint/UI v2 tersedia dan tidak lagi
memaksakan self-assessment/hanya latihan selesai sebagai target baru; tautan valid.

## N1 — Fondasi data v2 (tahap implementasi pertama)

- Tambahkan schema Zod dan inferred types pada domain content/practice/analytics.
  Gunakan kembali ID, timestamp/metadata, normalisasi, dan canonical JSON yang ada;
  tidak mengubah callers atau schema v1.
- Paket publik: metadata, materi/RichText furigana, soal dan tulisan bebas, tanpa
  kunci/penilaian. Pekerjaan: jawaban/comment, posisi, revisi/status, refleksi parsial.
- Konteks: snapshot paket/pekerjaan yang tepat, termasuk belum selesai, dan riwayat
  feedback. Feedback awal terpisah dari anotasi bertag/parent. Jangan menilai kosong
  sebagai salah atau mengubah penilaian awal lewat anotasi.
- Validator raw JSON membatasi byte/depth/versi; validator lintas objek menolak ID,
  pilihan, revisi, parent dan snapshot yang tidak sesuai. Validasi shape saja tidak
  cukup untuk writer yang akan dibangun pada N2.
- Tambahkan contoh paket, pekerjaan, report parsial, feedback awal, dan anotasi.
  Pertahankan contoh v1 yang dipakai UI/test lama.

**Cek ringan:**
`npm exec -- vitest run tests/unit/learning-v2.test.ts tests/unit/content.test.ts`,
lint, typecheck, tautan/contoh JSON, `git diff --check`.

**Selesai bila:** contoh valid lulus, invalid/batas/referensi ditolak, kompatibilitas
v1 terbukti, dan semua perubahan masih bebas I/O/API/database/UI. Skema siap menjadi
kontrak implementasi, bukan fitur website yang sudah tersedia.

## N2 — Alur guru manual

Implementasikan route/service v2 di bawah pemilik token dengan preview/konfirmasi.
Paket/snapshot/feedback immutable; pekerjaan memakai revisi transaksional. Pertahankan
route dan data v1 tanpa konversi otomatis. Report memuat keadaan pekerjaan parsial
apa adanya, termasuk komentar/refleksi, tanpa kunci atau identitas pribadi.

Snapshot ekspor adalah mutasi eksplisit yang menyimpan versi pekerjaan; GET read-only.
Feedback merujuk snapshot tersimpan. Validasi calon konteks lengkap setelah append,
termasuk parent dan larangan menimpa assessment. ID/hash retry identik idempoten;
konflik/validasi gagal tidak boleh menghasilkan tulis sebagian. Setelah feedback,
paket baru tetap impor terpisah, bukan output AI yang dieksekusi otomatis.

**Cek selama pengerjaan:** tes logika terfokus, lint/typecheck setelah batch.
**Gate akhir alur:** emulator/rules untuk ownership, retry, snapshot dan konflik;
browser smoke untuk loop manual, unit lengkap dan build. Catat gate hosted terpisah.

### Bukti N2 (2026-11-01)

Alur `/manual` dan route `/api/v2` tersambung ke koleksi v2 terpisah. Paket,
isi snapshot, dan feedback immutable; transaksi pekerjaan memakai revisi dan
receipt retry. Submit boleh parsial, tidak menilai, dan mengunci pekerjaan.
Snapshot dibuat dari revisi server; ekspor memberi batas cakupan dan memperingatkan
perubahan yang belum tersimpan. Impor feedback memvalidasi konteks lengkap dalam
transaksi dan serialisasi per snapshot mencegah assessment bersaing. UI memuat
hasil untuk revisi terpilih dan mempertahankan input saat konflik.

- `npm run test:unit`: PASS, 38 tes. `npm run lint` dan `npm run typecheck`: PASS.
- `npm run test:emulators`: PASS pada `demo-learning-pwa`, 12 tes integrasi dan
  7 tes rules. Termasuk dua save/assessment bersamaan, retry dan timestamp,
  snapshot lama, referensi salah, rollback, 40 feedback, konteks >512 KiB,
  isolasi UID, GET read-only, serta header `HEAD`/`OPTIONS` v2.
- `npm run test:e2e:emulators`: PASS, 11 tes. Setelah penyesuaian UI, ulangan
  terfokus alur v2 juga PASS: impor file/paste dan pergantian file lambat, resume, posisi, retry respons
  hilang, konflik dan navigasi, ekspor copy/download, feedback/anotasi, paket
  berikutnya, serta pergantian akun dengan respons tertunda.
- Production build: PASS di salinan sementara dengan environment bersih dan tanpa
  `.env`; build langsung dalam sandbox gagal pada pemeriksaan TypeScript. Ulangan
  pertama konfigurasi npm kosong gagal karena dua konfigurasi memakai path sama;
  ulangan dengan dua file kosong terpisah lulus.
- `graphify update .`: PASS, AST-only; fallback sequential setelah ekstraksi paralel
  ditolak sandbox. Graph memiliki 3409 node dan 5319 edge; label semantik tidak
  diperbarui. Cadangan graph historis yang sudah ada dipertahankan.
- Contoh JSON v2 dan path tautan lokal panduan diperiksa; `git diff --check` PASS.

Tes memakai Auth/Firestore emulator demo dan Chrome lokal; metadata lookup memberi
peringatan jaringan tetapi tes lulus. Hosted auth/index/rules/HTTPS, revocation,
native file picker, BFCache restoration, dan akses baca langsung LLM belum terbukti.
Tidak ada deployment, perubahan cloud, dependency baru, atau data produksi. Draf
perangkat, recovery offline, satu soal per layar, dan furigana interaktif tetap N3;
input yang belum tersimpan hanya berada di memori dan dapat hilang saat navigasi
atau perangkat ditutup. N3 dapat dimulai; keberhasilan lokal bukan kesiapan rilis.

## N3 — Pengalaman komuter

Gunakan komponen/token yang ada dan skill UI/UX/Base UI. Bahasa Indonesia, satu soal
per layar, tombol sentuh mudah, kembali/lanjut/posisi yang pulih, tanpa timer paksa.
Materi ditampilkan sebelum latihan; ruby bisa on/off kecuali `furigana:hidden`.
Nikki memakai prompt guru atau topik sendiri; komentar per soal dan refleksi dapat dijeda.

Implementasikan draf IndexedDB terpisah menurut UID/pekerjaan, tanpa library baru.
Tulis lokal dahulu, simpan server serial, pulihkan setelah reload, jangan buang lokal
saat konflik. Bedakan lokal/server/gagal/konflik; warning draf belum tersinkron sebelum
sign-out dan pembersihan. Material tetap online; report tidak memakai cache offline.

**Cek selama pengerjaan:** unit draft/revisi/recovery terfokus.
**Gate akhir alur:** browser ponsel/keyboard, reload/putus koneksi/gagal simpan/akun
berubah, unit lengkap, emulator dan build. Batas browser menghapus storage dijelaskan.

### Bukti N3 (2026-11-02)

`/manual` kini menampilkan materi, satu soal per layar, navigasi/posisi, ruby dan
furigana sesuai paket, serta refleksi parsial. Draf IndexedDB dipisah menurut akun,
pekerjaan, paket, dan cabang. Penyimpanan lokal mendahului autosinkronisasi; operasi
tertunda memakai ID/payload yang sama setelah reload. Konflik mempertahankan salinan
lokal dan membutuhkan pilihan pengguna. Submit parsial tetap terkunci; draf lama pada
pekerjaan submitted dapat dipindahkan ke pekerjaan baru dengan retry idempoten.

- `npm run lint`, `npm run typecheck`, dan `npm run test:unit`: PASS, 38 tes unit.
- `npm run test:emulators`: PASS pada project demo, 12 tes integrasi dan 7 rules.
- `npm run test:e2e:emulators`: PASS, 23 tes. Ulangan terfokus setelah perubahan
  submit, pilihan cabang, batas input dan pergantian akun cepat juga PASS.
  Cakupan mencakup IndexedDB,
  offline/reload, respons hilang/terlambat, dua tab, pemulihan submitted, kegagalan
  storage dan penyelamatan server/salin, akun eksternal/sign-out, serta viewport
  ponsel, keyboard, materi, furigana toggle/hidden dan regresi v1/N2.
- `npm run build`: PASS dalam salinan sementara dengan environment bersih, tanpa
  `.env` atau konfigurasi npm pribadi. `git diff --check`: PASS.
- `graphify update .`: PASS, AST-only dengan fallback sequential; graph memiliki
  3456 node dan 5494 edge. Label semantik tidak diperbarui. Staging serta cap query
  dan cadangan graph sebelumnya dipertahankan.

IndexedDB dapat gagal atau dihapus; transaksi yang belum selesai belum dijamin
bertahan. Jika storage gagal, retry darurat lintas reload tidak dijamin. Materi tetap
memerlukan jaringan. Emulator/browser memakai project demo; metadata lookup memberi
peringatan jaringan tetapi tes lulus. Hosted auth/index/rules/HTTPS, revocation,
BFCache restoration, dialog file sistem operasi, dan keyboard perangkat ponsel
fisik belum diverifikasi. N4 dapat dimulai; kelulusan lokal bukan kesiapan rilis.
Tidak ada dependency baru, deployment, perubahan cloud, atau data produksi.

## N4 — Progres dan PWA

Tampilkan aktivitas dan kemampuan yang sudah dinilai secara terpisah, perubahan
hasil guru dari waktu ke waktu, serta target belajar. Feedback anotasi tidak dihitung
sebagai nilai baru. Tampilkan cakupan data dan jangan membuat klaim mastery otomatis.

Halaman utama mendahulukan sesi berikutnya serta lanjutkan pekerjaan. Perbarui
manifest/ikon/identitas dan verifikasi pemasangan online. Pengguna/guru tetap memilih
ritme dan pengulangan; tidak ada scheduling atau notifikasi otomatis pada tahap ini.

### Bukti N4 (2026-11-05)

Beranda menyimpan pilihan sesi dan membaca pekerjaan aktif dengan query terpisah.
Progres memakai maksimal 100 pekerjaan terakhir dan 100 assessment terakhir; retry,
snapshot, dan anotasi tidak dihitung sebagai kegiatan atau nilai baru. Rentang dan
pemotongan ditampilkan, sedangkan hasil di luar jendela tidak diketahui. Assessment
terkait snapshot lama tetap masuk berdasarkan waktu impor. Target adalah JLPT N3
Desember 2026 dan sesi sekitar 10 menit, bukan durasi yang diukur. Manifest dan ikon
menyediakan pemasangan online tanpa service worker; jaringan tetap diperlukan.

- `npm run lint` dan `npm run typecheck`: PASS. `npm run test:unit`: PASS, 39 tes.
- `npm run test:emulators`: PASS pada project demo, 13 integrasi dan 7 rules.
  Ulangan terfokus batas global 100 assessment dan pekerjaan aktif: PASS.
- Browser emulator: 24 dari 25 tes awal lulus; satu tes N3 mengalami race fokus.
  Tes diperbaiki untuk menunggu fokus judul dan tombol, lalu ulangan terfokus N3
  dan N4: PASS (2 tes), termasuk viewport ponsel, pemilihan sesi, pergantian akun,
  manifest/ikon, serta pemeriksaan service worker dan cache kosong.
- Build produksi: PASS dalam salinan sementara tanpa `.env` atau kredensial.
  Penyalinan juga mencoba file konfigurasi PostCSS yang tidak ada di proyek; file
  yang ada tetap disalin dan build selesai. `graphify update .`: AST-only, 3479
  node dan 5606 edge; fallback sequential setelah paralel ditolak sandbox.

Emulator tidak membuktikan indeks hosted tersedia. Pemasangan aktual pada browser
atau ponsel fisik, keyboard fisik, hosted auth/index/rules/HTTPS dan gate rilis
masih N5. Tidak ada deployment, perubahan cloud, atau dependency baru.

## N5 — Verifikasi akhir dan rilis

Jalankan unit lengkap → emulator integration/rules → browser end-to-end → production
build. Periksa redaksi/ownership, JSON hostile, retry, revisi, anotasi, draf lokal,
account switch/sign-out, mobile/keyboard, dan loop materi berikutnya. Periksa dependency
audit sebelum rilis. Gunakan demo project saja untuk tes otomatis.

Gate hosted: Google/domain/allowlist, HTTPS/private headers, index dan query produksi,
revocation/disabled account. Native picker dan BFCache restoration memerlukan bukti
tersendiri. Akses baca LLM tidak dijanjikan hanya karena API ada. Bila akses tersebut
belum terbukti, ekspor manual tetap jalur utama. Deployment menunggu permintaan pemilik.

## Bukti N0–N1 (2026-11-01)

Pada saat bukti ini dicatat, N0 dan N1 selesai; N2 menjadi tahap berikutnya. Keenam panduan diselaraskan, tiga
modul schema v2 dan satu berkas tes ditambahkan, serta lima contoh JSON v2 tersedia.
Skema/tipenya belum dipakai route, database, atau UI. Tidak ada dependency baru.

| Pemeriksaan | Bukti |
| --- | --- |
| `npm exec -- vitest run tests/unit/learning-v2.test.ts tests/unit/content.test.ts` | PASS, exit 0; 13 tes dalam 2 berkas; 287 ms pada run ini |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0; route type generation dan TypeScript |
| `git diff --check` | PASS, exit 0 |
| Tautan/contoh | Semua path dan anchor Markdown lokal di enam panduan ditemukan; seluruh JSON contoh terparse |
| Pelestarian | Hash contoh v1, schema/callers v1 yang diperiksa, package/lock, config, dan perubahan tes lama tidak berubah dari awal pekerjaan; blok Next.js asli tetap sama |
| Riwayat | Seluruh isi kontrak v1 dan rencana/bukti lama tetap di bagian arsip, hanya judul pembatas yang diperjelas |
| `graphify update .` | PASS, exit 0; AST-only tanpa API LLM; graph 3325 nodes/4963 edges. Ekstraksi paralel ditolak sandbox lalu fallback sequential berhasil |

Tes baru memeriksa pekerjaan parsial/comment/refleksi, rich text inert, referensi
paket/pilihan, target snapshot/revisi, larangan menilai kosong, parent anotasi,
penilaian awal immutable, ukuran/depth/versi JSON, dan batas kompatibilitas v1/v2.

**Ditunda sesuai cakupan:** unit lengkap, emulator integration/rules, browser,
production build, audit dependency, cloud/hosted, akses baca LLM, dan persistensi
draf perangkat. Fondasi belum memiliki I/O/persistensi. Pembaruan graph hanya AST;
node semantik dokumen belum diekstrak ulang. Tidak ada klaim fitur v2 siap rilis.

## Arsip implementasi v1 — bukti M1–M8

Catatan asli berikut dipertahankan untuk audit dan tautan lama. Status/hambatan
hosted tetap relevan bagi rilis; instruksi urutan, kebijakan tes, self-assessment,
dan larangan draf lokal di dalam arsip tidak menggantikan rencana aktif di atas.

# Riwayat pelaksanaan v1 (catatan asli)

Status: M1–M3 were implemented and verified on 2026-10-27; M4 and M5 were implemented
and verified on 2026-10-28. Run one milestone at a time in dependency order. Do not infer completion
from a checked box without recorded command/browser evidence. Contracts take precedence over incidental
starter examples. Read [PRD](PRD.md), [architecture](ARCHITECTURE.md), and
[content contract](CONTENT_CONTRACT.md) before editing application code.

## Progress

| Milestone                                       | Status               | Evidence/blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planning/handoff                                | Complete             | Six artifacts inspected; example and preservation checks performed during planning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| M1 Runnable baseline                            | Complete             | 2026-10-26: added the npm typecheck command, navigable root shell, page placeholders, private/no-store 501 API placeholders, Base UI `render` trigger, app metadata, and npm-only README. `npm ls --depth=0`, `git diff --check`, `npm run lint` (0 errors; one existing unused `app` warning in `src/lib/firebase/client.ts`), `npm run typecheck`, and configured `npm run build` all exit 0. Next's installed docs support Webpack as a builder option; the default Turbopack build was separately attempted and blocked by sandbox port binding, so `build` uses `next build --webpack`. A dev server already occupied localhost:3000; its five required routes returned 200, all three placeholder API methods returned 501 with `Cache-Control: private, no-store` and `Authorization` in `Vary`, and the browser showed the theme menu with no console errors. Starting another dev server was prevented by the occupied port; no tests are installed for M1. M2 may proceed. |
| M2 Auth and trusted persistence foundation      | Complete, reverified | 2026-10-27: three review findings fixed; unit 7/7, authenticated HTTP 8/8, rules 3/3 (45 denied operations), lint/typecheck/build/dependency audit passed. System OpenJDK 21.0.12.1 used. Build, emulator tests, and audit required execution outside the sandbox; see current evidence below. M3 was eligible to begin at that point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| M3 Validated import                             | Complete             | 2026-10-27: automated checks and demo browser flows pass; native file picker remains blocked by the browser extension setting; see M3 evidence below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| M4 Practice and draft persistence               | Complete             | 2026-10-28: draft APIs, practice/history UI, emulator and browser verification passed; see M4 evidence below. M5 may begin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| M5 Grading and durable review                   | Complete             | 2026-10-28: deterministic grading, immutable submission/review, emulator and browser verification passed; see M5 evidence below. M6 may begin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| M6 Progress and teacher export                  | Complete             | 2026-10-29: bounded progress, read-only teacher handoff, emulator and browser verification passed; see M6 evidence below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| M7 Full-loop verification and release readiness | In progress          | Local verification underway; hosted smoke checks need owner configuration. See M7 evidence below. |
| M8 Installability                               | Deferred             | Optional only after M7; no offline sync                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Planning audit (2026-10-26): one-off Node assertions validated all example fields,
limits, references, the five grading variants (three objective/two self-graded),
and both documented JSON snippets. Python checks verified local links, milestone
fields, preservation of the original AGENTS block, and unchanged hashes for all
39 existing application/configuration files. No app lint/build/test suite was run;
the runtime Zod contract and test harness are future implementation tasks.

After each milestone replace its status and add date, changed files, commands with
exit status, browser cases, and unresolved risks. Keep the next milestone blocked
until the predecessor's Definition of Done is met. If an external gate blocks M7,
record it as incomplete; do not label the product release-ready or proceed to M8.

## Verification tooling

Current (2026-10-29): unit, integration, rules, and browser tooling are installed;
`test:browser:emulators` was introduced in M4. The following preserves the original
setup plan and proposed M7 script names; its initial baseline scripts were `npm run dev`, `npm run lint`,
`npm run build`, and `npm start`.
Do not run an application initializer. Use existing lockfile and strict TypeScript.

M1 adds `typecheck`: `next typegen && tsc --noEmit`. Existing generated `LayoutProps`
needs Next type generation. Use installed CLIs through npm scripts, not downloaded
replacement versions. Inspect existing `next.config.ts` and bundled docs before
changing config. A remote font download/build network failure is an environment
blocker to record, not permission to silently change the design.

M2 introduces these dependencies only after checking their current official Node
requirements and compatibility (resolve/lock versions with npm; no guessed pins):

```sh
npm install firebase-admin server-only
npm install --save-dev vitest firebase-tools @firebase/rules-unit-testing
```

Vitest is for pure TS and HTTP/integration tests; no React Testing Library, jsdom,
Vite React plugin, or alias plugin is needed for those tests. Configure `@/` using
the runner's built-in alias option. Exercise server-only code through HTTP so the
test runner does not need to bypass server-only module protections. Add scripts:

- `test:unit`: `vitest run tests/unit`
- `test:integration`: `vitest run tests/integration`
- `test:rules`: `vitest run tests/rules`
- `emulators`: `firebase emulators:start --project demo-learning-pwa --only auth,firestore`
- `test:emulators`: `firebase emulators:exec --project demo-learning-pwa --only auth,firestore "npm run test:integration && npm run test:rules"`

Integration tests start/stop one isolated Next process on port 3100, wait for
readiness, use only the demo project, and clean test namespaces between cases.
Seed two fixed-UID users using Admin Auth, obtain emulator ID tokens using
email/password REST login, and supply both UIDs to the test app allowlist. This
test-only login does not enable another production Auth provider. Refuse to run
destructive test cleanup unless both emulator hosts and the demo project match.
M2's first unit tests cover environment/allowlist validation; later milestones
extend the same suite. Install a Java runtime compatible with the selected
Firestore emulator if absent; verify `java -version`, do not assume it exists.

M7 adds only `@playwright/test` as a dev dependency and a `test:e2e` npm script.
Use `npm exec -- playwright install chromium` to obtain the needed browser when
permitted. The browser harness creates emulator identities without a production
auth bypass, launches its own test app, and shares the demo-only safety guard.
`test:e2e:emulators` wraps the browser run with the same emulator exec command.
Use official Next testing guidance for runner compatibility; do not test async
Server Components with a simulated unit DOM.

## M1 — Restore a runnable baseline (FIRST)

**Goal:** preserve useful uncommitted scaffolding and establish a clean, runnable
shell before any backend or learning feature. **Prerequisites:** repository access,
Node/npm matching installed requirements; no Firebase project or credentials.

**Expected files:** `package.json` (typecheck script), any affected empty
`src/app/**/page.tsx` and `route.ts`, `src/components/mode-toggle.tsx`, small
existing lint/type failures, and README's stale local setup instructions.
Touch `next.config.ts`/lockfile only if an observed failure requires it.

**Tasks:**

- [ ] Capture `git status --short` and diff; distinguish preexisting changes from
      your edits. Confirm `node --version`, `npm --version`, installed Next docs,
      package/lock consistency. Run `npm ci` only if dependencies need installing.
- [ ] Add typecheck script; run lint, typecheck, and build to record actual failures.
- [ ] Give empty page files a minimal default placeholder component; empty API
      files get explicit 501 JSON responses with private/no-store headers. Keep all
      APIs unavailable until their authenticated implementation milestone. Avoid
      inventing feature UI or deleting the route skeleton.
- [ ] Correct Base UI trigger composition (`render`, not Radix `asChild`) and
      other demonstrated lint/type/build blockers with the smallest changes.
- [ ] Make `/` a navigable shell linking the placeholder learner/import/report
      routes. Preserve existing UI/theme. Update README to npm-only verified commands,
      correct `src/app/(learner)` location, and links to these docs; no deployment claims.

**Acceptance/verification:** `npm run lint`, `npm run typecheck`, and
`npm run build` pass. `npm run dev` serves `/`, `/practice`, `/history`, `/import`,
and `/teacher/report` as shells; theme menu has no runtime console error; unfinished
APIs return 501 and disclose nothing. No Firebase/LLM keys needed for these checks.
**Definition of Done:** evidence recorded, no initializer/dependency replacement,
no unrelated work reverted, and baseline failures are fixed or explicitly block M2.

## M2 — Authentication, emulator tests, and server trust boundary

**Goal:** establish verified user access before any data-bearing API.
**Prerequisite:** M1. **Expected files:** Firebase/auth/api modules under `src/lib`,
sign-in route and protected client shell, all existing API placeholders,
`firestore.rules`, `firestore.indexes.json`, `firebase.json`, `vitest.config.*`,
tests/helpers plus unit/integration/rules tests, package/lock, `.gitignore` for new
emulator outputs. Do not overwrite `.aws/` or `.codex/`; add appropriate ignore
entries only after confirming they contain no intended tracked project files.

**Tasks:**

- [x] Add the M2 dependencies/scripts; configure Auth/Firestore emulators with the
      explicit demo project, loopback ports, deny-all rules, and planned indexes.
- [x] Implement lazy singleton SDK setup, environment validation, production
      emulator rejection, and server-only module boundaries. No production credentials
      are required for builds or demo tests.
- [x] Implement Google login/logout and session auth state; provide visible
      sign-in/loading/error states and clear private in-memory data on account changes.
- [x] Implement shared verified-bearer/allowlist guard, JSON byte limits/error
      envelope, Origin check, no-store responses, and UID-scoped service entry points.
      Guard every API placeholder before its 501 response; use GET packs as the first
      authenticated endpoint returning an empty, bounded list.
- [x] Add environment/allowlist unit tests; rules tests denying all client access;
      HTTP tests for missing/invalid tokens, unapproved user, approved users, wrong
      project/disabled users where supported, and safe failure without configuration.

**Acceptance/verification:** baseline commands, `npm run test:unit` and
`npm run test:emulators` pass. Anonymous API is 401, valid unlisted UID is 403,
approved users get their own empty list, client Firestore reads/writes fail, and
no test touches a real project. Check auth errors cannot leak tokens or SDK details.
**Definition of Done:** security foundation tests pass before implementing import.

**Historical execution evidence (2026-10-26; superseded by revalidation below):** Added `firebase-admin`, `server-only`,
Vitest 4, Firebase CLI, and rules test tooling; Vitest 5 conflicted with the
repository's `@types/node` 20 and was not force-installed. Node 24.22.1 is used for
the app; a Temurin 21 JRE was downloaded and extracted under `/tmp` solely to run
the Firestore emulator. The supplied Firebase Web config is stored only in ignored
`.env.local`; no Admin credential or production UID allowlist was added.

`npm run lint`, `npm run typecheck`, `npm run test:unit` (4/4),
`PATH=/tmp/temurin21/bin:$PATH npm run test:emulators` (authenticated HTTP 5/5,
Firestore rules 1/1), `npm run build` (Webpack), `npm ls --depth=0`, and
`git diff --check` passed. HTTP cases cover missing/invalid tokens, unapproved and
approved users, disabled allowlisted account rejection, project misconfiguration,
cross-origin mutation, placeholder guards, error redaction, and declared/streamed
body limits. Firestore reads/writes fail for both authenticated and anonymous
clients. Tests used only `demo-learning-pwa`; emulator shutdown succeeded.

Local dev smoke: `/`, `/practice`, `/history`, `/import`, `/teacher/report`, and
`/sign-in` returned 200; unauthenticated API requests returned 401 with
`Cache-Control: private, no-store` and `Vary: Authorization`. `npm audit
--omit=dev` reports 0 vulnerabilities after overriding the vulnerable Firebase
Web Firestore transitive `@grpc/grpc-js` 1.9.16 with 1.14.6. The full install audit
still reports 5 moderate findings in the overall dependency tree; detailed dev
dependency triage was not done. The dev server logged Next instant-navigation
validation warnings for protected routes; HTTP behavior passed and those warnings
were not investigated further. Browser Google sign-in and real-project Admin
credentials/allowlist remain external checks for later milestones.
This was the historical M2 completion decision; see the current review evidence below.

**M2 review corrections and current evidence (2026-10-27):** The starting
worktree was clean. All three findings were confirmed in the current checkout.
`src/lib/firebase/client.ts` now initializes asynchronously so synchronous config
or SDK failures reject the singleton Promise and reach the existing provider catch;
browser-session persistence and all callers are preserved. `src/components/auth-boundary.tsx`
now renders a signed-in error with `role="alert"`; failed logout retains the active
session, successful logout removes private content, and the UID subtree key stays
intact. `src/app/api/attempts/route.ts` authenticates GET without parsing a body;
POST retains JSON/media-type/declared and streamed size validation. This M2 fix
changed no M3 code, dependencies, lockfile, cloud configuration, or production
credentials. A concurrent Prettier 3.9.10 dev-dependency addition in package.json
and package-lock.json was observed at final review and preserved; npm ls was
rechecked successfully with that addition.

Regression evidence:

- `tests/unit/auth-client.test.tsx`: three new tests using installed Vitest and
  React DOM server rendering, with a small effect/state driver and mocked Firebase
  SDK/button. Empty public config ends loading with a safe alert and never creates
  a Firebase app; initialization is singleton and waits for session persistence;
  failed logout shows an alert while retaining private UI, UID changes alter the
  boundary key, and successful logout removes private UI. This is component/state
  regression coverage, not a browser DOM lifecycle or real Google login test.
- `tests/integration/auth-api.test.ts`: three new HTTP cases (GET/POST media type,
  foreign `aud`, foreign `iss`) retain the five prior cases. GET without auth is
  401; valid body-free GET is 501 NOT_IMPLEMENTED. POST without JSON media type is
  415, malformed JSON 400, and declared/streamed oversize bodies 413. GET/errors
  keep private/no-store and Authorization Vary headers. Foreign-project claim
  checks return redacted 401 under valid server config, separate from the retained
  server-project-mismatch 503 test. Tokens are unsigned emulator tokens derived
  in memory by changing one project claim; no second project was accessed. This
  does not validate signed token issuance by another real Firebase project.
- `tests/rules/firestore-rules.test.ts`: three collection cases cover `packs`,
  `packKeys`, and `attempts`. Anonymous, owner, and cross-UID clients are each
  denied get/list/create/update/delete (45 denied operations). Existing documents
  are seeded so update/delete failures exercise rules rather than absent data.
  Rules remain deny-all; demo/loopback guards precede access and fixture cleanup.
- The HTTP harness now copies app/config files into a fresh temporary directory
  (without local env files) and links installed dependencies. Its port-3100 Next
  server stops and the directory is removed at teardown. This avoids the observed
  `.next/dev` lock conflict with the user's existing port-3000 server.
- Two approved empty pack lists prove access to the bounded placeholder only.
  They do **not** prove persistence isolation. Distinct stored data per UID and
  server-side ownership isolation remain M3 acceptance work.

| Command                  | Current result               | Evidence / environment                                                                         |
| ------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `java -version`          | PASS, exit 0                 | System OpenJDK 21.0.12.1; no temporary JRE downloaded/used                                     |
| `npm ls --depth=0`       | PASS, exit 0                 | Installed dependencies consistent; Node 24.22.1/npm 11.19.1                                    |
| `git diff --check`       | PASS, exit 0                 | Final patch whitespace check                                                                   |
| `npm run lint`           | PASS, exit 0                 | No diagnostics                                                                                 |
| `npm run typecheck`      | PASS, exit 0                 | Next typegen and TypeScript, including the new tests                                           |
| `npm run test:unit`      | PASS, exit 0                 | 7/7 tests across two files (four config + three auth regressions)                              |
| `npm run test:emulators` | PASS, exit 0 outside sandbox | HTTP 8/8 + rules 3/3; only demo-learning-pwa and configured loopback emulators; clean shutdown |
| `npm run build`          | PASS, exit 0 outside sandbox | Normal workspace Webpack build, including TypeScript and prerender generation                  |
| `npm audit --omit=dev`   | PASS, exit 0 outside sandbox | 0 vulnerabilities                                                                              |

Initial failures were investigated rather than suppressed: sandbox emulator startup
failed to bind loopback ports (EPERM); the first unrestricted run then found the
shared Next dev lock, fixed through harness isolation. The normal workspace build
reproduced “Could not parse output from TypeScript's --showConfig.” Direct tsc
showConfig succeeded; the installed Next CLI helper captured empty stdout in the
sandbox. The identical normal build outside the sandbox passed, so no TypeScript
or Next configuration was changed. Audit initially failed with registry DNS
ENOTFOUND inside the sandbox and passed outside it. The initial temporary JRE
request was interrupted; the subsequently installed system Java was used instead.

The final diff was inspected for unintended changes and credential/token exposure;
no credentials or tokens were added. No mandatory M2 gate remains blocked.
M2's Definition of Done was met on this evidence; M3 had not started at that point.
Real Google popup/session behavior, browser remount/back-navigation privacy,
production token signatures/revocation, and production configuration remain later
external/browser checks; no production-readiness claim is made.

**External gate (later, not during planning):** owner must create/configure Firebase
project, Google provider, Web app/domains, Firestore location, service-account
credentials, and one allowlisted UID before real Google-login validation. Emulator
work may finish first; production revocation behavior must be checked in M7 if
emulators cannot model it. Do not invent credentials or enable public enrollment.

## M3 — Strict content import with preview and idempotency

**Goal:** import one valid immutable pack safely. **Prerequisite:** M2.
**Expected files:** `src/features/content/{schema,projection,packs.server}.*`, import
UI, `/api/packs/import`, pack list/detail routes, example-based fixtures/tests.

**Tasks:**

- [x] Implement all v1 fields, discriminated unions, cross-references, limits,
      explicit version rejection, and canonical hashing from CONTENT_CONTRACT.
- [x] Implement JSON file/paste input and one shared preview; errors identify
      fields without echoing untrusted values as HTML. Confirm/cancel before writes.
- [x] Atomically persist projected learner pack and separate keys. Enforce same
      ID/hash duplicate and changed-ID-content conflict policy; discard raw import
      state on success/cancel. Implement bounded lists and cursor validation.
- [x] Test real example, non-Japanese fixture, malformed JSON, depth/size including
      chunked bodies, invalid versions/IDs/references/choices, unknown nested fields,
      unsupported exercise types, normalized duplicate answers, and adversarial strings.
- [x] Test two concurrent imports, whitespace/key-order equivalence, hash-changing
      content conflict, isolation, atomic failure, and positive-list key redaction.

**Acceptance/verification:** baseline + unit + emulator suites pass. Both input
paths import the same example; cancel/invalid input writes nothing; duplicate
import preserves importedAt; no practice/list DTO contains an answer/explanation.
Render `<script>`/instruction-like strings inertly. **Definition of Done:** import
and retrieve are complete and tested; no grading/session feature added early.

### M3 evidence (2026-10-27)

Implemented the shared strict schema, canonical hash, learner projection, atomic
pack/key import, owner-scoped list/detail APIs, and file/paste preview UI in
`src/features/content`, `src/app/api/packs`, and the import page. Updated the M2
Origin guard in `src/lib/api/server.ts`: Next's local Route Handler URL uses an
internal hostname, so same-origin checks use the request Host and URL protocol.
Added schema, preview, account-unmount, and HTTP/emulator coverage under `tests/`.

- **Pass:** `npm ls --depth=0`, `git diff --check`, `npm run lint`, `npm run
  typecheck`, `npm run test:unit` (16 tests), `npm run test:emulators` (9 HTTP
  and 3 rules tests), `npm run build`, and `npm audit --omit=dev` (0 vulnerabilities).
  Emulator, build, and audit needed execution outside the sandbox.
- **Pass:** concurrent identical imports produce a matched pair; retry preserves
  `importedAt`; changed content conflicts; two UIDs remain isolated; list/detail
  omit nested keys. Tests cover a near-128 KiB write, exact byte limit including
  whitespace and stream input, both orphan-pair cases, emulator transaction
  rollback, deterministic timestamp/ID pagination with sub-millisecond precision,
  malformed cursor, file/paste preview equivalence, and no POST on cancel or
  invalid preview. File confirmation sends the original JSON in the unit harness.
- **Browser pass:** on an isolated demo-only server and Auth/Firestore emulators,
  original fixture through a browser File object, preview and confirm (201),
  then paste of the same fixture and duplicate (200). File selection was simulated
  by a control only in the isolated test copy. A separate non-Japanese
  fixture covered cancel, duplicate (200), changed-content conflict (409), and
  script-like text rendered inertly. Logout and switching to another demo UID
  cleared the preview while an 8-second delayed response was pending; the old
  response did not appear after it completed. The delay and account-switch control
  existed only in the isolated test copy.
- **Fail then fixed:** browser confirm initially received 403 because the internal
  Next hostname differed from the browser host; same-origin and cross-origin HTTP
  cases now pass. An initial pagination fixture assumed nanosecond storage;
  Firestore rounded it to microseconds, so the fixture now tests stored precision.
- **Blocked:** browser file selection of the original fixture requires enabling
  file-URL access in the Brave extension; that setting was not changed. Browser
  upload through the real browser file picker remains unverified; file preview
  and confirmation are covered by the unit harness. No production Firebase was
  accessed. Emulator success does not establish production index availability.

The original fixture was imported through the browser File API and paste path;
the actual OS file-selection dialog remains unverified as stated above. The
final diff was checked for unintended changes and credential/token exposure;
no credentials were added. M3 is complete with that browser limitation recorded.
M4 had not started at the time of this M3 evidence.

## M4 — Practice renderer and saved draft sessions

**Goal:** answer and resume all supported types without seeing keys.
**Prerequisite:** M3. **Expected files:** `src/features/practice` answer schema,
session/renderer UI and persistence; learner practice/history pages;
`/api/attempts` GET/POST and detail GET/PATCH routes; tests.

**Tasks:**

- [x] Render choice, one-blank, exact/self short-answer, and self-review inputs
      with associated labels, keyboard navigation, focus/error states, and plain text.
- [x] Start UUID-based attempts idempotently; persist partial answer snapshots
      with revisions. Serialize autosaves, show saved/saving/failed status, provide
      explicit Save, and warn before leaving with unsaved work.
- [x] Implement resume/history with pagination and optional pack filter. Refetch
      on stale revision and preserve recoverable local text; do not auto-overwrite.
- [x] Test wrong answer shapes/unknown exercise IDs, repeated start, same UUID
      wrong pack, two-tab stale saves, account switching, lost-response retry recovery,
      and attempts belonging to another UID. Submit remains unavailable until M5.

**Acceptance/verification:** baseline/unit/emulator suites; browser answers all
five example variants, acknowledges Save, reloads/resumes exact saved choices/text;
network failure visibly reports unsaved state; draft responses contain no keys.
**Definition of Done:** durable drafts and safe rendering verified without offline
storage, grading, or new frameworks.

### M4 evidence (2026-10-28, Asia/Tokyo)

Implemented strict draft answers, owner-scoped transactional attempt persistence,
positive-list responses, attempt routes, practice rendering, serialized autosave,
conflict recovery, history/filter/pagination, and account lifecycle cleanup in
`src/features/practice`, `src/app/api/attempts`, and learner pages. Added a
Playwright browser harness and demo-only sign-in in an isolated temporary copy;
the production application has no test sign-in route. Submit and assessments
remain unavailable. A retry ID survives reload in the URL, with its owning UID
checked against browser history state; no answer or token is manually persisted there.

- **Pass:** `npm ls --depth=0`, `git diff --check`, `npm run lint`, `npm run
  typecheck`, `npm run test:unit` (20 tests), `npm run test:emulators` (9 HTTP
  and 3 rules tests), `npm run build`, and `npm audit --omit=dev` (0
  vulnerabilities). Emulator, build, and registry audit ran outside the sandbox.
  Emulator tests cover same-ID retries, full snapshot replacement, stale and
  concurrent writes, non-draft rejection, two distinct UID datasets, direct
  cross-UID 404s, redaction, exact cursor ordering/filtering, 40 maximal text
  answers, and the 384 KiB limit including a stream without Content-Length.
- **Browser pass:** `npm run test:browser:emulators` (3 tests), headless Google
  Chrome 156.0.8078.47 and Playwright 1.64.1, with only the demo Auth/Firestore
  emulators. The five fixture variants survived Save, history navigation, and
  reload; an acknowledged answer also survived sign-out/sign-in. Tests exercised
  keyboard choice selection, a lost start response with the same retry ID, a
  lost save response, edits while saving, a failed recovery GET followed by a
  revision-checked retry, and the case where an old revision is still visible
  while an earlier write may be pending. Two-tab conflicts retained local input
  and exercised both recovery choices. Tests also covered cancellation of link,
  Back, reload, and sign-out navigation while unsaved; delayed responses after
  sign-out; account switching; and absence of key fields in observed API payloads.
  The example model answer was not found in the generated static assets.
- **Fail then resolved:** sandboxed emulator port binding returned `EPERM`, and
  sandboxed build could not parse TypeScript configuration; both passed outside
  the sandbox. Earlier browser runs exposed a selector ambiguity and an autosave
  timing assumption in the tests; the final three browser tests pass.
- **Additional audit:** full `npm audit` reported five moderate development-only
  dependency findings through `firebase-tools`; its suggested major-version
  change was not applied. The required production-only audit passed.
- **Still unverified:** the M3 native file-selection dialog and production
  Firestore index availability remain as recorded above. Browser evidence is
  limited to the listed headless Chrome version and demo emulators; no production
  Firebase, real Google login, deployment, or offline synchronization was tested.

M4 was complete for its stated scope; M5 was eligible to begin at that point.

## M5 — Deterministic grading and immutable review

**Goal:** finish attempts, grade objective answers, and record honest self-review.
**Prerequisite:** M4. **Expected files:** grading/attempt lifecycle modules,
submit/assessments routes, results UI, history detail page, test fixtures.

**Tasks:**

- [x] Implement documented normalization and objective grading; no fuzzy/AI grading.
      Unit cases include NFKC full-width text, whitespace, case, punctuation mismatch,
      missing answers, and multiple accepted answers.
- [x] Validate/freeze complete answers and compute results transactionally.
      Introduce objective-only completion and awaiting_self_review → completed states.
- [x] Reveal feedback only for submitted attempts; collect all self ratings once.
      Serialize saves before submit, retain latest revision, and surface conflicts.
- [x] Test concurrent/retried submit and assessment, different retry payloads,
      malformed ratings, stale revision, no edits after completion, and key/score/UID
      injection. Grade results must come from stored keys, never the client.

**Acceptance/verification:** baseline/unit/emulator suites pass. Example produces
three objective outcomes and two pending self ratings; after rating, all five
results survive reload and review. Objective-only fixture completes at submit.
Repeated submission/assessment changes neither totals nor lifecycle timestamps.
**Definition of Done:** history is reviewable, state machine/idempotency tests
pass, and all pre-submission key-leak tests remain green.

### M5 evidence (2026-10-28, Asia/Tokyo)

Implemented deterministic server-only grading, complete-answer and rating
validation, transactional submission and assessment with canonical hashes,
positive-list draft/review projections, and owner-scoped submit/assessment routes.
The practice UI flushes and waits for draft saves before submission, freezes the
snapshot during retries, and displays immutable objective results and self-review
feedback. History resumes pending review and completed review; a new attempt uses
a new UUID. Changes are in `src/features/practice`, `src/app/api/attempts`, and
the existing unit, HTTP/emulator, and browser tests. M6 remains unstarted.

- **Pass:** `npm ls --depth=0`, `git diff --check`, `npm run lint`, `npm run
  typecheck`, `npm run test:unit` (21 tests), `npm run test:emulators` (9 HTTP
  and 3 rules tests), `npm run build`, and `npm audit --omit=dev` (0
  vulnerabilities). HTTP/emulator cases cover normalization, alternative
  accepted answers and punctuation, objective-only and self-only packs,
  complete validation, concurrent and retried submit/assessment, canonical hash
  ordering, stale revisions, save/submit races, immutable timestamps/results,
  UID isolation, redaction, error privacy, and maximal 40-answer documents.
- **Browser pass:** `npm run test:browser:emulators` (5 tests), headless Chrome
  156.0.8078.47 with demo Auth/Firestore emulators. The M4 regression suite and
  M5 flow covered all five variants, an edit during delayed autosave followed by
  submit, lost submit/assessment responses and identical retries, three objective
  results, two pending ratings, reload and completion, completed history review,
  objective-only completion, a new UUID for retrying practice, and an old review
  response arriving after logout/account switch. The example model answer was
  absent from generated static assets.
- **Fail then resolved:** sandboxed browser/emulator port checks and the sandboxed
  build failed; the same checks passed outside the sandbox. The initial production
  audit reported three low findings in `shadcn`/`deepmerge`. `shadcn` is used by
  this app only for its build-time stylesheet and CLI, so the same locked version
  was moved to devDependencies; no package versions were raised. A build requires
  development dependencies to be installed. This reclassification does not fix
  the vulnerable tooling code.
- **Remaining risks:** the full dependency audit still reports eight development
  findings (three low through `shadcn`/`deepmerge`, five moderate through existing
  `firebase-tools` dependencies); no breaking dependency changes were applied.
  Real Google login, production Firestore indexes, and M3's native file picker
  remain unverified. Browser evidence is limited to the listed Chrome version and
  demo emulators; no production Firebase or deployment was accessed.

M5 is complete for its stated scope; M6 is eligible to begin and remains unstarted.

## Audit follow-up (2026-10-29, Asia/Tokyo)

The checkout started clean on main. Node 24.22.1/npm 11.19.1 and OpenJDK
21.0.12.1 were present; no Node selector or CI workflow was found. README,
AGENTS, and schema/architecture status text were stale; historical milestone
records above are retained. No application behavior or dependency versions were
changed, and M6 remains unstarted.

`package.json` and the lockfile now require Node >=24.15.0 <25; `.nvmrc`
selects the actually tested 24.22.1. Firebase Auth/Firestore require >=24.12.0,
Admin requires >=22, and the locked re2/node-gyp build chain requires
^22.22.2 || ^24.15.0 || >=26.0.0. Checking every locked engine relevant to
Linux x64 found no mismatch at 24.15.0 or 24.22.1. Only 24.22.1 was executed;
the lower bound is metadata-derived. The optional Windows ia32 sharp package
has a different platform-specific engine and is not installed on this platform.
Builds require devDependencies, including the shadcn stylesheet toolchain.

Dependency review used registry metadata, `npm ls`, official release notes, and
advisories on this date. Full audit exits 1 with eight affected package entries
(three low, five moderate), representing **three unique advisories**, all in
development dependency chains. Production-only audit exits 0 with no findings.

| Advisory | Locked path and finding | Decision and next action |
| --- | --- | --- |
| [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | firebase-tools 15.34.1 → @google-cloud/pubsub 5.3.1 → @opentelemetry/core 1.30.1; inbound baggage allocation | Patched core is 2.8.0, outside Pub/Sub's ^1.30.1 range. Await an upstream compatible parent release; do not force core 2 into the 1.x API. Keep emulator access on loopback and do not raise HTTP header limits. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | firebase-tools → gaxios 6.7.1 → uuid 9.0.1; caller-provided output-buffer bounds in v3/v5/v6 | Patched uuid 11.1.1 is outside gaxios's ^9.0.1 range. Await Firebase CLI's adoption of a patched gaxios/UUID chain; no major override or downgrade was applied. Application attempt IDs use crypto.randomUUID(). |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | shadcn 4.22.1 → deepmerge 4.3.1, also via @shadcn/registry 0.2.0; returned-object prototype poisoning | No patched deepmerge release is listed. Retain the required shadcn/tailwind.css import; review trusted registries/configuration before running the CLI, and revisit when upstream removes or patches deepmerge. Moving it to devDependencies previously did not remediate this advisory. |

Latest registry releases inspected: Firebase CLI 15.34.2 still depends on gaxios
^6.7.0 and Pub/Sub ^5.2.0; shadcn 4.23.0 still depends on deepmerge ^4.3.1
and registry 0.2.1. gaxios 6.7.1 and Pub/Sub 5.3.1 are already the latest in
those major lines, and deepmerge's latest is 4.3.1. Thus no compatible update
resolves these three advisories. The [Firebase release notes](https://github.com/firebase/firebase-tools/releases/tag/v15.34.2)
and [shadcn release notes](https://github.com/shadcn-ui/ui/releases/tag/shadcn@4.23.0),
plus [gaxios](https://github.com/googleapis/gaxios/blob/main/CHANGELOG.md),
[Pub/Sub](https://github.com/googleapis/nodejs-pubsub/blob/main/CHANGELOG.md), and
[deepmerge](https://github.com/TehShrike/deepmerge/blob/master/changelog.md)
changelogs were reviewed. Unrelated updates were deferred. npm's suggested
major downgrades and audit fix --force were not used.

Verification: npm ls --depth=0, lint, typecheck, unit tests (21), emulator tests
(9 HTTP + 3 rules), and browser emulator tests (5) passed on Node 24.22.1.
All emulator work used demo-learning-pwa and isolated test servers; each process
was awaited and shut down by its own harness. Full audit remains FAIL for the
explicitly documented development risks, not a clean-audit claim. Production
audit passed. Build passed outside the sandbox; final git diff --check passed.
The final diff contains only runtime metadata and documentation, with no package
version changes or application code changes.
No real Google login, production indexes, native OS file dialog, or BFCache
verification was performed. M6 has no new functional blocker from these changes,
but the development-tooling risks remain open.

## M6 — Skill progress and read-only Teacher Report

**Goal:** close the manual teacher feedback loop. **Prerequisite:** M5.
**Expected files:** analytics summary/service/UI, teacher schema/service/report UI,
progress and existing teacher/context route, unit/integration tests.

**Tasks:**

- [x] Aggregate exactly the documented latest-100 completed window, separating
      objective counts/accuracy from self ratings, with stable subject/skill IDs.
- [x] Build TeacherContext v1 from the same query; add at most 20 completed-work
      mistake samples, truncation markers, and static nextPackConstraints. No identity
      credentials, drafts, raw input instructions, or public sharing token.
- [x] Render owner-only report data after auth; add copy and JSON download via
      platform APIs. Label window, truncation, untrusted content, and manual handoff.
- [x] Test zero data, all-self data, mixed subjects, multi-skill counting, repeated
      attempts, label changes, 101+ completions, timestamp ties, incomplete sessions,
      truncation, two-user isolation, and exact report-schema validation.

**Acceptance/verification:** baseline/unit/emulator suites; report/progress counters
match fixtures; GET report makes no Firestore writes; 401/403/404 ownership behavior
and no-store headers verified. Copy/download parses; manual teacher input produces
a new-ID pack that validates and imports. Use a prepared second pack if live
ChatGPT is unavailable; no live LLM dependency is a release gate.
**Definition of Done:** all MVP capabilities exist, with completed-work-only
teacher handoff; no automatic integration or public report introduced.

### M6 evidence (2026-10-29)

Implemented owner-scoped completed-attempt aggregation and TeacherContext v1,
with progress and manual copy/download UI. The latest-100 window uses timestamp
and document-ID ordering; report samples are capped and truncated as specified.
The demo emulator tests cover 101 completions, timestamp ties, excluded incomplete
and future work, isolation, headers, schema and unchanged document update times.
The browser suite verifies copy and download, import of a prepared new-ID pack,
and account switching while a report request is pending. The prepared pack verifies
flow compatibility, not the quality of live model output.

`npm ls --depth=0`, `git diff --check`, lint, typecheck, 25 unit tests,
10 HTTP integration tests, 3 Firestore rules tests, 6 browser tests, the
production build, and `npm audit --omit=dev` passed. Tests used demo emulators;
no production data was accessed. Real Google login, production Firestore indexes,
the native file picker, and BFCache remain unverified. The previously documented
three unique development dependency advisories remain. M6 is complete; M7 is
eligible but has not started.

## M7 — Full-loop security and release-readiness verification

**Goal:** verify the complete user flow and operational prerequisites.
**Prerequisite:** M6; owner configuration required for real-provider/index checks.
**Expected files:** Playwright config/tests and package/lock, minimal CI workflow,
README operational setup, this plan's evidence/status. No new product capabilities.

**Tasks:**

- [ ] Add the browser tooling described above; test file upload and paste, errors,
      confirmation, duplicates, all renderers, saved resume, grading, self-review,
      history, progress, and report copy/download. Run keyboard/mobile-width checks.
- [ ] Browser/network tests prove practice/draft/RSC payloads and preloaded data
      contain no keys, untrusted text cannot execute, auth switch clears data, and a
      second UID cannot read/write the first user's resources. Verify report HTML,
      JSON, error responses, and browser back/sign-out behavior do not expose cached
      data. Admin credentials and example answer fixtures must not enter client bundles;
      public Firebase Web configuration is expected there.
- [ ] CI runs npm ci, lint, typecheck, unit tests, emulator integration/rules,
      build, and the small browser loop using supported Node/Java versions. Use no
      real credentials in CI. Include emulator binaries/browser availability explicitly.
- [ ] Prepare owner setup/release checklist: separate Vercel env scopes, Google
      domains, allowlist, Firestore rules/indexes, secret handling, index query smoke
      checks, real token revocation/disabled-user behavior, HTTPS/no-store headers.
      No deployment or resource provisioning without a later explicit request.

**Acceptance/verification:** all baseline scripts + `npm run test:unit`,
`npm run test:emulators`, `npm run test:e2e:emulators` pass; full loop uses no OpenAI
key and no live LLM. Document separately any production-equivalent smoke tests
that need owner configuration; never infer those from emulator success.
**Definition of Done:** reproducible full-loop/security evidence plus verified
owner-configured runtime/index/auth readiness. If no hosted environment is
authorized/available, record the external gate and leave M7 incomplete; deployment
is a separate user action, not an implied task.

### M7 evidence in progress (2026-10-30)

- Local environment: Node 24.22.1, npm 11.19.1, OpenJDK 21.0.12.1,
  Chrome 156.0.8078.47; demo Auth and Firestore emulators. `npm ls --depth=0`,
  lint, typecheck, 25 unit tests, 11 integration tests, 3 rules tests, and
  production build passed. Integration and rules ran with the demo project only.
- Production audit reported zero vulnerabilities. Full audit reported eight
  affected development package entries from the same three unique advisories
  previously recorded: GHSA-8988-4f7v-96qf, GHSA-gcqx-w48m-w2h4, and
  GHSA-w5hq-g745-h8pq. No forced dependency changes were applied.
- Added a CI workflow and the required `test:e2e:emulators` alias. Workflow YAML
  parses locally; GitHub Actions has not been run remotely. The browser harness
  and integration harness check port availability, wait for their own server and
  fail on readiness timeout. With a separately started dummy listener on port
  3100, the integration harness failed closed before sending it any requests;
  the dummy listener remained running until its own test cleaned it up.
- An additional audit found Next.js automatic OPTIONS responses lacked private
  cache headers. `/api/:path*` now supplies `private, no-store` and `Vary:
  Authorization` even for framework-generated responses. Integration checks cover
  OPTIONS and HEAD on all nine API routes. A local production-server smoke test
  confirmed those headers for GET/HEAD 401 and OPTIONS 204 on `/api/packs`.
- `npm run test:e2e:emulators` passed 10 browser tests, including a file import
  through saved resume, grading, self-review, history, report and follow-up
  paste import. It also exercised concurrent/conflicting saves, lost responses,
  account switches, report export and keyboard controls. A focused rerun of the
  full loop at 390px passed, including a keyboard focus check.
  Back/forward after sign-out showed no report data. Playwright normally disables
  BFCache, so the test now removes that default flag. Chrome still did not restore
  from BFCache; CDP reported main-resource and fetched-response `no-store`, a
  development WebSocket, and browsing-instance conditions. Actual restoration
  therefore remains unverified. The file-input check
  uses `setInputFiles`, not the native operating-system picker. Focused reruns
  passed after adding hostile text in labels, answers and explanations, and
  confirming static TeacherContext instructions remain unchanged.
- A focused rerun found the draft sentinel absent from pack and attempt GET
  responses, the rendered page, and a requested RSC prefetch response. The
  production static bundle contained neither the example's
  distinctive answer explanation nor the server private-key variable name.
  Firebase Web configuration is intentionally public. Source inspection found
  no registered service worker or raw HTML rendering; an unreferenced legacy
  service-worker source file is not a registered cache mechanism.
- A separate clean production build with browser source maps enabled only in the
  temporary copy was inspected without private environment values. Its 24 maps
  contained 499 source entries and no Firebase Admin, server Firestore, project
  server-only modules or example fixture path. All 46 generated JavaScript files
  lacked the Admin singleton marker and 11 distinctive explanation, model-answer
  and rubric texts from the fixture. Twenty-two JavaScript files had no source map
  in that build: 19 matched a numeric-only webpack wrapper pattern, the polyfill
  was byte-identical to the installed Next.js `polyfill-nomodule.js`, and the two
  remaining generated manifests were inspected as data and expected callbacks.
  In the actual local build, 16 of the 20 corresponding chunk files were byte-identical;
  the other four matched the same numeric-only wrapper pattern, and both manifests
  contained only the expected data, callback and `Set` syntax. These checks are
  specific to the local builds. The same 11 text and
  Admin-marker checks passed against all 46 JavaScript files in the actual local
  production build. Source maps were not
  enabled in the project configuration or claimed as hosted-build evidence.
- The workflow's individual lint, typecheck, unit, emulator, build and browser
  commands were run locally; `npm ci --include=dev` also passed in a separate
  temporary directory from the lockfile. In that directory, a production build
  passed with no `.env` files and a cleared environment; lint, typecheck, 25 unit,
  11 integration, 3 rules and 10 browser tests also passed using the installed
  demo emulator binaries and local Chrome override. The full workflow was not replayed as
  a GitHub Actions job; hosted CI remains unverified. CI now selects the managed
  Chromium installed by its workflow unless an executable override is set;
  configuration checks covered CI, local and override selection. The full-loop
  test passed locally with `CI=1` and the existing Chrome override. The managed
  CI browser itself was not installed or run locally.
- A read-only GitHub connector query for the current commit returned no
  pull-request-triggered workflow runs on its first page; that filtered result
  does not establish the absence of other runs. The M7 workflow and changes are
  uncommitted, so no remote run can be treated as verification of this worktree.
- Owner-configured Google sign-in/domains, hosted HTTPS and private headers,
  production indexes and query smoke tests, and real revoked-token/disabled-user
  checks remain unverified. Native OS file-picker interaction is distinct from
  Playwright file input. No deployment or cloud provisioning was performed.
- A read-only Vercel connector check found no project matching the repository URL
  or `japanese-learning` name in the authenticated personal scope or the one
  visible team. This does not rule out an environment in another account or
  hosting provider; no deployment or configuration was changed.
- A read-only Firebase Console inspection of the existing project named
  `japanese-learning` (project ID `japanese-learning-dc116`) showed a rules editor
  permitting all reads and writes until 2026-11-25, contrary to this repository's
  deny-all `firestore.rules`. The manual/composite indexes screen showed its
  empty-state rather than the two required indexes. The console did not show a
  publication status in the inspected view, and the project's relationship to
  the eventual release environment was not established at that time. No cloud
  changes or production-document reads were made during that inspection.
  A follow-up read-only inspection found no publication history in that console
  view, and the local Firebase CLI had no signed-in account; neither confirms which
  ruleset is active.
- A subsequent unauthenticated REST GET for a randomly generated, nonexistent
  document path in that Firebase project returned 404 `NOT_FOUND`, with the body
  suppressed; the equivalent probe against the demo emulator using the checked-in
  deny-all rules returned 403 `PERMISSION_DENIED`. This is evidence that anonymous
  reads are not denied for that path. It does not prove the displayed ruleset's
  complete contents or test write access; no document was created or read.
- In the same project's Authentication console, the Google provider was shown as
  enabled. Its authorized-domain table showed only `localhost`,
  `japanese-learning-dc116.firebaseapp.com` and `japanese-learning-dc116.web.app`.
  No release hostname has been identified for comparison, and no live sign-in
  was attempted; this observation does not establish hosted authentication readiness.
- Follow-up: the owner confirmed `japanese-learning-dc116` is dedicated to this
  application and published the checked-in deny-all rules. The console subsequently
  displayed `allow read, write: if false`, and an unauthenticated REST GET for a
  random nonexistent document returned 403 `PERMISSION_DENIED` with the body
  suppressed. This proves that read request was denied, not every operation or
  prior absence of exposure; the owner should assess potential earlier exposure.
  The manual index screen still showed no composite indexes, and Automatic index
  exemptions showed `0 of 0`: the two composites and five field exemptions in
  `firestore.indexes.json` were not visible. No cloud configuration was changed.
- The existing local listener on port 3000 returned 401 for an anonymous API
  request and 503 for a deliberately invalid bearer token, both with private
  no-store headers. The latter is consistent with unavailable server authentication
  configuration; no valid Firebase token was used, so real-project authenticated
  API access remains unverified. The emulator suite passed 11 integration and
  3 rules tests after the owner's rules publication, proving the demo flow only.
- The owner subsequently identified `http://localhost:3000/` as the running app.
  A repeat read-only check returned 401 anonymously and 503 `UNAVAILABLE`
  (`Authentication is not configured`) with an invalid bearer token. The app
  checks server configuration before token verification; authenticated access
  cannot yet be verified through this process. The listener was not stopped.
- The owner later supplied an Admin service-account file. Its project ID and
  key format were checked without displaying credentials; the repository copy
  was moved outside the repository, and the owner's duplicate and local env file
  were restricted to owner-only access. The Admin variables are now present in
  the ignored local environment. The owner supplied a UID for the test allowlist;
  configuration validation passed and the existing listener subsequently returned
  401 for an invalid bearer instead of 503. A valid-token request remains unverified.
  The local server was not stopped.
- The owner later reported signing in with the authorized test account and allowed
  inspection of only the localhost tab. Direct attachment to the previously known
  tab failed because its browser connection was unavailable; no browser inventory
  or other tab was read. A repeat local API check returned 401 for anonymous and
  invalid-token requests, with private/no-store and `Vary: Authorization`. The
  README now describes a manual status/header check that avoids sharing tokens or
  response bodies; a valid-token API response still requires that evidence.

## M8 — Optional PWA installability, after the verified core

**Goal:** installable online application, without claiming offline learning.
**Prerequisite:** M7 and an authorized HTTPS test environment (localhost for local
browser checks). **Expected files:** manifest, real icons, app metadata, and only
if the target browser requires it, a minimal service worker and registration.

**Tasks:** replace placeholder metadata/assets; remove/replace the unused push
example only within this milestone; verify target-browser installation criteria
before adding worker code. Do not cache APIs, report pages, authenticated payloads,
or answers. No push permission, offline queue, background sync, or LLM schedule.
Show an online-required state when unavailable.

**Acceptance/verification:** baseline scripts plus manifest/icon checks, browser
install/open check, sign-out/back privacy check, and offline failure display. If a
worker exists, network inspection proves private routes never enter Cache Storage.
**Definition of Done:** installation works in the recorded browser/version and
online-only limitations are documented; no full offline scope has slipped in.
