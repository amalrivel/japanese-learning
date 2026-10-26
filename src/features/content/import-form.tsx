"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import { canonicalJson, MAX_IMPORT_BYTES, validatePack, type LearningPack } from "./schema";

export function ImportForm() {
  const { user } = useAuth();
  const [raw, setRaw] = useState("");
  const [pack, setPack] = useState<LearningPack | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"checking" | "importing" | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const guard = generation;
    return () => {
      guard.current++;
    };
  }, [user?.uid]);
  function clear() {
    generation.current++;
    setRaw("");
    setPack(null);
    setBusy(null);
  }
  async function preview(value: string) {
    const current = ++generation.current;
    setPack(null);
    setMessage("");
    if (new TextEncoder().encode(value).length > MAX_IMPORT_BYTES) {
      setMessage("The JSON exceeds 128 KiB.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      setMessage("Enter valid JSON.");
      return;
    }
    const result = validatePack(parsed);
    if (result.error) {
      setMessage(
        result.error === "UNSUPPORTED_VERSION"
          ? "Supported schema versions: [1]."
          : result.issues
              .slice(0, 20)
              .map((i) => `${i.path || "root"}: ${i.message}`)
              .join("\n"),
      );
      return;
    }
    setRaw(value);
    setPack(result.pack);
    if (!user) return;
    setBusy("checking");
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalJson(result.pack)),
      );
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
      const token = await user.getIdToken();
      if (current !== generation.current) return;
      const response = await fetch(`/api/packs/${result.pack.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (current !== generation.current) return;
      if (response.ok) {
        const existing = await response.json();
        if (current === generation.current)
          setMessage(
            existing.contentHash === hash
              ? "This pack is already imported (duplicate)."
              : "This ID already has different content. Use a new pack ID.",
          );
      } else if (response.status !== 404)
        setMessage("Could not check for an existing pack. Confirmation will check again.");
    } catch {
      if (current === generation.current)
        setMessage("Could not check for an existing pack. Confirmation will check again.");
    } finally {
      if (current === generation.current) setBusy(null);
    }
  }
  async function confirm() {
    if (!user || !pack) return;
    const current = ++generation.current;
    setBusy("importing");
    setMessage("");
    try {
      const token = await user.getIdToken();
      if (current !== generation.current) return;
      const response = await fetch("/api/packs/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: raw,
      });
      const data = await response.json();
      if (current !== generation.current) return;
      if (response.ok) {
        clear();
        setMessage(
          data.duplicate
            ? "Already imported; the existing pack was kept."
            : "Pack imported successfully.",
        );
      } else setMessage(data.error?.message ?? "Import failed.");
    } catch {
      if (current === generation.current) setMessage("Import failed. Please try again.");
    } finally {
      if (current === generation.current) setBusy(null);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Import learning pack</h1>
      <p className="text-muted-foreground">
        Choose a UTF-8 JSON file or paste JSON. Review the pack before importing.
      </p>
      {!pack && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pack-file" className="block font-medium">
              JSON file
            </label>
            <input
              id="pack-file"
              type="file"
              accept=".json,application/json"
              className="block w-full"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const current = ++generation.current;
                if (file.size > MAX_IMPORT_BYTES) {
                  setMessage("The JSON exceeds 128 KiB.");
                  return;
                }
                try {
                  const bytes = await file.arrayBuffer();
                  if (current === generation.current)
                    await preview(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
                } catch {
                  if (current === generation.current) setMessage("The file must be valid UTF-8.");
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="pack-json" className="block font-medium">
              Paste JSON
            </label>
            <textarea
              id="pack-json"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              className="w-full rounded-md border bg-background p-3 font-mono text-sm"
            />
          </div>
          <Button onClick={() => void preview(raw)}>Preview</Button>
        </div>
      )}
      {pack && (
        <section className="space-y-4 rounded-lg border p-5" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-xl font-semibold">
            Preview: {pack.title}
          </h2>
          <p>
            {pack.subject.label} · {pack.level} · {pack.exercises.length} questions
          </p>
          <p>Skills: {pack.skills.map((s) => s.label).join(", ")}</p>
          <p>
            Objective:{" "}
            {
              pack.exercises.filter(
                (e) =>
                  e.type === "multiple_choice" ||
                  e.type === "fill_blank" ||
                  (e.type === "short_answer" && e.grading === "exact"),
              ).length
            }{" "}
            · Self-graded:{" "}
            {
              pack.exercises.filter(
                (e) =>
                  e.type === "self_review" || (e.type === "short_answer" && e.grading === "self"),
              ).length
            }
          </p>
          <ol className="list-inside list-decimal space-y-3">
            {pack.exercises.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.type.replaceAll("_", " ")}</span>: {e.prompt}
                {e.type === "multiple_choice" && (
                  <ul className="ml-6 list-disc">
                    {e.choices.map((c) => (
                      <li key={c.id}>{c.text}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy !== null} onClick={() => void confirm()}>
              {busy === "checking"
                ? "Checking…"
                : busy === "importing"
                  ? "Importing…"
                  : "Confirm import"}
            </Button>
            <Button
              variant="outline"
              disabled={busy === "importing"}
              onClick={() => {
                clear();
                setMessage("Import cancelled.");
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
      {message && (
        <p role="status" className="whitespace-pre-wrap">
          {message}
        </p>
      )}
    </div>
  );
}
