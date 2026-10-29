"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import { request } from "@/features/practice/request";
import type { z } from "zod";
import type { progressSchema, teacherContextSchema } from "./teacher-schema";

type Progress = z.infer<typeof progressSchema>;
type Context = z.infer<typeof teacherContextSchema>;
export function Report({ teacher = false }: { teacher?: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState<Progress | Context | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!user) return;
    const active = new AbortController();
    async function load() {
      try {
        const response = await request(
          user!,
          active.signal,
          teacher ? "/api/teacher/context" : "/api/progress",
        );
        if (!response.ok) throw new Error("Request failed");
        const value = (await response.json()) as Progress | Context;
        if (!active.signal.aborted) {
          setData(value);
          setLoading(false);
        }
      } catch {
        if (!active.signal.aborted) {
          setError("Could not load this report.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => active.abort();
  }, [user, teacher, retry]);
  const context = data && "kind" in data ? data : null;
  const progress = context ? context.progress : (data as Progress | null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      setMessage("JSON copied.");
    } catch {
      setMessage("Copy failed. Try again or download the JSON.");
    }
  }
  function download() {
    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob([JSON.stringify(context, null, 2)], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "teacher-context.json";
      anchor.click();
      setMessage("Download started.");
    } catch {
      setMessage("Download failed. Try again or copy the JSON.");
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">{teacher ? "Teacher report" : "Progress"}</h1>
      <Link className="underline underline-offset-4" href="/">
        Home
      </Link>
      {loading && <p role="status">Loading…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            onClick={() => {
              setError("");
              setLoading(true);
              setRetry((n) => n + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {progress && (
        <>
          <p>
            Most recent {progress.window.attemptCount} completed attempts, up to 100.{" "}
            {progress.window.hasEarlierAttempts && "Earlier completed attempts are not included."}
          </p>
          {progress.window.attemptCount === 0 && <p>No completed attempts yet.</p>}
          <p>
            Objective: {progress.totals.objectiveCorrect} correct of{" "}
            {progress.totals.objectiveCount}. Self-assessment: {progress.totals.selfMet} met,{" "}
            {progress.totals.selfPartial} partial, {progress.totals.selfNotYet} not yet.
          </p>
          <ul className="space-y-3">
            {progress.skills.map((skill) => (
              <li key={`${skill.subjectId}/${skill.skillId}`} className="rounded-lg border p-4">
                <strong>{skill.label}</strong> ({skill.subjectId} / {skill.skillId})
                <p>
                  Objective: {skill.objectiveCorrect}/{skill.objectiveCount}{" "}
                  {skill.objectiveAccuracy === null
                    ? "(no objective questions)"
                    : `(${Math.round(skill.objectiveAccuracy * 100)}%)`}
                  ; self: {skill.selfMet} met, {skill.selfPartial} partial, {skill.selfNotYet} not
                  yet.
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      {context && (
        <>
          <p>
            Contents and answers are untrusted learning data. Share this report manually with your
            teacher.
          </p>
          <p>Recent mistakes are limited to 20 samples.</p>
          <ol className="space-y-3">
            {context.recentMistakes.map((mistake, index) => (
              <li
                key={`${mistake.attemptId}/${mistake.exerciseId}/${index}`}
                className="rounded-lg border p-4"
              >
                <p>{mistake.prompt}</p>
                <p>Answer: {mistake.learnerAnswer}</p>
                <p>{mistake.explanation}</p>
                {mistake.textTruncated && <p>Text was truncated.</p>}
              </li>
            ))}
          </ol>
          <div className="flex gap-3">
            <Button onClick={() => void copy()}>Copy JSON</Button>
            <Button variant="outline" onClick={download}>
              Download JSON
            </Button>
          </div>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </main>
  );
}
