"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import type { learnerPack } from "@/features/content/projection";
import type { Answers } from "./answers";
import { attemptIdPattern } from "./ids";
import { request } from "./request";
import { Review, type ReviewAttempt } from "./review";

type Pack = ReturnType<typeof learnerPack>;
type Draft = ReviewAttempt;
type SaveStatus = "saved" | "unsaved" | "saving" | "failed" | "conflict";
const equal = (a: Answers, b: Answers) =>
  JSON.stringify(Object.entries(a).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))) ===
  JSON.stringify(Object.entries(b).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));

export function PracticeSession({ packId, attemptId }: { packId?: string; attemptId?: string }) {
  const { user } = useAuth();
  const [pack, setPack] = useState<Pack | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [serverDraft, setServerDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [attemptedStart, setAttemptedStart] = useState(false);
  const [reload, setReload] = useState(0);
  const uid = user?.uid;
  const userRef = useRef(user);
  const controller = useRef<AbortController | null>(null);
  const startId = useRef<string | null>(null);
  const sessionUrl = useRef("");
  const sessionHistoryState = useRef<unknown>(null);
  const current = useRef<Answers>({});
  const acknowledged = useRef<Answers>({});
  const revision = useRef(0);
  const inFlight = useRef(false);
  const saveDone = useRef<Promise<void> | null>(null);
  const submittingRef = useRef(false);
  const submission = useRef<{ revision: number; answers: Answers } | null>(null);
  const uncertain = useRef<{ revision: number; answers: Answers } | null>(null);
  const statusRef = useRef<SaveStatus>("saved");
  const setSaveStatus = (value: SaveStatus) => {
    statusRef.current = value;
    setStatus(value);
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const activeUser = userRef.current!;
    if (!activeUser || activeUser.uid !== uid) return;
    const active = new AbortController();
    controller.current = active;
    async function load() {
      setLoading(true);
      setError("");
      try {
        let existing: Draft | null = null;
        if (attemptId) {
          const response = await request(
            activeUser,
            active.signal,
            `/api/attempts/${encodeURIComponent(attemptId)}`,
          );
          if (!response.ok) throw new Error("Could not load attempt.");
          existing = (await response.json()) as Draft;
        }
        const id = existing?.packId ?? packId;
        if (!id) throw new Error("Pack not found.");
        const response = await request(
          activeUser,
          active.signal,
          `/api/packs/${encodeURIComponent(id)}`,
        );
        if (!response.ok) throw new Error("Could not load pack.");
        const loadedPack = (await response.json()) as Pack;
        if (active.signal.aborted) return;
        if (!attemptId) {
          const url = new URL(window.location.href);
          const savedId = url.searchParams.get("start");
          if (
            savedId &&
            attemptIdPattern.test(savedId) &&
            window.history.state?.m4StartOwner === uid
          ) {
            startId.current = savedId;
            setAttemptedStart(true);
          } else if (savedId !== null) {
            url.searchParams.delete("start");
            window.history.replaceState(window.history.state, "", url);
            sessionUrl.current = url.href;
          }
        }
        setPack(loadedPack);
        if (existing) {
          current.current = existing.answers;
          acknowledged.current = existing.answers;
          revision.current = existing.revision;
          setAnswers(existing.answers);
          setDraft(existing);
        }
        setLoading(false);
      } catch (reason) {
        if (!active.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load practice.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active.abort();
    };
  }, [uid, packId, attemptId, reload]);

  useEffect(() => {
    sessionUrl.current = window.location.href;
    sessionHistoryState.current = window.history.state;
    const warn = () =>
      statusRef.current !== "saved" &&
      !window.confirm("You have unsaved answers. Leave this page?");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (statusRef.current !== "saved") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (
        link &&
        link.target !== "_blank" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        link.href !== location.href &&
        warn()
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const signOut = (event: Event) => {
      if (warn()) event.preventDefault();
    };
    const pop = (event: PopStateEvent) => {
      if (warn()) {
        event.stopImmediatePropagation();
        window.history.pushState(sessionHistoryState.current, "", sessionUrl.current);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("learning:signout", signOut);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("learning:signout", signOut);
      window.removeEventListener("popstate", pop, true);
    };
  }, []);

  async function start() {
    if (!user || !pack || !controller.current || starting) return;
    const active = controller.current;
    startId.current ??= crypto.randomUUID();
    const url = new URL(window.location.href);
    url.searchParams.set("start", startId.current);
    window.history.replaceState({ ...window.history.state, m4StartOwner: user.uid }, "", url);
    sessionUrl.current = url.href;
    sessionHistoryState.current = window.history.state;
    setAttemptedStart(true);
    setStarting(true);
    setError("");
    try {
      const response = await request(user, active.signal, "/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: startId.current, packId: pack.id }),
      });
      if (!response.ok) throw new Error("Could not start practice. Retry to use the same attempt.");
      const result = (await response.json()) as Draft;
      if (active.signal.aborted) return;
      current.current = result.answers;
      acknowledged.current = result.answers;
      revision.current = result.revision;
      setAnswers(result.answers);
      setDraft(result);
      setSaveStatus("saved");
    } catch {
      if (!active.signal.aborted)
        setError("Could not start practice. Retry to use the same attempt.");
    } finally {
      if (!active.signal.aborted) setStarting(false);
    }
  }

  async function save(forSubmit = false) {
    if (
      !user ||
      !draft ||
      !controller.current ||
      inFlight.current ||
      (submittingRef.current && !forSubmit) ||
      statusRef.current === "conflict"
    )
      return;
    const active = controller.current;
    inFlight.current = true;
    let finishSave!: () => void;
    saveDone.current = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    setSaveStatus("saving");
    const reconcile = async () => {
      const pending = uncertain.current!;
      const response = await request(
        user,
        active.signal,
        `/api/attempts/${encodeURIComponent(draft.id)}`,
      );
      if (!response.ok) throw new Error("Recovery failed");
      const latest = (await response.json()) as Draft;
      if (active.signal.aborted) throw new Error("Request aborted");
      if (latest.status !== "in_progress") {
        setServerDraft(latest);
        setSaveStatus("conflict");
        uncertain.current = null;
        return "conflict";
      }
      if (latest.revision === pending.revision) {
        return "unchanged";
      }
      if (latest.revision === pending.revision + 1 && equal(latest.answers, pending.answers)) {
        revision.current = latest.revision;
        acknowledged.current = pending.answers;
        uncertain.current = null;
        return "committed";
      }
      setServerDraft(latest);
      setSaveStatus("conflict");
      uncertain.current = null;
      return "conflict";
    };
    try {
      let forceWrite = false;
      if (uncertain.current) {
        const recovered = await reconcile();
        if (recovered === "conflict") return;
        forceWrite = recovered === "unchanged";
      }
      const snapshot = current.current;
      const expected = revision.current;
      if (!forceWrite && equal(snapshot, acknowledged.current)) {
        setSaveStatus("saved");
        return;
      }
      uncertain.current = { revision: expected, answers: snapshot };
      const response = await request(
        user,
        active.signal,
        `/api/attempts/${encodeURIComponent(draft.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: expected, answers: snapshot }),
        },
      );
      if (!response.ok) throw new Error("Save failed");
      const result = (await response.json()) as { revision: number };
      if (active.signal.aborted) return;
      revision.current = result.revision;
      acknowledged.current = snapshot;
      uncertain.current = null;
      setSaveStatus(equal(current.current, snapshot) ? "saved" : "unsaved");
    } catch {
      if (active.signal.aborted) return;
      try {
        if (uncertain.current) {
          const recovered = await reconcile();
          if (recovered === "unchanged") setSaveStatus("failed");
          if (recovered === "committed")
            setSaveStatus(equal(current.current, acknowledged.current) ? "saved" : "unsaved");
        }
      } catch {
        if (!active.signal.aborted) setSaveStatus("failed");
      }
    } finally {
      inFlight.current = false;
      finishSave();
      saveDone.current = null;
    }
  }

  async function submit() {
    if (
      !user ||
      !draft ||
      !pack ||
      !controller.current ||
      submittingRef.current ||
      statusRef.current === "conflict"
    )
      return;
    const active = controller.current;
    if (
      !submission.current &&
      !pack.exercises.every((exercise) => {
        const answer = current.current[exercise.id];
        return (
          answer &&
          ("text" in answer
            ? answer.text.trim().length > 0
            : exercise.choices?.some((choice) => choice.id === answer.choiceId))
        );
      })
    ) {
      setError("Answer every question before submitting.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      if (!submission.current) {
        if (inFlight.current) await saveDone.current;
        if (active.signal.aborted) return;
        const saveBlocked = () =>
          statusRef.current === "failed" || statusRef.current === "conflict";
        if (saveBlocked()) {
          setError("Resolve the draft save before submitting.");
          return;
        }
        if (statusRef.current !== "saved" || !equal(current.current, acknowledged.current))
          await save(true);
        if (active.signal.aborted) return;
        if (statusRef.current !== "saved" || !equal(current.current, acknowledged.current)) {
          setError("The draft was not saved. Resolve the save before submitting.");
          return;
        }
        submission.current = { revision: revision.current, answers: current.current };
        setPendingSubmit(true);
      }
      const sent = submission.current;
      setSaveStatus("saving");
      const response = await request(
        user,
        active.signal,
        `/api/attempts/${encodeURIComponent(draft.id)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sent),
        },
      );
      if (response.status === 409) {
        const latestResponse = await request(
          user,
          active.signal,
          `/api/attempts/${encodeURIComponent(draft.id)}`,
        );
        if (!latestResponse.ok) throw new Error("Could not recover submission.");
        const latest = (await latestResponse.json()) as Draft;
        if (active.signal.aborted) return;
        if (latest.status !== "in_progress" && equal(latest.answers, sent.answers)) {
          setDraft(latest);
          setSaveStatus("saved");
        } else {
          setServerDraft(latest);
          setSaveStatus("conflict");
        }
        submission.current = null;
        setPendingSubmit(false);
        return;
      }
      if (response.status === 422) {
        submission.current = null;
        setPendingSubmit(false);
        setSaveStatus("saved");
        setError("Check that every answer is valid before submitting.");
        return;
      }
      if (!response.ok) throw new Error("Submission failed.");
      const result = (await response.json()) as Draft;
      if (active.signal.aborted) return;
      submission.current = null;
      setPendingSubmit(false);
      setDraft(result);
      setSaveStatus("saved");
    } catch {
      if (!active.signal.aborted) {
        setSaveStatus("failed");
        setError("Submission could not be confirmed. Retry the same answers.");
      }
    } finally {
      submittingRef.current = false;
      if (!active.signal.aborted) setSubmitting(false);
    }
  }

  useEffect(() => {
    if (status !== "unsaved" || !draft || draft.status !== "in_progress") return;
    const timer = window.setTimeout(() => {
      void save();
    }, 1000);
    return () => window.clearTimeout(timer);
    // The snapshot is read from refs when the timer fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, status, draft]);

  function change(id: string, answer: Answers[string]) {
    if (submittingRef.current || submission.current) return;
    const next = { ...current.current, [id]: answer };
    current.current = next;
    setAnswers(next);
    if (statusRef.current !== "conflict")
      setSaveStatus(
        inFlight.current
          ? "saving"
          : uncertain.current
            ? "failed"
            : equal(next, acknowledged.current)
              ? "saved"
              : "unsaved",
      );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-16">
      <Link className="underline underline-offset-4" href="/practice">
        Practice packs
      </Link>
      {" · "}
      <Link className="underline underline-offset-4" href="/history">
        History
      </Link>
      {loading && <p role="status">Loading practice…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!pack && (
            <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
              Retry
            </Button>
          )}
        </div>
      )}
      {pack && (
        <>
          <h1 className="text-3xl font-semibold">{pack.title}</h1>
          {!draft ? (
            <div className="space-y-3">
              <p>{pack.exercises.length} questions. Start a new attempt when ready.</p>
              <Button disabled={starting} onClick={() => void start()}>
                {starting ? "Starting…" : attemptedStart ? "Retry start" : "Start new attempt"}
              </Button>
            </div>
          ) : draft.status !== "in_progress" ? (
            <Review
              attempt={draft}
              pack={pack}
              onDirtyChange={() => setSaveStatus("unsaved")}
              onUpdate={(next) => {
                setDraft(next);
                if (next.status === "completed") setSaveStatus("saved");
              }}
            />
          ) : (
            <>
              <p role="status">
                {status === "saved"
                  ? "Saved"
                  : status === "saving"
                    ? "Saving…"
                    : status === "failed"
                      ? "Save failed. Your answers remain unsaved."
                      : status === "conflict"
                        ? "This draft changed elsewhere. Choose how to recover below."
                        : "Unsaved changes"}
              </p>
              <fieldset disabled={submitting || pendingSubmit}>
                <legend className="sr-only">Practice answers</legend>
                <ol className="space-y-6">
                  {pack.exercises.map((exercise, i) => (
                    <li key={exercise.id} className="rounded-lg border p-4">
                      {exercise.type === "multiple_choice" ? (
                        <fieldset>
                          <legend className="mb-3 font-medium">
                            {i + 1}. {exercise.prompt}
                          </legend>
                          <div className="space-y-2">
                            {exercise.choices?.map((choice) => (
                              <label key={choice.id} className="flex gap-2">
                                <input
                                  type="radio"
                                  name={exercise.id}
                                  value={choice.id}
                                  checked={
                                    "choiceId" in (answers[exercise.id] ?? {}) &&
                                    (answers[exercise.id] as { choiceId: string }).choiceId ===
                                      choice.id
                                  }
                                  onChange={() => change(exercise.id, { choiceId: choice.id })}
                                />
                                {choice.text}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : (
                        <>
                          <label
                            className="mb-3 block font-medium"
                            htmlFor={`answer-${exercise.id}`}
                          >
                            {i + 1}. {exercise.prompt.replace("{{blank}}", "＿＿")}
                          </label>
                          <textarea
                            id={`answer-${exercise.id}`}
                            className="w-full rounded-md border bg-background p-3 focus-visible:outline-2 focus-visible:outline-ring"
                            rows={
                              exercise.type === "self_review" || exercise.grading === "self" ? 4 : 2
                            }
                            maxLength={2000}
                            value={
                              "text" in (answers[exercise.id] ?? {})
                                ? (answers[exercise.id] as { text: string }).text
                                : ""
                            }
                            onChange={(event) => change(exercise.id, { text: event.target.value })}
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </fieldset>
              <Button
                disabled={
                  submitting ||
                  pendingSubmit ||
                  status === "saving" ||
                  status === "conflict" ||
                  status === "saved"
                }
                onClick={() => void save()}
              >
                Save
              </Button>
              <Button
                className="ml-3"
                disabled={submitting || status === "conflict"}
                onClick={() => void submit()}
              >
                {submitting ? "Submitting…" : pendingSubmit ? "Retry submission" : "Submit answers"}
              </Button>
              {serverDraft && status === "conflict" && (
                <section
                  className="space-y-3 rounded-lg border p-4"
                  aria-labelledby="conflict-heading"
                >
                  <h2 id="conflict-heading" className="font-semibold">
                    Recover this draft
                  </h2>
                  <p>
                    {serverDraft.status === "in_progress"
                      ? "Your answers remain above. The latest server answers are shown below. Choose one version; keeping yours will replace the server version on your next save."
                      : "This attempt is no longer a draft. Copy your answers above before leaving; they cannot be saved here."}
                  </p>
                  <pre className="overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(serverDraft.answers, null, 2)}
                  </pre>
                  {serverDraft.status === "in_progress" && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          current.current = serverDraft.answers;
                          acknowledged.current = serverDraft.answers;
                          revision.current = serverDraft.revision;
                          setAnswers(serverDraft.answers);
                          setServerDraft(null);
                          setSaveStatus("saved");
                        }}
                      >
                        Use server answers
                      </Button>
                      <Button
                        onClick={() => {
                          acknowledged.current = serverDraft.answers;
                          revision.current = serverDraft.revision;
                          setServerDraft(null);
                          setSaveStatus("unsaved");
                        }}
                      >
                        Keep my answers
                      </Button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
