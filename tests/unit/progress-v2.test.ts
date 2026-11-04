import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { summarizeV2 } from "@/features/analytics/progress-v2";
import { learningPackV2Schema } from "@/features/content/schema-v2";
import { learningWorkV2Schema } from "@/features/practice/work-schema-v2";
import { teacherFeedbackV2Schema } from "@/features/analytics/teacher-schema-v2";
const fixture = (name: string) => JSON.parse(readFileSync(`examples/${name}.v2.json`, "utf8"));
describe("v2 progress", () => {
  it("counts partial work separately from assessment observations and skills", () => {
    const pack = learningPackV2Schema.parse(fixture("learning-pack"));
    const work = learningWorkV2Schema.parse(fixture("learning-work"));
    const feedback = teacherFeedbackV2Schema.parse(fixture("teacher-feedback"));
    if (feedback.mode !== "assessment") throw new Error();
    const snapshot = { id: feedback.target.snapshotId, pack, work };
    const result = summarizeV2(
      [{ work, pack }],
      [{ feedback, snapshot, importedAt: "2026-11-02T00:00:00.000Z" }],
    );
    expect(result.questions).toBe(pack.exercises.length);
    expect(result.answered).toBeGreaterThan(0);
    expect(result.answered).toBeLessThan(result.questions);
    expect(result.results[0]).toMatchObject({ correct: 1, partial: 1, incorrect: 0 });
    expect(
      result.skills.reduce(
        (sum, skill) => sum + skill.correct + skill.partial + skill.incorrect,
        0,
      ),
    ).toBeGreaterThanOrEqual(2);
    expect(summarizeV2([], []).questions).toBe(0);
  });
});
