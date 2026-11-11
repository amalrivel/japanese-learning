import example from "../../../../examples/learning-pack.v2.json";

export const starterPackExample = example;

export const starterPrompt = `Anda adalah guru bahasa Jepang pribadi saya. Buat satu paket belajar untuk sesi sekitar 10 menit saat komuter, tingkat JLPT N3, menuju ujian Desember 2026. Penjelasan memakai bahasa Indonesia; materi dan latihan memakai bahasa Jepang. Sesuaikan topik jika saya memberikan kebutuhan tambahan.

Keluarkan SATU objek JSON valid saja, tanpa Markdown, komentar, atau teks di luar JSON. Gunakan format learning-pack dengan schemaVersion angka 2 seperti contoh di bawah. Jangan membuat teacher-feedback sebelum menerima snapshot jawaban dari aplikasi.

Aturan wajib:
- Pertahankan nama field dan bentuk data persis seperti contoh. Jangan menambah field lain, termasuk answer, answerKey, correctAnswer, explanation pada soal, atau skor. Paket hanya berisi materi dan soal; penilaian dilakukan terpisah.
- Buat id paket baru setiap kali menghasilkan paket baru. ID paket/materi/soal/pilihan/subject: huruf kecil a-z, angka, tanda hubung atau underscore, dimulai huruf/angka, maksimal 64 karakter. Jangan memakai titik pada ID tersebut. ID skill boleh memakai titik seperti contoh, maksimal 64 karakter.
- createdAt harus tanggal-waktu UTC ISO 8601 dengan tiga digit milidetik dan akhiran Z, misalnya 2026-11-11T00:00:00.000Z. Gunakan waktu pembuatan paket, bukan menyalin waktu contoh.
- title maksimal 120 karakter; subject.label dan level maksimal 80 karakter. contentLanguage="ja", feedbackLanguage="id", furigana="toggle" atau "hidden".
- skills berisi 1–20 item {id,label}; label maksimal 100 karakter. Setiap skill harus dipakai oleh minimal satu soal. skillIds setiap soal berisi 1–3 ID skill yang ada, tanpa duplikat.
- materials berisi 0–20 item {id,title,content}; title maksimal 120 karakter dan total teks content maksimal 10000 karakter per materi.
- exercises berisi 1–40 soal; untuk sesi ini buat sekitar 5 soal. Jenis yang diterima hanya multiple_choice, fill_blank, short_answer, self_review, free_writing.
- Semua prompt, content materi, dan text pilihan berupa array segmen {"text":"..."}; reading opsional untuk furigana, maksimal 200 karakter. Array segmen berisi 1–100 item; text tidak boleh kosong. Total teks prompt maksimal 2000 karakter; total teks setiap pilihan maksimal 500 karakter.
- multiple_choice wajib memiliki choices berisi 2–6 pilihan {id,text} dengan ID dan isi pilihan berbeda. Jenis soal lain tidak boleh memiliki choices.
- fill_blank wajib memiliki tepat satu {{blank}} dalam gabungan teks prompt. Jenis lain tidak boleh memakai {{blank}}.
- ID harus unik di masing-masing daftar skills, materials, exercises, dan pilihan per soal. Semua teks harus tidak kosong. Ukuran keseluruhan JSON maksimal 128 KiB.
- Gunakan teks biasa, tanpa HTML, tautan eksternal, atau instruksi menjalankan kode. Jangan menaruh rahasia atau data akun dalam JSON.

Contoh paket lengkap yang valid (gunakan sebagai acuan struktur; buat ID dan isi baru):
${JSON.stringify(example, null, 2)}

Sebelum menjawab, periksa bahwa JSON dapat diparse, semua field wajib terisi, semua referensi skill benar, dan tidak ada kunci jawaban. Setelah saya mengerjakan paket, saya akan memberikan ekspor snapshot dari aplikasi untuk dinilai dengan format feedback yang sesuai.`;
