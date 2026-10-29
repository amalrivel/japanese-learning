import "server-only";
import { learnerPack } from "@/features/content/projection";
import type { LearningPack } from "@/features/content/schema";
import type { Answers } from "@/features/practice/answers";
import type { Results } from "@/features/practice/grading.server";
import { completedWindow } from "./progress.server";
import { nextPackConstraints, teacherContextSchema } from "./teacher-schema";

export async function teacherContext(uid: string) {
  const { root, rows, generatedAt, progress } = await completedWindow(uid);
  const cached = new Map<
    string,
    {
      hash: string;
      pack: ReturnType<typeof learnerPack>;
      keys: Record<string, LearningPack["exercises"][number]["answer"]>;
    }
  >();
  const recentMistakes: unknown[] = [];
  for (const row of rows.slice(0, 100)) {
    const data = row as typeof row & {
      packId: string;
      packHash: string;
      subject: { id: string };
      results: Results;
      answers: Answers;
    };
    if (
      !Object.values(data.results).some(({ grade }) =>
        grade.kind === "objective"
          ? !grade.correct
          : grade.rating === "partial" || grade.rating === "not_yet",
      )
    )
      continue;
    let source = cached.get(data.packId);
    if (!source) {
      const [pack, key] = await Promise.all([
        root.collection("packs").doc(data.packId).get(),
        root.collection("packKeys").doc(data.packId).get(),
      ]);
      if (!pack.exists || !key.exists || pack.get("contentHash") !== key.get("contentHash"))
        throw new Error("Missing immutable pack pair");
      source = {
        hash: pack.get("contentHash"),
        pack: learnerPack(pack.data() as LearningPack),
        keys: key.get("keys"),
      };
      cached.set(data.packId, source);
    }
    if (source.hash !== data.packHash) throw new Error("Mismatched immutable pack");
    for (const exercise of source.pack.exercises) {
      if (recentMistakes.length === 20) break;
      const result = data.results[exercise.id];
      if (
        !result ||
        (result.grade.kind === "objective"
          ? result.grade.correct
          : result.grade.rating !== "partial" && result.grade.rating !== "not_yet")
      )
        continue;
      const answer = data.answers[exercise.id];
      const key = Object.hasOwn(source.keys, exercise.id) ? source.keys[exercise.id] : undefined;
      if (!answer || !key) throw new Error("Missing completed exercise data");
      const learnerAnswer =
        "text" in answer
          ? answer.text
          : exercise.choices?.find((choice) => choice.id === answer.choiceId)?.text;
      if (learnerAnswer === undefined) throw new Error("Missing choice");
      const explanation = key.explanation;
      const grade =
        result.grade.kind === "objective"
          ? { kind: "objective", correct: result.grade.correct, score: result.grade.score }
          : { kind: "self", rating: result.grade.rating, score: result.grade.score };
      recentMistakes.push({
        attemptId: data.id,
        packId: data.packId,
        exerciseId: exercise.id,
        subjectId: data.subject.id,
        skillIds: [...result.skillIds],
        completedAt: data.completedAt,
        prompt: exercise.prompt.slice(0, 500),
        learnerAnswer: learnerAnswer.slice(0, 500),
        grade,
        explanation: explanation.slice(0, 500),
        textTruncated:
          exercise.prompt.length > 500 || learnerAnswer.length > 500 || explanation.length > 500,
      });
    }
    if (recentMistakes.length === 20) break;
  }
  return teacherContextSchema.parse({
    schemaVersion: 1,
    kind: "teacher-context",
    generatedAt,
    progress,
    recentMistakes,
    nextPackConstraints,
  });
}
