"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/lib/auth/client";
import { request } from "@/features/practice/request";
import type { ProgressV2 } from "./progress-v2.server";
import type { LearningWorkV2 } from "@/features/practice/work-schema-v2";

type Pack = { id: string; title: string };
type Home = { pack: Pack | null; work: LearningWorkV2 | null };
type Page = { items: Pack[]; nextCursor: string | null };
const date = (value: string) =>
  new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
function WindowLabel({ window: w }: { window: ProgressV2["workWindow"] }) {
  return (
    <p>
      {w.count} dokumen{w.oldest && w.newest ? ` · ${date(w.oldest)} – ${date(w.newest)}` : ""}
      {w.truncated ? " · Data lebih lama tidak tercakup." : ""}
    </p>
  );
}
export function HomeV2() {
  const { user } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [progress, setProgress] = useState<ProgressV2 | null>(null);
  const [packs, setPacks] = useState<Page>({ items: [], nextCursor: null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const cancel = () => {
      controller.abort();
      setHome(null);
      setProgress(null);
      setPacks({ items: [], nextCursor: null });
      setError("");
    };
    window.addEventListener("learning:account-change", cancel);
    async function load() {
      const get = async <T,>(url: string): Promise<T> => {
        const res = await request(user!, controller.signal, url);
        if (!res.ok) throw new Error();
        return res.json() as Promise<T>;
      };
      const [h, p, list] = await Promise.allSettled([
        get<Home>("/api/v2/home"),
        get<ProgressV2>("/api/v2/progress"),
        get<Page>("/api/v2/packs"),
      ]);
      if (controller.signal.aborted) return;
      if (h.status === "fulfilled") setHome(h.value);
      if (p.status === "fulfilled") setProgress(p.value);
      if (list.status === "fulfilled") setPacks(list.value);
      if ([h, p, list].some((item) => item.status === "rejected"))
        setError("Sebagian data belum dapat dimuat. Periksa koneksi lalu muat ulang.");
    }
    void load();
    return () => {
      controller.abort();
      window.removeEventListener("learning:account-change", cancel);
    };
  }, [user]);
  async function select(packId: string | null) {
    if (!user) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const cancel = () => controller.abort();
    window.addEventListener("learning:account-change", cancel);
    try {
      const res = await request(user, controller.signal, "/api/v2/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) throw new Error();
      if (!controller.signal.aborted)
        setHome((current) =>
          current
            ? { ...current, pack: packs.items.find((p) => p.id === packId) ?? null }
            : current,
        );
    } catch {
      if (!controller.signal.aborted) setError("Pilihan sesi gagal disimpan.");
    } finally {
      window.removeEventListener("learning:account-change", cancel);
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function more() {
    if (!user || !packs.nextCursor) return;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    window.addEventListener("learning:account-change", cancel);
    try {
      const res = await request(
        user,
        controller.signal,
        `/api/v2/packs?cursor=${encodeURIComponent(packs.nextCursor)}`,
      );
      if (!res.ok) throw new Error();
      const page = (await res.json()) as Page;
      if (!controller.signal.aborted)
        setPacks((old) => ({ items: [...old.items, ...page.items], nextCursor: page.nextCursor }));
    } catch {
      if (!controller.signal.aborted) setError("Daftar paket gagal dimuat.");
    } finally {
      window.removeEventListener("learning:account-change", cancel);
    }
  }
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Personalized Learning</p>
          <h1 className="text-3xl font-semibold">Selamat belajar</h1>
          <p>Target JLPT N3 · Desember 2026 · sekitar 10 menit per sesi</p>
        </div>
        <ModeToggle />
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Sesi berikutnya</h2>
        {!home ? (
          <p>{error ? "Sesi tidak dapat dimuat." : "Memuat sesi…"}</p>
        ) : home.pack ? (
          <>
            <p>{home.pack.title}</p>
            <Link className="underline" href={`/manual?pack=${encodeURIComponent(home.pack.id)}`}>
              Lihat materi dan mulai
            </Link>
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy}
              onClick={() => void select(null)}
            >
              Hapus pilihan
            </Button>
          </>
        ) : (
          <p>
            Belum dipilih. Pilih paket di bawah atau{" "}
            <Link href="/manual" className="underline">
              impor paket
            </Link>
            .
          </p>
        )}
        <details>
          <summary className="cursor-pointer py-3">Pilih atau ganti sesi</summary>
          <div className="flex flex-col gap-2">
            {packs.items.map((p) => (
              <Button
                key={p.id}
                className="min-h-11"
                variant="outline"
                disabled={busy}
                onClick={() => void select(p.id)}
              >
                {p.title}
              </Button>
            ))}
            {packs.nextCursor && (
              <Button className="min-h-11" variant="outline" onClick={() => void more()}>
                Paket lainnya
              </Button>
            )}
          </div>
        </details>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Lanjutkan pekerjaan</h2>
        {!home ? (
          <p>{error ? "Pekerjaan tidak dapat dimuat." : "Memuat pekerjaan…"}</p>
        ) : home.work ? (
          <p>
            {home.work.packId} · revisi {home.work.revision} ·{" "}
            <Link className="underline" href={`/manual?work=${encodeURIComponent(home.work.id)}`}>
              Lanjutkan
            </Link>
          </p>
        ) : (
          <p>Belum ada pekerjaan yang sedang dikerjakan.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Progres v2</h2>
        {progress && (
          <>
            <h3 className="font-medium">Aktivitas tersimpan</h3>
            <WindowLabel window={progress.workWindow} />
            <p>
              {progress.answered} dari {progress.questions} soal dijawab;{" "}
              {progress.questions - progress.answered} belum dijawab.
            </p>
            <h3 className="font-medium">Hasil guru</h3>
            <WindowLabel window={progress.assessmentWindow} />
            <p>
              Jawaban tanpa hasil di sini: tidak ditemukan penilaian dalam jendela. Data di luar
              jendela tidak diketahui.
            </p>
            {progress.skills.map((s) => (
              <p key={s.label}>
                {s.label}: {s.correct} benar, {s.partial} sebagian, {s.incorrect} belum tepat dari{" "}
                {s.correct + s.partial + s.incorrect} penilaian.
              </p>
            ))}
            {progress.results.map((r) => (
              <p key={r.id}>
                {date(r.importedAt)} · {r.title}, revisi {r.revision}: {r.correct} benar,{" "}
                {r.partial} sebagian, {r.incorrect} belum tepat dari{" "}
                {r.correct + r.partial + r.incorrect} soal dinilai. Tanggal guru:{" "}
                {date(r.teacherCreatedAt)}.
              </p>
            ))}
            <p className="text-sm text-muted-foreground">
              Waktu ditampilkan dalam zona perangkat:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}. Penilaian revisi berbeda bukan
              pekerjaan baru atau ukuran penguasaan.
            </p>
          </>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Pasang di layar utama</h2>
        <p>
          Di Android, gunakan menu browser dan pilih Pasang aplikasi atau Tambahkan ke layar utama.
          Di iPhone, gunakan Bagikan lalu Tambah ke Layar Utama. Nama menu dapat berbeda; aplikasi
          memerlukan koneksi internet.
        </p>
      </section>
      <nav aria-label="Navigasi belajar" className="grid gap-3 sm:grid-cols-2">
        {[
          ["Alur guru manual v2", "/manual"],
          ["Latihan v1", "/practice"],
          ["Riwayat v1", "/history"],
          ["Progres v1", "/progress"],
          ["Impor v1", "/import"],
          ["Laporan guru v1", "/teacher/report"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="rounded-lg border p-4 font-medium hover:bg-muted">
            {label} →
          </Link>
        ))}
      </nav>
    </main>
  );
}
