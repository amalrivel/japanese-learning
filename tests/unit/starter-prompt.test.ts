import { describe, expect, it } from "vitest";
import { starterPackExample, starterPrompt } from "@/features/practice/model/starter-prompt";
import { parseLearningDataV2 } from "@/features/analytics/model/teacher-schema-v2";

describe("starter prompt", () => {
  it("embeds a complete learning pack accepted by the actual import parser", () => {
    const start = starterPrompt.indexOf('{\n  "schemaVersion"');
    const end = starterPrompt.lastIndexOf("\n}") + 2;
    const json = starterPrompt.slice(start, end);
    expect(JSON.parse(json)).toEqual(starterPackExample);
    const parsed = parseLearningDataV2(json);
    expect(parsed.error).toBeUndefined();
    expect(parsed.data).toEqual(starterPackExample);
  });
  it("demonstrates every supported exercise type without embedding answer keys", () => {
    expect(new Set(starterPackExample.exercises.map((item) => item.type)).size).toBe(5);
    expect(starterPackExample.exercises.every((item) => !("answer" in item))).toBe(true);
  });
});
