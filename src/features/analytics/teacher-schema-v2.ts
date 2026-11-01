import { z } from "zod";
import { canonicalJson, idSchema, MAX_IMPORT_BYTES } from "@/features/content/schema";
import {
  learningPackV2Schema,
  nonblankV2,
  revisionV2Schema,
  utcV2Schema,
} from "@/features/content/schema-v2";
import { attemptIdSchema } from "@/features/practice/answers";
import {
  isAnsweredV2,
  learningWorkV2Schema,
  workMatchesPackV2,
} from "@/features/practice/work-schema-v2";

const targetSchema = z.strictObject({
  snapshotId: attemptIdSchema,
  workId: attemptIdSchema,
  revision: revisionV2Schema,
});
const feedbackBase = {
  schemaVersion: z.literal(2),
  kind: z.literal("teacher-feedback"),
  id: idSchema,
  createdAt: utcV2Schema,
  target: targetSchema,
  summary: nonblankV2(2000),
};
export const teacherFeedbackV2Schema = z.discriminatedUnion("mode", [
  z.strictObject({
    ...feedbackBase,
    mode: z.literal("assessment"),
    assessments: z
      .array(
        z.strictObject({
          exerciseId: idSchema,
          outcome: z.enum(["correct", "partial", "incorrect"]),
          feedback: nonblankV2(2000),
        }),
      )
      .max(40)
      .refine((items) => new Set(items.map((item) => item.exerciseId)).size === items.length),
  }),
  z.strictObject({
    ...feedbackBase,
    mode: z.literal("annotation"),
    inReplyTo: idSchema,
    tag: z.enum(["clarification", "disagreement", "follow_up"]),
    exerciseId: idSchema.nullable(),
  }),
]);

const snapshotSchema = z
  .strictObject({
    id: attemptIdSchema,
    pack: learningPackV2Schema,
    work: learningWorkV2Schema,
  })
  .refine(({ work, pack }) => workMatchesPackV2(work, pack), {
    message: "Work does not match pack",
  });

export const teacherContextV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    kind: z.literal("teacher-context"),
    generatedAt: utcV2Schema,
    snapshots: z.array(snapshotSchema).min(1).max(10),
    feedbackHistory: z.array(teacherFeedbackV2Schema).max(40),
  })
  .superRefine((context, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const snapshots = new Map(context.snapshots.map((snapshot) => [snapshot.id, snapshot]));
    if (snapshots.size !== context.snapshots.length)
      issue(["snapshots"], "Snapshot IDs must be unique");
    const revisions = new Set<string>();
    const packs = new Map<string, string>();
    const workPacks = new Map<string, string>();
    for (const snapshot of context.snapshots) {
      const revision = `${snapshot.work.id}:${snapshot.work.revision}`;
      if (revisions.has(revision)) issue(["snapshots"], "Work revisions must be unique");
      revisions.add(revision);
      const pack = canonicalJson(snapshot.pack);
      if (
        (packs.has(snapshot.pack.id) && packs.get(snapshot.pack.id) !== pack) ||
        (workPacks.has(snapshot.work.id) && workPacks.get(snapshot.work.id) !== snapshot.pack.id)
      ) {
        issue(["snapshots"], "Immutable pack mismatch");
      }
      packs.set(snapshot.pack.id, pack);
      workPacks.set(snapshot.work.id, snapshot.pack.id);
    }
    const history = new Map<string, TeacherFeedbackV2>();
    const assessed = new Set<string>();
    context.feedbackHistory.forEach((feedback, i) => {
      if (!feedbackMatchesContextV2(feedback, context))
        issue(["feedbackHistory", i], "Invalid feedback target or answer");
      if (history.has(feedback.id))
        issue(["feedbackHistory", i, "id"], "Feedback IDs must be unique");
      if (feedback.mode === "assessment") {
        for (const item of feedback.assessments) {
          const key = `${feedback.target.snapshotId}:${item.exerciseId}`;
          if (assessed.has(key))
            issue(["feedbackHistory", i], "Use an annotation instead of replacing an assessment");
          assessed.add(key);
        }
      } else {
        const previous = history.get(feedback.inReplyTo);
        if (!previous || canonicalJson(previous.target) !== canonicalJson(feedback.target)) {
          issue(
            ["feedbackHistory", i, "inReplyTo"],
            "Annotation must refer to earlier feedback for the same target",
          );
        }
      }
      history.set(feedback.id, feedback);
    });
  });

export type TeacherFeedbackV2 = z.infer<typeof teacherFeedbackV2Schema>;
export type TeacherContextV2 = z.infer<typeof teacherContextV2Schema>;

// Shape validation alone cannot establish which saved answers the teacher reviewed.
export function feedbackMatchesContextV2(feedback: TeacherFeedbackV2, context: TeacherContextV2) {
  const snapshot = context.snapshots.find((item) => item.id === feedback.target.snapshotId);
  if (
    !snapshot ||
    snapshot.work.id !== feedback.target.workId ||
    snapshot.work.revision !== feedback.target.revision
  )
    return false;
  const exercises = new Set(snapshot.pack.exercises.map((exercise) => exercise.id));
  return feedback.mode === "annotation"
    ? feedback.exerciseId === null || exercises.has(feedback.exerciseId)
    : feedback.assessments.every(
        (item) =>
          exercises.has(item.exerciseId) &&
          Object.hasOwn(snapshot.work.answers, item.exerciseId) &&
          isAnsweredV2(snapshot.work.answers[item.exerciseId].response),
      );
}

const learningDataV2Schema = z.discriminatedUnion("kind", [
  learningPackV2Schema,
  learningWorkV2Schema,
  teacherFeedbackV2Schema,
  teacherContextV2Schema,
]);

export function parseLearningDataV2(raw: string) {
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > 512 * 1024) return { error: "PAYLOAD_TOO_LARGE" as const };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: "INVALID_JSON" as const };
  }
  const stack = [{ value, depth: 1 }];
  while (stack.length) {
    const item = stack.pop()!;
    if (item.value !== null && typeof item.value === "object") {
      if (item.depth > 12) return { error: "VALIDATION_FAILED" as const };
      for (const child of Object.values(item.value)) {
        if (child !== null && typeof child === "object")
          stack.push({ value: child, depth: item.depth + 1 });
      }
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (Object.hasOwn(value, "schemaVersion") && Reflect.get(value, "schemaVersion") !== 2) {
      return { error: "UNSUPPORTED_VERSION" as const };
    }
    const kind = Reflect.get(value, "kind");
    const limit =
      kind === "learning-pack"
        ? MAX_IMPORT_BYTES
        : kind === "teacher-context"
          ? 512 * 1024
          : 384 * 1024;
    if (bytes > limit) return { error: "PAYLOAD_TOO_LARGE" as const };
  }
  const result = learningDataV2Schema.safeParse(value);
  return result.success ? { data: result.data } : { error: "VALIDATION_FAILED" as const };
}
