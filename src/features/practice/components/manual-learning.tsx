"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  parseLearningDataV2,
  type TeacherContextV2,
} from "@/features/analytics/model/teacher-schema-v2";
import { canonicalJson } from "@/features/content/model/schema";
import type { LearningPackV2 } from "@/features/content/model/schema-v2";
import { useAuth } from "@/lib/auth/client";
import { request } from "../client/request";
import type { LearningWorkV2 } from "../model/work-schema-v2";
import { CommuterWork } from "./commuter-work";
import type { DraftView } from "../drafts/commuter-draft";
import { normalizeCopiedJson } from "../model/import-text";
import { StarterGuide } from "./starter-guide";

type PackItem = { id: string; title: string };
type SnapshotItem = { id: string; title: string; workId: string; revision: number };
type Preview = Extract<
  NonNullable<ReturnType<typeof parseLearningDataV2>["data"]>,
  { kind: "learning-pack" | "teacher-feedback" }
>;
type Page<T> = { items: T[]; nextCursor: string | null };
type Editable = Pick<LearningWorkV2, "answers" | "reflection" | "currentExerciseId">;
const editable = (work: LearningWorkV2): Editable => ({
  answers: work.answers,
  reflection: work.reflection,
  currentExerciseId: work.currentExerciseId,
});
const outcomeLabel = { correct: "benar", partial: "sebagian", incorrect: "belum tepat" } as const;

