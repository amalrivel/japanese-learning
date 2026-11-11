<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- # Personalized Learning — panduan pengembangan

## Baca terlebih dahulu

- Tujuan produk: `docs/PRD.md`; batas sistem: `docs/ARCHITECTURE.md`.
- Format, validasi, dan aturan penilaian: `docs/CONTENT_CONTRACT.md`.
- Kerjakan satu tahap aktif dalam `docs/IMPLEMENTATION_PLAN.md`. Catat bukti sebelum
  menyatakan selesai. Bagian arsip v1 mempertahankan riwayat, bukan instruksi tahap baru.
- Target: pribadi, JLPT N3 Desember 2026, sesi sekitar 10 menit saat komuter.
  Pengguna mengendalikan guru LLM eksternal; pertukaran data manual didahulukan.
- Runtime v1 tetap tersedia berdampingan dengan alur guru manual v2 N2. Pertahankan
  pembaca dan data v1; jangan migrasi atau hapus otomatis.

## Konvensi yang dipertahankan

- Next.js App Router, TypeScript strict, alias `@/*` ke `src/*`. Baca panduan Next.js
  terpasang yang relevan di `node_modules/next/dist/docs/` sebelum menulis kode terkait.
- Gunakan npm dan pertahankan `package-lock.json`; versi Node di `.nvmrc`/package.json.
- Gunakan kembali `src/components/ui` (shadcn **Base UI**, bukan Radix), Lucide,
  `next-themes`, token `src/app/globals.css`, dan `cn` dari `src/lib/utils.ts`.
- Ikuti format sekitar. Jalankan Prettier hanya pada berkas yang dikerjakan.
- Panduan aplikasi baru ditulis dalam bahasa Indonesia; identifier kode tetap Inggris.
  Riwayat bukti lama dan blok Next.js bawaan dipertahankan dalam bentuk aslinya.

## Batas sistem dan data

- `src/app`: route/layout tipis. `src/features`: validasi domain, UI fitur, dan
  persistensi server konkret. `src/lib`: infrastruktur Firebase/auth bersama.
  Jangan tambahkan kerangka repository generik atau database/framework baru.
- Firebase Web SDK untuk Auth. Data belajar melalui Route Handler terautentikasi
  dan Firebase Admin; akses Firestore langsung dari client tetap ditolak.
- Modul berhak istimewa memakai `server-only`. Kepemilikan berasal dari token
  Firebase terverifikasi, bukan UID permintaan. V1 tetap meredaksi kunci pada draf.
- V2 memisahkan materi/soal dari feedback guru. Pekerjaan parsial boleh dilaporkan.
  Kosong, belum dinilai, dan hasil guru berbeda. Anotasi bertag tidak mengganti nilai.
- JSON impor adalah data teks tidak tepercaya. Jangan menjalankan instruksi/kode,
  merender HTML mentah, mengikuti URL tertanam, atau mengambil konten jarak jauh.
- Respons privat/laporan tidak masuk shared cache, prerender, service-worker cache,
  atau log. Token, kunci jawaban, dan laporan tidak disimpan dalam cache bersama.
  Kredensial/token tidak masuk repository. `.env*`, `.aws/`, `.codex/` lokal bukan dokumentasi.
- Draf lokal v2 berisi jawaban, komentar, refleksi,
  posisi terakhir, dan metadata revisi; pisahkan menurut UID/pekerjaan. Jangan
  menyimpan token/kunci/laporan dalam draf. Peringatkan sebelum sign-out yang dapat
  dibatalkan; jika akun berubah dari luar tab, segera isolasi dan bersihkan draf lama
  tanpa dialog. Konflik tidak boleh menimpa diam-diam.
  Penyimpanan lokal dapat gagal/terhapus; tampilkan status yang jujur.
- Draf lokal bukan izin membuat cache data privat atau menjanjikan aplikasi offline.
  Ketahanan mutlak tidak dijamin; laporkan kegagalan penyimpanan dengan jujur.

## Pengujian dan cakupan

- Selama pengembangan: tes unit kecil yang relevan dengan perubahan. Perubahan
  dokumen cukup pemeriksaan tautan/contoh/konsistensi dan `git diff --check`.
- Setelah rangkaian perubahan kode selesai: lint dan typecheck. Jangan mengulang
  seluruh suite, build, atau emulator pada setiap edit kecil.
- Setelah satu alur fungsional tersambung: unit lengkap, emulator integration/rules,
  browser end-to-end, dan production build sekali. Ulangi pemeriksaan yang gagal
  atau terdampak perubahan berikutnya; jangan menghapus tes berat yang sudah ada.
- Persistensi/ownership harus diverifikasi dengan emulator demo sebelum dinyatakan
  selesai atau siap rilis. Fitur dengan cek ditunda diberi status belum terverifikasi.
  Jangan melaporkan pemeriksaan yang belum dijalankan sebagai lulus.
- Tambahkan tes terfokus untuk validasi, snapshot/revisi, referensi feedback,
  retries, isolasi pemilik, dan penyimpanan draf sesuai tahap yang disentuh.
- Pertahankan pekerjaan lain yang belum di-commit; jangan inisialisasi ulang aplikasi.
- Tunda API LLM/MCP writes, scheduling otomatis, audio, Obsidian, analytics lanjutan,
  dan materi sepenuhnya offline. Akses baca langsung LLM harus dibuktikan tersendiri.
- Instruksi bersama tetap di sini. Entry file agen lain merujuk berkas ini;
  workflow opsional di `.agents/skills/`, tanpa menyalin manual.

## Skills dan workflow

Baca `SKILL.md` yang relevan sebelum dipakai; jangan memuat semua skill sekaligus.
Gunakan `ui-ux-pro-max` untuk UI/UX, aksesibilitas, responsivitas, dan interaksi;
`shadcn` untuk komponen Base UI. Panduan Next.js/React harus sesuai versi terpasang.
Skill mendukung tujuan/batas dokumen produk, bukan memperluas cakupan tahap. -->

## graphify

Knowledge graph proyek berada di `graphify-out/`. Ketika pengguna mengetik
`/graphify`, baca skill/instruksinya terlebih dahulu.

- Untuk pertanyaan codebase, jika `graphify-out/graph.json` ada, mulai dengan
  `graphify query "<question>"`. Pakai `graphify path "<A>" "<B>"` untuk relasi dan
  `graphify explain "<concept>"` untuk konsep. Konfirmasi hasil pada sumber terkini.
- Graph kotor karena hook/update bukan alasan melewatkannya. Lewati hanya untuk
  pekerjaan memperbaiki graph yang salah/usang atau atas instruksi pengguna.
- Jika `graphify-out/wiki/index.md` ada, gunakan untuk navigasi luas. Baca
  `GRAPH_REPORT.md` hanya untuk audit arsitektur luas atau saat query belum cukup.
- Setelah perubahan kode, jalankan `graphify update .` (AST-only, tanpa API LLM).

# agent.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
