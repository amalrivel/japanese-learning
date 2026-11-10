import { z } from "zod";
import { idSchema } from "@/features/content/model/schema";
import {
  nonblankV2,
  revisionV2Schema,
  utcV2Schema,
  type LearningPackV2,
} from "@/features/content/model/schema-v2";
import { attemptIdSchema } from "./answers";

const responseSchema = z.union([
  z.strictObject({ choiceId: idSchema }),
  z.strictObject({ text: z.string().max(2000) }),
]);

export const learningWorkV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  kind: z.literal("learning-work"),
  id: attemptIdSchema,
  packId: idSchema,
  revision: revisionV2Schema,
  status: z.enum(["in_progress", "submitted"]),
  currentExerciseId: idSchema.nullable(),
  answers: z
    .record(
      idSchema,
      z.strictObject({
        response: responseSchema.nullable(),
        comment: z.string().max(2000),
      }),
    )
    .refine((answers) => Object.keys(answers).length <= 40),
  reflection: z.strictObject({
    understood: z.array(nonblankV2(500)).max(3),
    unclear: z.array(nonblankV2(500)).max(2),
    nextStep: z.string().max(500),
  }),
  updatedAt: utcV2Schema,
});

export type LearningWorkV2 = z.infer<typeof learningWorkV2Schema>;

export function isAnsweredV2(response: LearningWorkV2["answers"][string]["response"]) {
  return response !== null && ("choiceId" in response || response.text.trim().length > 0);
}

export function workMatchesPackV2(work: LearningWorkV2, pack: LearningPackV2) {
  const exercises = new Map(pack.exercises.map((exercise) => [exercise.id, exercise]));
  return (
    work.packId === pack.id &&
    (work.currentExerciseId === null || exercises.has(work.currentExerciseId)) &&
    Object.entries(work.answers).every(([id, { response }]) => {
      const exercise = exercises.get(id);
      if (!exercise) return false;
      if (response === null) return true;
      return exercise.type === "multiple_choice"
        ? "choiceId" in response &&
            exercise.choices.some((choice) => choice.id === response.choiceId)
        : "text" in response;
    })
  );
}
