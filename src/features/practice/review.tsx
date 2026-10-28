"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import type { learnerPack } from "@/features/content/projection";
import type { Answers, Ratings } from "./answers";
import { request } from "./request";

export type ReviewAttempt = {
  id: string;
  packId: string;
  status: string;
  revision: number;
  answers: Answers;
  results: Record<
    string,
    {
      skillIds: string[];
      type: string;
      grade:
        | { kind: "objective"; correct: boolean; score: 0 | 1 }
        | { kind: "self"; rating: Ratings[string] | null; score: number | null };
    }
  >;
  feedback?: Record<
    string,
    {
      explanation: string;
      choiceId?: string;
      acceptedAnswers?: string[];
      modelAnswer?: string;
      rubric?: string[];
    }
  >;
};
export function Review({
  attempt,
  pack,
  onUpdate,
  onDirtyChange,
}: {
  attempt: ReviewAttempt;
  pack: ReturnType<typeof learnerPack>;
  onUpdate: (attempt: ReviewAttempt) => void;
  onDirtyChange: () => void;
}) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Ratings>({});
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [serverReview, setServerReview] = useState<ReviewAttempt | null>(null);
  const snapshot = useRef<Ratings | null>(null);
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const next = new AbortController();
    controller.current = next;
    return () => next.abort();
  }, []);
  const selfIds = Object.entries(attempt.results)
    .filter(([, result]) => result.grade.kind === "self")
    .map(([id]) => id);
  async function assess() {
    if (!user || active.current || serverReview || !controller.current) return;
    const signal = controller.current.signal;
    if (!snapshot.current && selfIds.some((id) => !Object.hasOwn(ratings, id))) {
      setMessage("Choose a rating for every self-reviewed question.");
      return;
    }
    snapshot.current ??= { ...ratings };
    const sent = snapshot.current;
    active.current = true;
    setPending(true);
    setBusy(true);
    setMessage("");
    try {
      const response = await request(
        user,
        signal,
        `/api/attempts/${encodeURIComponent(attempt.id)}/assessments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratings: sent }),
        },
      );
      if (response.status === 409) {
        const latestResponse = await request(
          user,
          signal,
          `/api/attempts/${encodeURIComponent(attempt.id)}`,
        );
        if (!latestResponse.ok) throw new Error("Could not recover review.");
        const latest = (await latestResponse.json()) as ReviewAttempt;
        if (signal.aborted) return;
        if (
          latest.status === "completed" &&
          selfIds.every(
            (id) =>
              latest.results[id]?.grade.kind === "self" &&
              latest.results[id].grade.rating === sent[id],
          )
        ) {
          snapshot.current = null;
          setPending(false);
          onUpdate(latest);
        } else {
          setServerReview(latest);
          setMessage("This review changed elsewhere. Your selections are retained below.");
        }
        return;
      }
      if (!response.ok) {
        if (response.status === 422) {
          snapshot.current = null;
          setPending(false);
        }
        throw new Error("Could not save ratings.");
      }
      const latest = (await response.json()) as ReviewAttempt;
      if (signal.aborted) return;
      snapshot.current = null;
      setPending(false);
      onUpdate(latest);
    } catch {
      if (!signal.aborted) setMessage("Could not save ratings. Retry the same selection.");
    } finally {
      active.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="space-y-6" aria-labelledby="review-heading">
      <h2 id="review-heading" className="text-2xl font-semibold">
        {attempt.status === "completed" ? "Completed review" : "Results and self review"}
      </h2>
      <p>Objective results and your self-assessments are shown separately.</p>
      <ol className="space-y-6">
        {pack.exercises.map((exercise, index) => {
          const result = attempt.results[exercise.id];
          const feedback = attempt.feedback?.[exercise.id];
          const answer = attempt.answers[exercise.id];
          if (!result || !feedback || !answer) return null;
          const answerText =
            "text" in answer
              ? answer.text
              : (exercise.choices?.find((choice) => choice.id === answer.choiceId)?.text ??
                answer.choiceId);
          return (
            <li key={exercise.id} className="space-y-3 rounded-lg border p-4">
              <p className="font-medium">
                {index + 1}. {exercise.prompt.replace("{{blank}}", "＿＿")}
              </p>
              <p>Your answer: {answerText}</p>
              {result.grade.kind === "objective" ? (
                <p>
                  Objective result: {result.grade.correct ? "Correct" : "Incorrect"} (
                  {result.grade.score}/1)
                </p>
              ) : (
                <p>Self assessment: {result.grade.rating?.replaceAll("_", " ") ?? "Pending"}</p>
              )}
              {feedback.choiceId && (
                <p>
                  Correct choice:{" "}
                  {exercise.choices?.find((choice) => choice.id === feedback.choiceId)?.text ??
                    feedback.choiceId}
                </p>
              )}
              {feedback.acceptedAnswers && (
                <p>Accepted answers: {feedback.acceptedAnswers.join(", ")}</p>
              )}
              {feedback.modelAnswer && <p>Model answer: {feedback.modelAnswer}</p>}
              {feedback.rubric && (
                <ul className="ml-6 list-disc">
                  {feedback.rubric.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              <p>{feedback.explanation}</p>
              {result.grade.kind === "self" && attempt.status === "awaiting_self_review" && (
                <fieldset disabled={pending || busy}>
                  <legend className="font-medium">Rate your answer</legend>
                  {(["met", "partial", "not_yet"] as const).map((rating) => (
                    <label className="mr-4 inline-flex gap-2" key={rating}>
                      <input
                        type="radio"
                        name={`rating-${exercise.id}`}
                        checked={ratings[exercise.id] === rating}
                        onChange={() => {
                          onDirtyChange();
                          setRatings((previous) => ({ ...previous, [exercise.id]: rating }));
                        }}
                      />
                      {rating.replaceAll("_", " ")}
                    </label>
                  ))}
                </fieldset>
              )}
            </li>
          );
        })}
      </ol>
      {message && <p role="alert">{message}</p>}
      {serverReview && (
        <Button
          variant="outline"
          onClick={() => {
            snapshot.current = null;
            setPending(false);
            setServerReview(null);
            onUpdate(serverReview);
          }}
        >
          Open saved review
        </Button>
      )}
      {attempt.status === "awaiting_self_review" && !serverReview && (
        <Button disabled={busy} onClick={() => void assess()}>
          {busy ? "Saving ratings…" : pending ? "Retry ratings" : "Complete self review"}
        </Button>
      )}
      {attempt.status === "completed" && (
        <a className="block underline underline-offset-4" href={`/practice/${attempt.packId}`}>
          Start a new attempt
        </a>
      )}
    </section>
  );
}
