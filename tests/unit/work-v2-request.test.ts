import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { saveWorkV2Schema, submitWorkV2Schema } from "@/features/practice/model/work-v2-request";

const work = JSON.parse(readFileSync("examples/learning-work.v2.json", "utf8"));
const operationId = "2e78f588-a2a9-45be-b52f-1c9575d3b3a0";

describe("v2 work request boundary", () => {
  it("accepts partial answers, comments, position and reflection without server-owned fields", () => {
    const input = {
      operationId,
      expectedRevision: 0,
      answers: work.answers,
      reflection: work.reflection,
      currentExerciseId: work.currentExerciseId,
    };
    expect(saveWorkV2Schema.safeParse(input).success).toBe(true);
    expect(saveWorkV2Schema.safeParse({ ...input, status: "submitted" }).success).toBe(false);
    expect(saveWorkV2Schema.safeParse({ ...input, expectedRevision: -1 }).success).toBe(false);
  });
  it("requires a stable operation ID and revision for submit", () => {
    expect(submitWorkV2Schema.safeParse({ operationId, expectedRevision: 3 }).success).toBe(true);
    expect(
      submitWorkV2Schema.safeParse({ operationId: "other", expectedRevision: 3 }).success,
    ).toBe(false);
  });
});
