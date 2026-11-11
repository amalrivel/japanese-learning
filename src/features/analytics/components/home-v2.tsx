"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, BookOpen, Clock3, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { request } from "@/features/practice/client/request";
import type { LearningWorkV2 } from "@/features/practice/model/work-schema-v2";

type Pack = { id: string; title: string };
type Home = { pack: Pack | null; work: LearningWorkV2 | null };
type Page = { items: Pack[]; nextCursor: string | null };
export function HomeV2() {
  const { user } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [packs, setPacks] = useState<Page>({ items: [], nextCursor: null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const cancel = () => {
      controller.abort();
      setHome(null);
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
      const [h, list] = await Promise.allSettled([
        get<Home>("/api/v2/home"),
        get<Page>("/api/v2/packs"),
      ]);
      if (controller.signal.aborted) return;
      if (h.status === "fulfilled") setHome(h.value);
      if (list.status === "fulfilled") setPacks(list.value);
      if ([h, list].some((item) => item.status === "rejected"))
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
    <main className="learning-page flex flex-col gap-5 sm:gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <GraduationCap className="size-5" aria-hidden="true" /> Personalized Learning
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Selamat belajar<span className="text-muted-foreground">.</span>
          </h1>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            Sedikit setiap hari, semakin dekat dengan tujuanmu.
          </p>
        </div>
      </header>
      <section
        aria-label="Target belajar"
        className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8"
      >
        <div className="relative z-10 max-w-lg">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4" aria-hidden="true" /> RUANG BELAJAR JEPANG
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Satu sesi kecil.
            <br />
            Satu langkah lebih maju.
          </h2>
          <p className="mt-3 leading-relaxed opacity-80">
            Luangkan 10 menit untuk membaca, berlatih, dan menemukan hal baru.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-current/25 px-3 py-1.5">
              JLPT N3 · Desember 2026
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-current/25 px-3 py-1.5">
              <Clock3 className="size-4" aria-hidden="true" /> 10 menit / sesi
            </span>
          </div>
          <Link
            href="/manual"
            className={buttonVariants({
              variant: "secondary",
              className: "mt-6 min-h-12 w-full justify-between px-4 sm:w-auto sm:gap-10",
            })}
          >
            Mulai belajar <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
        <span
          aria-hidden="true"
          lang="ja"
          className="pointer-events-none absolute -right-4 top-5 select-none text-[160px] font-bold leading-none opacity-[0.06] sm:right-8 sm:text-[220px]"
        >
          学
        </span>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="size-5 text-muted-foreground" aria-hidden="true" /> Sesi berikutnya
        </h2>
        {!home ? (
          <p>{error ? "Sesi tidak dapat dimuat." : "Memuat sesi…"}</p>
        ) : home.pack ? (
          <>
            <p>{home.pack.title}</p>
            <Link
              className="underline"
              href={`/manual/study?pack=${encodeURIComponent(home.pack.id)}`}
            >
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
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold">Lanjutkan pekerjaan</h2>
        {!home ? (
          <p>{error ? "Pekerjaan tidak dapat dimuat." : "Memuat pekerjaan…"}</p>
        ) : home.work ? (
          <p>
            {packs.items.find((item) => item.id === home.work?.packId)?.title ??
              "Latihan tersimpan"}{" "}
            · revisi {home.work.revision} ·{" "}
            <Link
              className="underline"
              href={`/manual/study?work=${encodeURIComponent(home.work.id)}`}
            >
              Lanjutkan
            </Link>
          </p>
        ) : (
          <p>Belum ada pekerjaan yang sedang dikerjakan.</p>
        )}
      </section>
      <section className="rounded-2xl bg-muted/60 p-5 text-sm leading-relaxed sm:p-6">
        <h2 className="text-xl font-semibold">Pasang di layar utama</h2>
        <p>
          Di Android, gunakan menu browser dan pilih Pasang aplikasi atau Tambahkan ke layar utama.
          Di iPhone, gunakan Bagikan lalu Tambah ke Layar Utama. Nama menu dapat berbeda; aplikasi
          memerlukan koneksi internet.
        </p>
      </section>
      <nav aria-label="Navigasi belajar" className="grid gap-3 sm:grid-cols-2">
        {[
          ["Baca materi belajar", "/manual/materials"],
          ["Lanjutkan latihan saya", "/manual/works"],
          ["Impor materi atau feedback", "/manual/import"],
          ["Bagikan jawaban ke guru", "/manual/teacher"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {label}{" "}
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </main>
  );
}
