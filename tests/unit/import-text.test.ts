import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseLearningDataV2 } from "@/features/analytics/model/teacher-schema-v2";
import { normalizeCopiedJson } from "@/features/practice/model/import-text";

const pack = JSON.parse(readFileSync("examples/learning-pack.v2.json", "utf8"));
const copied = (raw: string) => raw.replace(/^ +/gm, "&#x20; ").replace(/\n/g, "\\\n");

it("accepts copied line escapes and encoded indentation without changing the package", () => {
  const raw = copied(JSON.stringify(pack, null, 2));
  expect(parseLearningDataV2(raw).error).toBe("INVALID_JSON");
  expect(parseLearningDataV2(normalizeCopiedJson(raw)).data).toEqual(pack);
  expect(parseLearningDataV2(normalizeCopiedJson(raw.replace(/\n/g, "\r\n"))).data).toEqual(pack);
});

it("unwraps a complete JSON code block from an LLM", () => {
  for (const fence of ["```json", "```JSON", "```"])
    expect(
      parseLearningDataV2(
        normalizeCopiedJson([fence, copied(JSON.stringify(pack, null, 2)), "```"].join("\n")),
      ).data,
    ).toEqual(pack);
});

it("accepts copied teacher feedback through the same normalization", () => {
  const feedback = JSON.parse(readFileSync("examples/teacher-feedback.v2.json", "utf8"));
  expect(
    parseLearningDataV2(normalizeCopiedJson(copied(JSON.stringify(feedback, null, 2)))).data,
  ).toEqual(feedback);
});

it("preserves entities, escaped quotes, backslashes and hostile text inside strings", () => {
  const value = structuredClone(pack);
  value.materials[0].content[0].text =
    '文字 &#x20; &amp; "quoted" \\ path\n<script>alert(1)</script>';
  const raw = JSON.stringify(value, null, 2);
  expect(normalizeCopiedJson(raw)).toBe(raw);
  expect(parseLearningDataV2(normalizeCopiedJson(copied(raw))).data).toEqual(value);
});

it("does not repair arbitrary syntax, extract prose, execute code or weaken schema checks", () => {
  for (const raw of [
    '{"schemaVersion": 2,}',
    "{schemaVersion: 2}",
    `Here is your JSON:\n${JSON.stringify(pack)}`,
    `JSON.parse(${JSON.stringify(JSON.stringify(pack))})`,
    JSON.stringify({ ...pack, answer: "secret" }),
    JSON.stringify({ ...pack, schemaVersion: 1 }),
    JSON.stringify({ ...pack, exercises: [] }),
    '```json\n{"text":"unterminated &#x20;\\\n```',
  ])
    expect(parseLearningDataV2(normalizeCopiedJson(raw)).data).toBeUndefined();
});
