import type { LearningPack } from "./schema";

export function learnerPack(pack: LearningPack) {
  return {
    schemaVersion: pack.schemaVersion,
    id: pack.id,
    title: pack.title,
    subject: { id: pack.subject.id, label: pack.subject.label },
    level: pack.level,
    contentLanguage: pack.contentLanguage,
    feedbackLanguage: pack.feedbackLanguage,
    createdAt: pack.createdAt,
    skills: pack.skills.map((s) => ({ id: s.id, label: s.label })),
    exercises: pack.exercises.map((e) => ({
      id: e.id,
      type: e.type,
      skillIds: [...e.skillIds],
      prompt: e.prompt,
      ...(e.type === "multiple_choice"
        ? { choices: e.choices.map((c) => ({ id: c.id, text: c.text })) }
        : {}),
      ...(e.type === "short_answer" ? { grading: e.grading } : {}),
    })),
  };
}
