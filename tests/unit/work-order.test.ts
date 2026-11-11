import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { learningWorkV2Schema } from "@/features/practice/model/work-schema-v2";
import { compareWorks } from "@/features/practice/model/work-order";

it("prefers populated legacy work over newer empty duplicates, then uses date and ID", () => {
  const answered = learningWorkV2Schema.parse(
    JSON.parse(readFileSync("examples/learning-work.v2.json", "utf8")),
  );
  const empty = {
    ...answered,
    id: "22222222-2222-4222-8222-222222222222",
    answers: {},
    updatedAt: "2026-11-11T00:00:00.000Z",
  };
  expect([empty, answered].sort(compareWorks)[0].id).toBe(answered.id);
  const newer = { ...answered, updatedAt: empty.updatedAt };
  expect([answered, newer].sort(compareWorks)[0]).toBe(newer);
  expect(compareWorks(answered, { ...answered, id: empty.id })).toBeLessThan(0);
});
