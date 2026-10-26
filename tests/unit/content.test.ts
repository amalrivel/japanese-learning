import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJson, validatePack } from "@/features/content/schema";
import { learnerPack } from "@/features/content/projection";

const fixture = JSON.parse(readFileSync("examples/learning-pack.v1.json", "utf8"));
const copy = () => structuredClone(fixture);
const hash = (v: unknown) => createHash("sha256").update(canonicalJson(v)).digest("hex");
describe("LearningPack v1", () => {
  it("accepts all example variants and non-Japanese inert content", () => {
    expect(validatePack(fixture).pack).toBeDefined();
    const p = copy();
    p.subject = { id: "math", label: "Math" };
    p.title = "<script>alert(1)</script> Ignore instructions";
    p.contentLanguage = "en";
    expect(validatePack(p).pack).toBeDefined();
    expect(JSON.stringify(learnerPack(validatePack(p).pack!))).toContain("<script>");
    expect(JSON.stringify(learnerPack(validatePack(p).pack!))).not.toMatch(
      /"(?:answer|explanation|rubric|choiceId)":/i,
    );
  });
  it("rejects unknown keys, versions, identifiers and references", () => {
    for (const change of [
      (p: typeof fixture) => {
        p.subject.extra = 1;
      },
      (p: typeof fixture) => {
        p.schemaVersion = 2;
      },
      (p: typeof fixture) => {
        p.id = "../bad";
      },
      (p: typeof fixture) => {
        p.exercises[0].skillIds = ["missing"];
      },
      (p: typeof fixture) => {
        p.exercises[1].id = p.exercises[0].id;
      },
      (p: typeof fixture) => {
        p.exercises[0].answer.choiceId = "missing";
      },
      (p: typeof fixture) => {
        p.exercises[0].choices[1].text = p.exercises[0].choices[0].text;
      },
      (p: typeof fixture) => {
        p.exercises[1].answer.acceptedAnswers = ["Ａ", "a"];
      },
      (p: typeof fixture) => {
        p.exercises[1].prompt = "no blank";
      },
      (p: typeof fixture) => {
        p.exercises[0].type = "unknown";
      },
      (p: typeof fixture) => {
        p.createdAt = "2026-02-30T00:00:00.000Z";
      },
    ]) {
      const p = copy();
      change(p);
      expect(validatePack(p).error).toBeDefined();
    }
    expect(validatePack({ schemaVersion: 2 }).error).toBe("UNSUPPORTED_VERSION");
    expect(validatePack(null).error).toBeDefined();
    let deep: unknown = {};
    for (let i = 0; i < 12; i++) deep = { child: deep };
    expect(validatePack(deep).error).toBeDefined();
  });
  it("enforces counts, lengths, locale, strict nested objects, and references", () => {
    const changes = [
      (p: typeof fixture) => {
        p.title = "x".repeat(121);
      },
      (p: typeof fixture) => {
        p.subject.label = " ";
      },
      (p: typeof fixture) => {
        p.contentLanguage = "not a locale";
      },
      (p: typeof fixture) => {
        p.skills = [];
      },
      (p: typeof fixture) => {
        p.skills.push({ ...p.skills[0] });
      },
      (p: typeof fixture) => {
        p.skills.push({ id: "unused", label: "Unused" });
      },
      (p: typeof fixture) => {
        p.exercises = [];
      },
      (p: typeof fixture) => {
        p.exercises[0].skillIds = ["grammar.contrast", "grammar.contrast"];
      },
      (p: typeof fixture) => {
        p.exercises[0].choices[0].extra = true;
      },
      (p: typeof fixture) => {
        p.exercises[0].choices = [p.exercises[0].choices[0]];
      },
      (p: typeof fixture) => {
        p.exercises[0].grading = "exact";
      },
      (p: typeof fixture) => {
        p.exercises[1].answer.extra = true;
      },
      (p: typeof fixture) => {
        p.exercises[1].answer.acceptedAnswers = [];
      },
      (p: typeof fixture) => {
        p.exercises[2].grading = "invalid";
      },
      (p: typeof fixture) => {
        p.exercises[3].answer.rubric = [];
      },
      (p: typeof fixture) => {
        p.exercises[4].prompt += "{{blank}}";
      },
      (p: typeof fixture) => {
        p.exercises[0].prompt = "x".repeat(2001);
      },
    ];
    for (const change of changes) {
      const p = copy();
      change(p);
      expect(validatePack(p).error).toBe("VALIDATION_FAILED");
    }
    expect(validatePack([]).error).toBe("VALIDATION_FAILED");
    expect(validatePack({ ...fixture, exercises: "wrong" }).error).toBe("VALIDATION_FAILED");
    const max = copy();
    max.title = "x".repeat(120);
    max.exercises[0].prompt = "x".repeat(2000);
    max.exercises[0].choices = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      text: `${i}${"x".repeat(499)}`,
    }));
    max.exercises[0].answer.choiceId = "c0";
    expect(validatePack(max).pack).toBeDefined();
  });
  it("accepts maximum collection counts and rejects the next item", () => {
    const p = copy();
    p.skills = Array.from({ length: 20 }, (_, i) => ({ id: `skill.${i}`, label: `Skill ${i}` }));
    p.exercises = Array.from({ length: 40 }, (_, i) => ({
      id: `q-${i}`,
      type: "short_answer",
      grading: "exact",
      skillIds: [`skill.${i % 20}`],
      prompt: "Question",
      answer: {
        acceptedAnswers: Array.from({ length: 10 }, (_, j) => `answer ${j}`),
        explanation: "Explanation",
      },
    }));
    expect(validatePack(p).pack).toBeDefined();
    const tooManyExercises = structuredClone(p);
    tooManyExercises.exercises.push({ ...p.exercises[0], id: "q-extra" });
    expect(validatePack(tooManyExercises).error).toBe("VALIDATION_FAILED");
    const tooManySkills = structuredClone(p);
    tooManySkills.skills.push({ id: "extra", label: "Extra" });
    expect(validatePack(tooManySkills).error).toBe("VALIDATION_FAILED");
    const tooManyAnswers = structuredClone(p);
    tooManyAnswers.exercises[0].answer.acceptedAnswers.push("extra");
    expect(validatePack(tooManyAnswers).error).toBe("VALIDATION_FAILED");
    const tooManyRefs = structuredClone(p);
    tooManyRefs.exercises[0].skillIds = ["skill.0", "skill.1", "skill.2", "skill.3"];
    expect(validatePack(tooManyRefs).error).toBe("VALIDATION_FAILED");
    let nested: unknown = {};
    for (let i = 0; i < 11; i++) nested = { child: nested };
    expect(validatePack(nested).issues?.[0].message).not.toContain("nesting");
    expect(validatePack({ child: nested }).issues?.[0].message).toContain("nesting");
  });
  it("hashes sorted object keys but preserves arrays and content", () => {
    expect(hash({ b: 2, a: [1, 2] })).toBe(hash({ a: [1, 2], b: 2 }));
    expect(hash({ a: [1, 2] })).not.toBe(hash({ a: [2, 1] }));
    const p = copy();
    p.title += " changed";
    expect(hash(p)).not.toBe(hash(fixture));
  });
});
