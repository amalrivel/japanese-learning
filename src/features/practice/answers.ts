import { z } from "zod";
import { idSchema, normalizeAnswer } from "@/features/content/schema";
import type { learnerPack } from "@/features/content/projection";
import { attemptIdPattern } from "./ids";

export const attemptIdSchema = z.string().regex(attemptIdPattern);
export const startSchema = z.strictObject({ attemptId: attemptIdSchema, packId: idSchema });
const answerSchema = z.union([
  z.strictObject({ choiceId: idSchema }),
  z.strictObject({ text: z.string().max(2000) }),
]);
export const draftSchema = z.strictObject({
  revision: z.number().int().nonnegative().safe(),
  answers: z.record(idSchema, answerSchema),
});
export type Answers = z.infer<typeof draftSchema>["answers"];
export const assessmentSchema = z.strictObject({
  ratings: z.record(idSchema, z.enum(["met", "partial", "not_yet"])),
});
export type Ratings = z.infer<typeof assessmentSchema>["ratings"];
export function matchesAccepted(text: string, accepted: string[]) {
  return accepted.some((value) => normalizeAnswer(value) === normalizeAnswer(text));
}

export function validateAnswers(
  answers: Answers,
  exercises: ReturnType<typeof learnerPack>["exercises"],
) {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return Object.entries(answers).every(([id, answer]) => {
    const exercise = byId.get(id);
    if (!exercise) return false;
    if (exercise.type === "multiple_choice")
      return (
        "choiceId" in answer && !!exercise.choices?.some((choice) => choice.id === answer.choiceId)
      );
    return "text" in answer;
  });
}

export function validateCompleteAnswers(
  answers: Answers,
  exercises: ReturnType<typeof learnerPack>["exercises"],
) {
  return (
    Object.keys(answers).length === exercises.length &&
    validateAnswers(answers, exercises) &&
    Object.values(answers).every((answer) => !("text" in answer) || answer.text.trim().length > 0)
  );
}
