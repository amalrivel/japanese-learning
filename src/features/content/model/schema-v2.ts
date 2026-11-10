import { z } from "zod";
import { idSchema, learningPackSchema, normalizeAnswer } from "./schema";

export const utcV2Schema = learningPackSchema.shape.createdAt;
export const revisionV2Schema = z.number().int().nonnegative().safe();
export const nonblankV2 = (max: number) =>
  z
    .string()
    .max(max)
    .refine((s) => s.trim().length > 0);
const distinct = (items: string[]) => new Set(items).size === items.length;

const richText = (max: number) =>
  z
    .array(z.strictObject({ text: nonblankV2(max), reading: nonblankV2(200).optional() }))
    .min(1)
    .max(100)
    .refine((segments) => segments.reduce((length, s) => length + s.text.length, 0) <= max);
const promptSchema = richText(2000);
const base = {
  id: idSchema,
  skillIds: z
    .array(learningPackSchema.shape.skills.element.shape.id)
    .min(1)
    .max(3)
    .refine(distinct),
  prompt: promptSchema,
};
const choice = z.strictObject({ id: idSchema, text: richText(500) });
const exerciseSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...base,
    type: z.literal("multiple_choice"),
    choices: z.array(choice).min(2).max(6),
  }),
  z.strictObject({ ...base, type: z.literal("fill_blank") }),
  z.strictObject({ ...base, type: z.literal("short_answer") }),
  z.strictObject({ ...base, type: z.literal("self_review") }),
  z.strictObject({ ...base, type: z.literal("free_writing") }),
]);

export const learningPackV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    kind: z.literal("learning-pack"),
    id: idSchema,
    title: learningPackSchema.shape.title,
    subject: learningPackSchema.shape.subject,
    level: learningPackSchema.shape.level,
    contentLanguage: learningPackSchema.shape.contentLanguage,
    feedbackLanguage: learningPackSchema.shape.feedbackLanguage,
    createdAt: utcV2Schema,
    furigana: z.enum(["toggle", "hidden"]),
    skills: learningPackSchema.shape.skills,
    materials: z
      .array(z.strictObject({ id: idSchema, title: nonblankV2(120), content: richText(10000) }))
      .max(20),
    exercises: z.array(exerciseSchema).min(1).max(40),
  })
  .superRefine((pack, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    for (const field of ["skills", "materials", "exercises"] as const) {
      if (!distinct(pack[field].map((item) => item.id))) issue([field], "IDs must be unique");
    }
    const skills = new Set(pack.skills.map((skill) => skill.id));
    const used = new Set<string>();
    pack.exercises.forEach((exercise, i) => {
      for (const id of exercise.skillIds) {
        used.add(id);
        if (!skills.has(id)) issue(["exercises", i, "skillIds"], "Unknown skill reference");
      }
      const prompt = exercise.prompt.map((segment) => segment.text).join("");
      if (prompt.split("{{blank}}").length - 1 !== (exercise.type === "fill_blank" ? 1 : 0)) {
        issue(["exercises", i, "prompt"], "Invalid blank placeholder count");
      }
      if (
        exercise.type === "multiple_choice" &&
        (!distinct(exercise.choices.map((c) => c.id)) ||
          !distinct(
            exercise.choices.map((c) => normalizeAnswer(c.text.map((s) => s.text).join(""))),
          ))
      ) {
        issue(["exercises", i, "choices"], "Choices must be distinct");
      }
    });
    if (pack.skills.some((skill) => !used.has(skill.id)))
      issue(["skills"], "Every skill must be referenced");
  });

export type LearningPackV2 = z.infer<typeof learningPackV2Schema>;

export function withinDepthV2(value: unknown) {
  const stack = [{ value, depth: 1 }];
  while (stack.length) {
    const item = stack.pop()!;
    if (item.value !== null && typeof item.value === "object") {
      if (item.depth > 12) return false;
      for (const child of Object.values(item.value)) {
        if (child !== null && typeof child === "object")
          stack.push({ value: child, depth: item.depth + 1 });
      }
    }
  }
  return true;
}