export function ManualLearning() {
  const pathname = usePathname();
  const router = useRouter();
  const queryString = useSearchParams().toString();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const page = pathname.split("/")[2] || "overview";
  const headings: Record<string, [string, string]> = {
    overview: [
      "Ruang belajar",
      "Pilih satu langkah. Semua kebutuhan belajar tersedia di halaman yang terpisah.",
    ],
    guide: ["Panduan guru AI", "Siapkan materi yang cocok dengan format aplikasi."],
    import: [
      "Impor materi dan feedback",
      "Tempel JSON, periksa pratinjau, lalu konfirmasi penyimpanan.",
    ],
    materials: [
      "Materi belajar",
      "Baca materi terlebih dahulu, kemudian lanjutkan latihan pada paket yang sama.",
    ],
    works: ["Latihan saya", "Pilih paket belajar atau lanjutkan pekerjaan yang tersimpan."],
    study: ["Latihan", "Fokus pada materi dan jawaban Anda, satu langkah pada satu waktu."],
    teacher: [
      "Berbagi dengan guru",
      "Pilih snapshot jawaban untuk disalin atau diunduh ke guru AI.",
    ],
  };
  const [title, description] = headings[page] || headings.overview;
  const { user } = useAuth();
  const [packs, setPacks] = useState<Page<PackItem>>({ items: [], nextCursor: null });
  const [works, setWorks] = useState<
    Page<LearningWorkV2 & { packTitle?: string; reviewed?: boolean }>
  >({
    items: [],
    nextCursor: null,
  });
  const [snapshots, setSnapshots] = useState<Page<SnapshotItem>>({ items: [], nextCursor: null });
  const [pack, setPack] = useState<LearningPackV2 | null>(null);
  const [work, setWork] = useState<LearningWorkV2 | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [selected, setSelected] = useState<string[]>([]);
  const [context, setContext] = useState<TeacherContextV2 | null>(null);
  const [message, setMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReading, setShowReading] = useState(true);
  const [draftView, setDraftView] = useState<DraftView | null>(null);
  const pending = draftView?.pending ?? false;
  const controller = useRef<AbortController | null>(null);
  const fileGeneration = useRef(0);
  const startIds = useRef<Record<string, string>>({});
  const snapshotIds = useRef<Record<string, string>>({});
  const dirty = !!work && !!draft && canonicalJson(editable(work)) !== canonicalJson(draft);

  useEffect(() => {
    const active = new AbortController();
    controller.current = active;
    const onAccountChange = () => {
      active.abort();
      fileGeneration.current++;
    };
    window.addEventListener("learning:account-change", onAccountChange);
    return () => {
      active.abort();
      window.removeEventListener("learning:account-change", onAccountChange);
      controller.current = null;
    };
  }, [user?.uid]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty || pending) event.preventDefault();
    }
    function signout(event: Event) {
      if (dirty || pending) {
        if (!window.confirm("Ada pekerjaan yang belum dipastikan tersimpan. Keluar?"))
          event.preventDefault();
        else if (event instanceof CustomEvent) event.detail.confirmed = true;
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("learning:signout", signout);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("learning:signout", signout);
    };
  }, [dirty, pending]);

  async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
    if (!user || !controller.current) throw new Error("Sesi tidak tersedia.");
    const signal = controller.current.signal;
    const response = await request(user, signal, url, init);
    const value = await response.json();
    if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");
    if (!response.ok) {
      const error = new Error(value.error?.message ?? "Permintaan gagal.");
      Object.assign(error, { status: response.status });
      throw error;
    }
    return value as T;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage(error instanceof Error ? error.message : "Permintaan gagal.");
    } finally {
      if (!controller.current?.signal.aborted) setBusy(false);
    }
  }
  async function refresh() {
    const [p, w, s] = await Promise.all([
      call<Page<PackItem>>("/api/v2/packs"),
      call<Page<LearningWorkV2 & { packTitle?: string; reviewed?: boolean }>>("/api/v2/works"),
      call<Page<SnapshotItem>>("/api/v2/snapshots"),
    ]);
    setPacks(p);
    setWorks(w);
    setSnapshots(s);
  }
  useEffect(() => {
    if (user)
      void Promise.resolve()
        .then(refresh)
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError"))
            setMessage("Daftar tidak dapat dimuat.");
        });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return;
    let active = true;
    const params = new URLSearchParams(queryString);
    const oldSection = { "#impor": "import", "#pekerjaan": "works", "#guru": "teacher" }[
      window.location.hash
    ];
    if (pathname === "/manual" && oldSection) {
      router.replace(`/manual/${oldSection}`);
      return;
    }
    const workId = params.get("work");
    const packId = params.get("pack");
    if ((workId || packId) && pathname === "/manual") {
      router.replace(`/manual/study?${params.toString()}`);
      return;
    }
    if (pathname !== "/manual/study") return;
    if (workId && work?.id !== workId)
      void Promise.resolve().then(() =>
        run(async () => {
          const result = await call<{
            work: LearningWorkV2;
            pack: LearningPackV2;
            reviewed?: boolean;
          }>(`/api/v2/works/${encodeURIComponent(workId)}`);
          if (!active) return;
          setWork(result.work);
          setReviewed(Boolean(result.reviewed));
          setPack(result.pack);
          setDraft(editable(result.work));
          setDraftView(null);
        }),
      );
    else if (packId && (pack?.id !== packId || work))
      void Promise.resolve().then(() =>
        run(async () => {
          const result = await call<{ pack: LearningPackV2 }>(
            `/api/v2/packs/${encodeURIComponent(packId)}`,
          );
          if (!active) return;
          setPack(result.pack);
          setWork(null);
          setDraft(null);
          setDraftView(null);
        }),
      );
    return () => {
      active = false;
    };
  }, [user, pathname, queryString]); // eslint-disable-line react-hooks/exhaustive-deps
  async function nextPage<T>(url: string, page: Page<T>, setPage: (page: Page<T>) => void) {
    if (!page.nextCursor) return;
    const next = await call<Page<T>>(`${url}?cursor=${encodeURIComponent(page.nextCursor)}`);
    setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor });
  }
  function confirmLeave() {
    return (
      !(dirty || pending) || window.confirm("Perubahan belum dipastikan tersimpan. Lanjutkan?")
    );
  }
  useEffect(() => {
    const guard = (event: Event) => {
      if ((dirty || pending) && !window.confirm("Perubahan belum dipastikan tersimpan. Lanjutkan?"))
        event.preventDefault();
    };
    window.addEventListener("learning:before-navigate", guard);
    return () => window.removeEventListener("learning:before-navigate", guard);
  }, [dirty, pending]);
  function previewRaw(value: string) {
    setImportMessage("");
    setRaw(value);
    setPreview(undefined);
    setMessage("");
    setImportError("");
    let result = parseLearningDataV2(value);
    let normalized = value;
    if (result.error === "INVALID_JSON") {
      normalized = normalizeCopiedJson(value);
      result = parseLearningDataV2(normalized);
    }
    if (result.error) {
      const messages = {
        INVALID_JSON:
          "Format JSON tidak valid. Salin isi blok kode dari guru atau pilih file .json; pastikan kutip dan kurung lengkap.",
        PAYLOAD_TOO_LARGE:
          "JSON terlalu besar. Paket maksimal 128 KiB dan feedback 384 KiB. Kurangi isi lalu coba lagi.",
        UNSUPPORTED_VERSION:
          "Versi JSON tidak didukung. Minta guru menggunakan format terbaru dengan schemaVersion berupa angka 2.",
        VALIDATION_FAILED: `Struktur JSON tidak sesuai format v2. Periksa bagian: ${result.issues?.join(", ") || "root"}. Minta guru memperbaiki bagian tersebut sesuai kontrak v2.`,
      };
      setImportError(messages[result.error]);
      return;
    }
    if (
      !result.data ||
      (result.data.kind !== "learning-pack" && result.data.kind !== "teacher-feedback")
    ) {
      setImportError(
        "Pilih JSON learning-pack atau teacher-feedback. Pekerjaan dan konteks ekspor bukan berkas impor.",
      );
      return;
    }
    if (normalized !== value) {
      setRaw(normalized);
      setMessage("Format salinan dibersihkan. Periksa pratinjau sebelum mengonfirmasi impor.");
    }
    setPreview(result.data);
  }
  async function openWork(id: string, confirmed = false) {
    if (work?.id === id) {
      router.push(`/manual/study?work=${encodeURIComponent(id)}`);
      return;
    }
    if (!confirmed && !confirmLeave()) return;
    const result = await call<{ work: LearningWorkV2; pack: LearningPackV2; reviewed?: boolean }>(
      `/api/v2/works/${id}`,
    );
    setWork(result.work);
    setReviewed(Boolean(result.reviewed));
    setPack(result.pack);
    router.push(`/manual/study?work=${encodeURIComponent(id)}`);
    setDraft(editable(result.work));
    setDraftView(null);
  }
  const inputClass = "w-full rounded-md border bg-background p-2 text-base";
  const parent =
    page === "guide" ||
    page === "import" ||
    (page === "study" && new URLSearchParams(queryString).has("pack"))
      ? { href: "/manual/materials", label: "Kembali ke materi belajar" }
      : page === "teacher" || page === "study"
        ? { href: "/manual/works", label: "Kembali ke latihan saya" }
        : null;
  return (
    <main className="learning-page flex flex-col gap-6">
      <div>
        {parent && (
          <Link
            href={parent.href}
            className={buttonVariants({ variant: "ghost", className: "mb-2" })}
            onClick={(event) => {
              if (!confirmLeave()) event.preventDefault();
            }}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            {parent.label}
          </Link>
        )}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
      {message && (
        <p role="status" className="rounded-md border p-3">
          {message}
        </p>
      )}
      {page === "materials" && (
        <div className="flex flex-wrap gap-3">
          <Link href="/manual/guide" className={buttonVariants({ variant: "outline" })}>
            Panduan AI
          </Link>
          <Link href="/manual/import" className={buttonVariants()}>
            Impor materi atau feedback
          </Link>
        </div>
      )}
      {page === "works" && (
        <div className="flex flex-wrap gap-3">
          {work && (
            <Link
              href={`/manual/study?work=${encodeURIComponent(work.id)}`}
              className={buttonVariants()}
            >
              Lanjutkan latihan aktif
            </Link>
          )}
          <Link href="/manual/teacher" className={buttonVariants({ variant: "outline" })}>
            Ruang guru
          </Link>
        </div>
      )}
      {page === "overview" && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Apa yang ingin Anda lakukan?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "/manual/guide",
                "1. Siapkan materi",
                "Salin prompt untuk guru AI agar menghasilkan JSON yang sesuai.",
              ],
              [
                "/manual/import",
                "2. Impor JSON",
                "Masukkan materi atau feedback dan periksa sebelum menyimpan.",
              ],
              [
                "/manual/works",
                "3. Mulai atau lanjutkan",
                "Buka paket dan pekerjaan yang sudah tersimpan.",
              ],
              [
                "/manual/teacher",
                "4. Minta feedback guru",
                "Bagikan snapshot jawaban, lalu impor penilaian guru.",
              ],
            ].map(([href, label, detail]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="block font-semibold">{label}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{detail}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {page === "guide" && <StarterGuide />}
      {page === "study" && !pack && (
        <section className="flex flex-col gap-3">
          <p>Pilih paket atau pekerjaan terlebih dahulu untuk mulai belajar.</p>
          <Link href="/manual/works" className="underline">
            Buka paket dan pekerjaan
          </Link>
        </section>
      )}
      {page === "study" && pack && !work && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Materi: {pack.title}</h2>
          {pack.furigana === "toggle" && (
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setShowReading(!showReading)}
            >
              {showReading ? "Sembunyikan furigana" : "Tampilkan furigana"}
            </Button>
          )}
          {pack.materials.map((item) => (
            <article key={item.id}>
              <h3 className="font-medium">{item.title}</h3>
              <p>
                {item.content.map((part, index) =>
                  part.reading && pack.furigana !== "hidden" && showReading ? (
                    <ruby key={index}>
                      {part.text}
                      <rt>{part.reading}</rt>
                    </ruby>
                  ) : (
                    part.text
                  ),
                )}
              </p>
            </article>
          ))}
          <Button
            className="min-h-11"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const id = (startIds.current[pack.id] ??= crypto.randomUUID());
                const started = await call<LearningWorkV2>("/api/v2/works", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workId: id, packId: pack.id }),
                });
                delete startIds.current[pack.id];
                await openWork(started.id, true);
                await refresh();
              })
            }
          >
            Mulai pekerjaan
          </Button>
        </section>
      )}
      {page === "import" && (
        <section className="flex flex-col gap-3">
          <h2 id="impor" className="scroll-mt-6 text-xl font-semibold">
            Impor paket atau feedback
          </h2>
          <label className="block">
            Pilih file JSON
            <input
              className="mt-1 block w-full"
              type="file"
              accept="application/json,.json"
              aria-invalid={!!importError}
              aria-describedby={
                importError ? "manual-import-help manual-import-error" : "manual-import-help"
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                const generation = ++fileGeneration.current;
                setPreview(undefined);
                setMessage("");
                setImportError("");
                if (file) {
                  if (file.size > 384 * 1024) {
                    setPreview(undefined);
                    setImportError(
                      "File terlalu besar. Paket maksimal 128 KiB dan feedback 384 KiB.",
                    );
                  } else
                    void file
                      .text()
                      .then((value) => {
                        if (
                          generation === fileGeneration.current &&
                          controller.current &&
                          !controller.current.signal.aborted
                        )
                          previewRaw(value);
                      })
                      .catch(() => {
                        if (
                          generation === fileGeneration.current &&
                          controller.current &&
                          !controller.current.signal.aborted
                        )
                          setImportError(
                            "File tidak dapat dibaca. Pilih ulang file .json atau tempel isinya.",
                          );
                      });
                }
              }}
            />
          </label>
          <label className="block">
            Atau tempel JSON
            <textarea
              className={inputClass}
              rows={5}
              value={raw}
              aria-invalid={!!importError}
              aria-describedby={
                importError ? "manual-import-help manual-import-error" : "manual-import-help"
              }
              onChange={(event) => {
                fileGeneration.current++;
                setRaw(event.target.value);
                setPreview(undefined);
                setImportError("");
              }}
            />
          </label>
          <p id="manual-import-help" className="text-sm text-muted-foreground">
            Tempel JSON hasil guru, bukan prompt. Pembungkus blok kode dan format salinan
            dibersihkan saat pratinjau.
          </p>
          {importError && !preview && (
            <p id="manual-import-error" role="alert">
              {importError}
            </p>
          )}
          <Button
            disabled={busy}
            onClick={() => {
              fileGeneration.current++;
              previewRaw(raw);
            }}
          >
            Pratinjau
          </Button>
          {preview && (
            <div className="flex flex-col gap-2 rounded-2xl border bg-card p-5 sm:p-6">
              <h3 className="font-medium">
                Pratinjau {preview.kind === "learning-pack" ? "paket" : "feedback"}
              </h3>
              <p>
                {preview.kind === "learning-pack"
                  ? `${preview.title} · ${preview.exercises.length} soal`
                  : `${preview.mode} · ${preview.summary}`}
              </p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(preview, null, 2)}
              </pre>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setImportError("");
                    setImportMessage("Mengimpor…");
                    try {
                      const endpoint =
                        preview.kind === "learning-pack"
                          ? "/api/v2/packs/import"
                          : "/api/v2/teacher/feedback";
                      await call(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(preview),
                      });
                      if (
                        preview.kind === "teacher-feedback" &&
                        preview.mode === "assessment" &&
                        work?.id === preview.target.workId
                      )
                        setReviewed(true);
                      setPreview(undefined);
                      setRaw("");
                      setContext(null);
                      setMessage("Impor berhasil.");
                      setImportMessage("Impor berhasil. Paket atau feedback sudah tersimpan.");
                      try {
                        await refresh();
                      } catch {
                        setImportMessage(
                          "Impor berhasil disimpan, tetapi daftar belum dapat diperbarui. Muat ulang halaman untuk melihatnya.",
                        );
                      }
                    } catch (error) {
                      setImportMessage("");
                      if (!(error instanceof DOMException && error.name === "AbortError")) {
                        setImportError(
                          (error as { status?: number }).status === 403 &&
                            error instanceof Error &&
                            error.message === "This account is not approved."
                            ? "Akun ini belum diizinkan mengimpor. Tambahkan UID akun ke APP_ALLOWED_UIDS lalu mulai ulang server development."
                            : error instanceof Error
                              ? error.message
                              : "Impor gagal. Silakan coba lagi.",
                        );
                      }
                    }
                  })
                }
              >
                {busy ? "Mengimpor…" : "Konfirmasi impor"}
              </Button>
            </div>
          )}
          {preview && importError && (
            <p id="manual-import-error" role="alert">
              {importError}
            </p>
          )}
          {importMessage && <p role="status">{importMessage}</p>}
          {importMessage.startsWith("Impor berhasil") && (
            <Link href="/manual/works" className={buttonVariants({ variant: "outline" })}>
              Lihat paket dan pekerjaan
            </Link>
          )}
        </section>
      )}
      {page === "materials" && (
        <section className="flex flex-col gap-3">
          <h2 id="pekerjaan" className="scroll-mt-6 text-xl font-semibold">
            Paket materi
          </h2>
          {packs.items.length === 0 && works.items.length === 0 && (
            <p className="text-muted-foreground">
              Belum ada paket atau pekerjaan yang dapat ditampilkan.{" "}
              <Link href="/manual/import" className="underline">
                Impor materi terlebih dahulu
              </Link>
              .
            </p>
          )}
          <h3 className="font-semibold">Paket materi</h3>
          <p className="text-sm text-muted-foreground">
            Pilih paket untuk membuat pekerjaan dan mulai belajar.
          </p>
          {packs.items.map((item) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              key={item.id}
            >
              <span>{item.title}</span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => router.push(`/manual/study?pack=${encodeURIComponent(item.id)}`)}
              >
                Baca materi
              </Button>
            </div>
          ))}
          {packs.nextCursor && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => nextPage("/api/v2/packs", packs, setPacks))}
            >
              Paket lainnya
            </Button>
          )}
        </section>
      )}
      {page === "works" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Latihan tersimpan</h2>
          <p className="text-sm text-muted-foreground">
            Buka kembali jawaban dan posisi latihan Anda.
          </p>
          {works.items.map((item) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              key={item.id}
            >
              <span>
                {item.packTitle ??
                  packs.items.find((p) => p.id === item.packId)?.title ??
                  "Materi belajar"}{" "}
                · revisi {item.revision} ·{" "}
                {item.reviewed
                  ? "Sudah diperiksa guru"
                  : item.status === "in_progress"
                    ? "Sedang dikerjakan"
                    : "Selesai sementara · dapat direvisi"}
              </span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => openWork(item.id))}
              >
                Buka
              </Button>
            </div>
          ))}
          {works.nextCursor && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => nextPage("/api/v2/works", works, setWorks))}
            >
              Pekerjaan lainnya
            </Button>
          )}
        </section>
      )}
      {work && pack && draft && (
        <section
          hidden={page !== "study"}
          className={page === "study" ? "flex flex-col gap-4" : "hidden"}
        >
          {reviewed && <p role="status">Latihan sudah diperiksa guru dan hanya dapat dibaca.</p>}
          {!reviewed && work.status === "submitted" && (
            <Button
              onClick={() =>
                void run(async () => {
                  const updated = await call<LearningWorkV2>(`/api/v2/works/${work.id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      operationId: crypto.randomUUID(),
                      expectedRevision: work.revision,
                    }),
                  });
                  setWork(updated);
                  setDraft(editable(updated));
                  setDraftView(null);
                  setEditorVersion((value) => value + 1);
                })
              }
            >
              Lanjutkan revisi latihan
            </Button>
          )}
          <CommuterWork
            key={`${work.id}:${editorVersion}`}
            reviewed={reviewed}
            user={user!}
            initialWork={work}
            pack={pack}
            context={context}
            onView={(view) => {
              setDraftView(view);
              setWork(view.work);
              setDraft(view.editable);
            }}
          />
          <details className="rounded-xl border px-4">
            <summary className="min-h-11 cursor-pointer py-3 font-medium">
              Minta penilaian guru AI
            </summary>
            <div className="flex flex-col gap-3 pb-4">
              {(dirty || pending) && (
                <p className="text-sm text-muted-foreground">
                  Perubahan yang belum dipastikan tersimpan di server tidak termasuk dalam snapshot
                  yang dipilih.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Opsional, bisa dilakukan meski latihan belum selesai. Buat salinan jawaban yang
                sudah tersimpan, lalu buka ruang guru untuk menyalinnya ke chat AI. Tidak ada pesan
                yang dikirim otomatis.
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (
                      dirty ||
                      (pending &&
                        !window.confirm(
                          `Perubahan belum tersimpan tidak akan masuk snapshot. Buat snapshot revisi server ${work.revision}?`,
                        ))
                    )
                      return;
                    const key = `${work.id}:${work.revision}`;
                    const id = (snapshotIds.current[key] ??= crypto.randomUUID());
                    await call("/api/v2/snapshots", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        snapshotId: id,
                        workId: work.id,
                        expectedRevision: work.revision,
                      }),
                    });
                    setMessage(`Snapshot revisi ${work.revision} dibuat.`);
                    await refresh();
                  })
                }
              >
                Buat salinan jawaban
              </Button>
              <Link href="/manual/teacher" className={buttonVariants({ variant: "outline" })}>
                Buka ruang guru
              </Link>
            </div>
          </details>
        </section>
      )}
      {page === "teacher" && (
        <section className="flex flex-col gap-3">
          <h2 id="guru" className="scroll-mt-6 text-xl font-semibold">
            Snapshot dan feedback guru
          </h2>
          {(dirty || pending) && (
            <p>
              Perubahan yang belum dipastikan tersimpan di server tidak termasuk dalam snapshot yang
              dipilih.
            </p>
          )}
          <p>
            Snapshot adalah salinan jawaban pada revisi tertentu. Pilih hingga 10 snapshot; konteks
            memuat hanya revisi yang dipilih dan feedback terkait.
          </p>
          {snapshots.items.length === 0 && (
            <p className="text-muted-foreground">
              Belum ada snapshot. Buka latihan, pilih “Minta penilaian guru AI”, lalu “Buat salinan
              jawaban”.
            </p>
          )}
          <Link href="/manual/import" className="underline underline-offset-4">
            Impor feedback dari guru
          </Link>
          {snapshots.items.map((item) => (
            <label className="flex items-center gap-2" key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) => {
                  setSelected(
                    event.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  );
                  setContext(null);
                }}
              />
              {item.title} · revisi {item.revision}
            </label>
          ))}
          {snapshots.nextCursor && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => nextPage("/api/v2/snapshots", snapshots, setSnapshots))}
            >
              Snapshot lainnya
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || selected.length < 1 || selected.length > 10}
              onClick={() =>
                void run(async () => {
                  const query = new URLSearchParams();
                  selected.forEach((id) => query.append("snapshotId", id));
                  setContext(await call<TeacherContextV2>(`/api/v2/teacher/context?${query}`));
                })
              }
            >
              Muat konteks
            </Button>
            {context && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(JSON.stringify(context));
                      setMessage("Konteks disalin.");
                    })
                  }
                >
                  Salin JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(context)], { type: "application/json" }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "teacher-context-v2.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Unduh JSON
                </Button>
              </>
            )}
          </div>
          {context && (
            <div className="flex flex-col gap-3">
              <p>
                {context.snapshots.length} snapshot · {context.feedbackHistory.length} feedback
              </p>
              {context.feedbackHistory.length === 0 && <p>Belum ada feedback guru.</p>}
              {context.feedbackHistory.map((feedback) => (
                <article className="rounded-md border p-3" key={feedback.id}>
                  <h3 className="font-medium">
                    {feedback.mode === "assessment" ? "Penilaian guru" : `Anotasi: ${feedback.tag}`}{" "}
                    · {new Date(feedback.createdAt).toLocaleDateString("id-ID")}
                  </h3>
                  <p className="whitespace-pre-wrap">{feedback.summary}</p>
                  {feedback.mode === "assessment" &&
                    feedback.assessments.map((item) => (
                      <p key={item.exerciseId}>
                        {item.exerciseId}: {outcomeLabel[item.outcome]} — {item.feedback}
                      </p>
                    ))}
                  {feedback.mode === "annotation" && (
                    <p>Catatan lanjutan untuk penilaian sebelumnya</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
