import { z } from "zod";
import { revisionV2Schema } from "@/features/content/model/schema-v2";
import { attemptIdSchema } from "./answers";
import { learningWorkV2Schema } from "./work-schema-v2";

export const startWorkV2Schema = z.strictObject({
  workId: attemptIdSchema,
  packId: learningWorkV2Schema.shape.packId,
});
export const submitWorkV2Schema = z.strictObject({
  operationId: attemptIdSchema,
  expectedRevision: revisionV2Schema,
});
export const saveWorkV2Schema = submitWorkV2Schema.extend({
  answers: learningWorkV2Schema.shape.answers,
  reflection: learningWorkV2Schema.shape.reflection,
  currentExerciseId: learningWorkV2Schema.shape.currentExerciseId,
});
