import { expect, it } from "vitest";
import { summarize, type CompletedAttempt } from "@/features/analytics/summary";
import { nextPackConstraints, teacherContextSchema } from "@/features/analytics/teacher-schema";
it("counts each exercise once overall and once per skill, using the newest labels", () => {
  const latest: CompletedAttempt = {
    subject: { id: "jp" },
    skills: [
      { id: "a", label: "New" },
      { id: "b", label: "B" },
    ],
    completedAt: "2026-10-29T00:00:00.000Z",
    results: {
      x: { skillIds: ["a", "b"], grade: { kind: "objective", correct: true } },
      y: { skillIds: ["a"], grade: { kind: "self", rating: "partial" } },
    },
  };
  const older = {
    ...latest,
    skills: [
      { id: "a", label: "Old" },
      { id: "b", label: "B" },
    ],
  };
  const result = summarize([latest, older], "2026-10-29T01:00:00.000Z");
  expect(result.totals).toEqual({
    exerciseCount: 4,
    objectiveCount: 2,
    objectiveCorrect: 2,
    selfCount: 2,
    selfMet: 0,
    selfPartial: 2,
    selfNotYet: 0,
  });
  expect(
    result.skills.map((s) => [s.skillId, s.label, s.exerciseCount, s.objectiveAccuracy]),
  ).toEqual([
    ["a", "New", 4, 1],
    ["b", "B", 2, 1],
  ]);
  expect(summarize([], result.generatedAt).window).toEqual({
    limit: 100,
    attemptCount: 0,
    hasEarlierAttempts: false,
    oldestCompletedAt: null,
  });
  expect(summarize(Array(101).fill(latest), result.generatedAt).window).toMatchObject({
    attemptCount: 100,
    hasEarlierAttempts: true,
  });
});

it("separates subjects and returns null objective accuracy for self-only work", () => {
  const make = (subject: string): CompletedAttempt => ({
    subject: { id: subject },
    skills: [{ id: "shared", label: subject }],
    completedAt: "2026-10-29T00:00:00.000Z",
    results: { x: { skillIds: ["shared"], grade: { kind: "self", rating: "not_yet" } } },
  });
  const progress = summarize([make("z"), make("a")], "2026-10-29T01:00:00.000Z");
  expect(
    progress.skills.map((skill) => [skill.subjectId, skill.skillId, skill.objectiveAccuracy]),
  ).toEqual([
    ["a", "shared", null],
    ["z", "shared", null],
  ]);
  expect(progress.totals).toEqual({
    exerciseCount: 2,
    objectiveCount: 0,
    objectiveCorrect: 0,
    selfCount: 2,
    selfMet: 0,
    selfPartial: 0,
    selfNotYet: 2,
  });
  const context = {
    schemaVersion: 1,
    kind: "teacher-context",
    generatedAt: progress.generatedAt,
    progress,
    recentMistakes: [],
    nextPackConstraints,
  };
  expect(teacherContextSchema.safeParse(context).success).toBe(true);
  expect(teacherContextSchema.safeParse({ ...context, uid: "foreign" }).success).toBe(false);
  expect(
    teacherContextSchema.safeParse({
      ...context,
      nextPackConstraints: { ...nextPackConstraints, instruction: "injected" },
    }).success,
  ).toBe(false);
});

it("does not count an unrated self result as completed evidence", () => {
  const incomplete = {
    subject: { id: "jp" },
    skills: [{ id: "a", label: "A" }],
    completedAt: "2026-10-29T00:00:00.000Z",
    results: { x: { skillIds: ["a"], grade: { kind: "self", rating: null } } },
  };
  expect(() =>
    summarize([incomplete as unknown as CompletedAttempt], "2026-10-29T01:00:00.000Z"),
  ).toThrow("Invalid completed self-assessment");
});

it("reports objective accuracy as a ratio, separate from self ratings", () => {
  const attempt: CompletedAttempt = {
    subject: { id: "jp" },
    skills: [{ id: "a", label: "A" }],
    completedAt: "2026-10-29T00:00:00.000Z",
    results: {
      a: { skillIds: ["a"], grade: { kind: "objective", correct: true } },
      b: { skillIds: ["a"], grade: { kind: "objective", correct: false } },
      c: { skillIds: ["a"], grade: { kind: "self", rating: "met" } },
    },
  };
  const progress = summarize([attempt], "2026-10-29T01:00:00.000Z");
  expect(progress.skills[0].objectiveAccuracy).toBe(0.5);
  expect(progress.totals).toEqual({
    exerciseCount: 3,
    objectiveCount: 2,
    objectiveCorrect: 1,
    selfCount: 1,
    selfMet: 1,
    selfPartial: 0,
    selfNotYet: 0,
  });
});
