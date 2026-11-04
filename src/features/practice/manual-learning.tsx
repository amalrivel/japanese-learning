"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { parseLearningDataV2, type TeacherContextV2 } from "@/features/analytics/teacher-schema-v2";
import { canonicalJson } from "@/features/content/schema";
import type { LearningPackV2 } from "@/features/content/schema-v2";
import { useAuth } from "@/lib/auth/client";
import { request } from "./request";
import type { LearningWorkV2 } from "./work-schema-v2";
import { CommuterWork } from "./commuter-work";
import type { DraftView } from "./commuter-draft";

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
  const { user } = useAuth();
  const [packs, setPacks] = useState<Page<PackItem>>({ items: [], nextCursor: null });
  const [works, setWorks] = useState<Page<LearningWorkV2>>({ items: [], nextCursor: null });
  const [snapshots, setSnapshots] = useState<Page<SnapshotItem>>({ items: [], nextCursor: null });
  const [pack, setPack] = useState<LearningPackV2 | null>(null);
  const [work, setWork] = useState<LearningWorkV2 | null>(null);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [selected, setSelected] = useState<string[]>([]);
  const [context, setContext] = useState<TeacherContextV2 | null>(null);
  const [message, setMessage] = useState("");
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
      call<Page<LearningWorkV2>>("/api/v2/works"),
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
    const params = new URLSearchParams(window.location.search);
    const workId = params.get("work");
    const packId = params.get("pack");
    if (workId) void Promise.resolve().then(() => run(() => openWork(workId, true)));
    else if (packId)
      void Promise.resolve().then(() =>
        run(async () => {
          const result = await call<{ pack: LearningPackV2 }>(
            `/api/v2/packs/${encodeURIComponent(packId)}`,
          );
          setPack(result.pack);
        }),
      );
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
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
  function previewRaw(value: string) {
    setRaw(value);
    setPreview(undefined);
    setMessage("");
    const result = parseLearningDataV2(value);
    if (
      !result.data ||
      (result.data.kind !== "learning-pack" && result.data.kind !== "teacher-feedback")
    ) {
      setMessage("JSON paket atau feedback v2 tidak valid atau melampaui batas.");
      return;
    }
    setPreview(result.data);
  }
  async function openWork(id: string, confirmed = false) {
    if (!confirmed && !confirmLeave()) return;
    const result = await call<{ work: LearningWorkV2; pack: LearningPackV2 }>(
      `/api/v2/works/${id}`,
    );
    setWork(result.work);
    setPack(result.pack);
    setDraft(editable(result.work));
    setDraftView(null);
  }
  const inputClass = "w-full rounded-md border bg-background p-2 text-base";
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-10">
      <div>
        <Link
          href="/"
          className="underline"
          onClick={(event) => {
            if (!confirmLeave()) event.preventDefault();
          }}
        >
          Beranda
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Alur guru manual</h1>
        <p className="mt-2 text-muted-foreground">
          Simpan pekerjaan di server, lalu bagikan snapshot kepada guru pilihan Anda.
        </p>
      </div>
      {message && (
        <p role="status" className="rounded-md border p-3">
          {message}
        </p>
      )}
      {pack && !work && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Materi: {pack.title}</h2>
          {pack.furigana === "toggle" && (
            <Button variant="outline" onClick={() => setShowReading(!showReading)}>
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
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const id = (startIds.current[pack.id] ??= crypto.randomUUID());
                await call("/api/v2/works", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workId: id, packId: pack.id }),
                });
                delete startIds.current[pack.id];
                await openWork(id, true);
                await refresh();
              })
            }
          >
            Mulai pekerjaan
          </Button>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Impor paket atau feedback</h2>
        <label className="block">
          Pilih file JSON
          <input
            className="mt-1 block w-full"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              const generation = ++fileGeneration.current;
              setPreview(undefined);
              setMessage("");
              if (file) {
                if (file.size > 384 * 1024) {
                  setPreview(undefined);
                  setMessage("File terlalu besar.");
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
                        setMessage("File tidak dapat dibaca.");
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
            onChange={(event) => {
              fileGeneration.current++;
              setRaw(event.target.value);
              setPreview(undefined);
            }}
          />
        </label>
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
          <div className="space-y-2 rounded-md border p-4">
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
                  const endpoint =
                    preview.kind === "learning-pack"
                      ? "/api/v2/packs/import"
                      : "/api/v2/teacher/feedback";
                  await call(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(preview),
                  });
                  setPreview(undefined);
                  setRaw("");
                  setContext(null);
                  setMessage("Impor berhasil.");
                  await refresh();
                })
              }
            >
              Konfirmasi impor
            </Button>
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Paket dan pekerjaan</h2>
        {packs.items.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2" key={item.id}>
            <span>{item.title}</span>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!confirmLeave()) return;
                  const id = (startIds.current[item.id] ??= crypto.randomUUID());
                  await call("/api/v2/works", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ workId: id, packId: item.id }),
                  });
                  delete startIds.current[item.id];
                  await openWork(id, true);
                  await refresh();
                })
              }
            >
              Mulai pekerjaan
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
        {works.items.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2" key={item.id}>
            <span>
              {item.packId} · revisi {item.revision} ·{" "}
              {item.status === "in_progress" ? "sedang dikerjakan" : "diakhiri"}
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
      {work && pack && draft && (
        <section className="space-y-4">
          <CommuterWork
            key={work.id}
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
            Buat snapshot revisi server
          </Button>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Snapshot dan feedback guru</h2>
        {(dirty || pending) && (
          <p>
            Perubahan yang belum dipastikan tersimpan di server tidak termasuk dalam snapshot yang
            dipilih.
          </p>
        )}
        <p>
          Pilih hingga 10 snapshot; konteks memuat hanya revisi yang dipilih dan feedback terkait.
        </p>
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
            {item.title} · revisi {item.revision} · {item.id}
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
          <div className="space-y-3">
            <p>
              {context.snapshots.length} snapshot · {context.feedbackHistory.length} feedback
            </p>
            {context.feedbackHistory.length === 0 && <p>Belum ada feedback guru.</p>}
            {context.feedbackHistory.map((feedback) => (
              <article className="rounded-md border p-3" key={feedback.id}>
                <h3 className="font-medium">
                  {feedback.mode === "assessment" ? "Penilaian guru" : `Anotasi: ${feedback.tag}`} ·{" "}
                  {feedback.id}
                </h3>
                <p className="whitespace-pre-wrap">{feedback.summary}</p>
                {feedback.mode === "assessment" &&
                  feedback.assessments.map((item) => (
                    <p key={item.exerciseId}>
                      {item.exerciseId}: {outcomeLabel[item.outcome]} — {item.feedback}
                    </p>
                  ))}
                {feedback.mode === "annotation" && <p>Menanggapi {feedback.inReplyTo}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
