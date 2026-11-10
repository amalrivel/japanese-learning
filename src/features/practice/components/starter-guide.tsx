"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { starterPrompt } from "../model/starter-prompt";

export function StarterGuide() {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(starterPrompt);
      setStatus("Prompt tersalin. Tempel ke guru AI pilihan Anda.");
    } catch {
      setStatus(
        "Prompt belum tersalin. Buka teks prompt di bawah, pilih semua, lalu salin manual.",
      );
    }
  }
  return (
    <section aria-labelledby="starter-heading" className="flex flex-col gap-4">
      <h2 id="starter-heading" className="flex items-center gap-2 text-xl font-semibold">
        <Sparkles className="size-5" aria-hidden="true" /> Mulai dengan guru AI
      </h2>
      <p className="text-muted-foreground">
        Belum punya materi? Gunakan prompt ini agar guru AI membuat JSON sesuai format aplikasi.
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
        <li>
          Salin prompt dan tempel ke chat guru AI. Tambahkan topik atau kesulitan yang ingin
          dilatih.
        </li>
        <li>
          Salin JSON yang dihasilkan, lalu tempel di{" "}
          <Link href="/manual/import" className="underline underline-offset-4">
            Impor paket atau feedback
          </Link>
          .
        </li>
        <li>
          Pilih Pratinjau. Jika valid, konfirmasi impor dan mulai latihan. Jika ditolak, kirim pesan
          kesalahannya ke guru AI untuk diperbaiki.
        </li>
      </ol>
      <Button className="w-full sm:w-fit" variant="outline" onClick={() => void copy()}>
        <Copy aria-hidden="true" /> Salin prompt awal
      </Button>
      {status && (
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      )}
      <details className="rounded-xl border bg-background p-4">
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          Lihat atau salin prompt secara manual
        </summary>
        <label htmlFor="starter-prompt" className="mt-4 block text-sm text-muted-foreground">
          Prompt untuk guru AI — dapat dipilih dan disalin
        </label>
        <textarea
          id="starter-prompt"
          readOnly
          value={starterPrompt}
          rows={12}
          className="mt-2 font-mono text-sm"
        />
      </details>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Prompt membantu mengikuti format; hasil AI tetap harus lolos pratinjau. Untuk penilaian,
        kerjakan latihan lalu bagikan snapshot lewat bagian “Snapshot dan feedback guru”. Paket awal
        tidak menyertakan kunci jawaban.
      </p>
    </section>
  );
}
