import { z } from "zod";

export const MAX_IMPORT_BYTES = 128 * 1024;
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const skillId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/);
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((s) => s.trim().length > 0, "Must not be blank");
const locale = text(35).refine((s) => {
  try {
    return Intl.getCanonicalLocales(s).length === 1;
  } catch {
    return false;
  }
}, "Invalid locale");
const timestamp = z.string().refine((s) => {
  try {
    return new Date(s).toISOString() === s;
  } catch {
    return false;
  }
}, "Invalid UTC timestamp");
export const normalizeAnswer = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
const distinct = (items: string[]) => new Set(items).size === items.length;
const accepted = z
  .array(text(200))
  .min(1)
  .max(10)
  .refine(
    (a) => a.every((s) => normalizeAnswer(s)) && distinct(a.map(normalizeAnswer)),
    "Answers must be distinct after normalization",
  );
const exactAnswer = z.strictObject({ acceptedAnswers: accepted, explanation: text(2000) });
const selfAnswer = z.strictObject({
  modelAnswer: text(2000),
  rubric: z.array(text(500)).min(1).max(5),
  explanation: text(2000),
});
const base = {
  id: idSchema,
  skillIds: z.array(skillId).min(1).max(3).refine(distinct, "Skill IDs must be distinct"),
  prompt: text(2000),
};
const choice = z.strictObject({ id: idSchema, text: text(500) });
const exercise = z.discriminatedUnion("type", [
  z.strictObject({
    ...base,
    type: z.literal("multiple_choice"),
    choices: z.array(choice).min(2).max(6),
    answer: z.strictObject({ choiceId: idSchema, explanation: text(2000) }),
  }),
  z.strictObject({ ...base, type: z.literal("fill_blank"), answer: exactAnswer }),
  z.discriminatedUnion("grading", [
    z.strictObject({
      ...base,
      type: z.literal("short_answer"),
      grading: z.literal("exact"),
      answer: exactAnswer,
    }),
    z.strictObject({
      ...base,
      type: z.literal("short_answer"),
      grading: z.literal("self"),
      answer: selfAnswer,
    }),
  ]),
  z.strictObject({ ...base, type: z.literal("self_review"), answer: selfAnswer }),
]);
const exercises = exercise;
export const learningPackSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: idSchema,
    title: text(120),
    subject: z.strictObject({ id: idSchema, label: text(80) }),
    level: text(80),
    contentLanguage: locale,
    feedbackLanguage: locale,
    createdAt: timestamp,
    skills: z
      .array(z.strictObject({ id: skillId, label: text(100) }))
      .min(1)
      .max(20),
    exercises: z.array(exercises).min(1).max(40),
  })
  .superRefine((pack, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const skills = new Set(pack.skills.map((s) => s.id));
    if (skills.size !== pack.skills.length) issue(["skills"], "Skill IDs must be unique");
    if (!distinct(pack.exercises.map((e) => e.id)))
      issue(["exercises"], "Exercise IDs must be unique");
    const used = new Set<string>();
    pack.exercises.forEach((e, i) => {
      e.skillIds.forEach((id) => {
        used.add(id);
        if (!skills.has(id)) issue(["exercises", i, "skillIds"], "Unknown skill reference");
      });
      const blanks = e.prompt.split("{{blank}}").length - 1;
      if (blanks !== (e.type === "fill_blank" ? 1 : 0))
        issue(["exercises", i, "prompt"], "Invalid blank placeholder count");
      if (e.type === "multiple_choice") {
        if (
          !distinct(e.choices.map((c) => c.id)) ||
          !distinct(e.choices.map((c) => normalizeAnswer(c.text)))
        )
          issue(["exercises", i, "choices"], "Choices must be distinct");
        if (!e.choices.some((c) => c.id === e.answer.choiceId))
          issue(["exercises", i, "answer", "choiceId"], "Unknown choice reference");
      }
    });
    if (pack.skills.some((s) => !used.has(s.id)))
      issue(["skills"], "Every skill must be referenced");
  });
export type LearningPack = z.infer<typeof learningPackSchema>;

export function validatePack(value: unknown) {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 1 }];
  while (stack.length) {
    const item = stack.pop()!;
    if (item.value !== null && typeof item.value === "object") {
      if (item.depth > 12)
        return {
          error: "VALIDATION_FAILED" as const,
          issues: [{ path: "", message: "Maximum nesting depth is 12" }],
        };
      for (const child of Object.values(item.value))
        if (child !== null && typeof child === "object")
          stack.push({ value: child, depth: item.depth + 1 });
    }
  }
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.hasOwn(value, "schemaVersion") &&
    (value as Record<string, unknown>).schemaVersion !== 1
  )
    return { error: "UNSUPPORTED_VERSION" as const, issues: [] };
  const result = learningPackSchema.safeParse(value);
  if (!result.success)
    return {
      error: "VALIDATION_FAILED" as const,
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  return { pack: result.data };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
