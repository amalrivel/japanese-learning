import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { learnerPack } from "@/features/content/projection";
import { learningPackSchema, normalizeAnswer } from "@/features/content/schema";
import {
  attemptIdSchema,
  draftSchema,
  startSchema,
  validateAnswers,
  validateCompleteAnswers,
  matchesAccepted,
} from "@/features/practice/answers";

const pack = learnerPack(
  learningPackSchema.parse(JSON.parse(readFileSync("examples/learning-pack.v1.json", "utf8"))),
);
const answers = {
  "noni-choice": { choiceId: "noni" },
  "prepare-blank": { text: "" },
  "reading-short": { text: "やくそく" },
  "habit-short": { text: "習慣" },
  "contrast-review": { text: "contrast" },
};

describe("draft answers", () => {
  it("accepts only lowercase UUID v4 attempt IDs", () => {
    expect(attemptIdSchema.safeParse("abcdefab-cdef-4abc-8def-abcdefabcdef").success).toBe(true);
    for (const id of [
      "ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF",
      "abcdefab-cdef-1abc-8def-abcdefabcdef",
      "abcdefab-cdef-4abc-0def-abcdefabcdef",
      "../attempt",
    ]) {
      expect(attemptIdSchema.safeParse(id).success).toBe(false);
    }
  });
  it("accepts all five exercise variants and partial drafts", () => {
    expect(
      validateAnswers(draftSchema.parse({ revision: 0, answers }).answers, pack.exercises),
    ).toBe(true);
    expect(validateAnswers({}, pack.exercises)).toBe(true);
    expect(validateCompleteAnswers(answers, pack.exercises)).toBe(false);
    expect(
      validateCompleteAnswers({ ...answers, "prepare-blank": { text: "answer" } }, pack.exercises),
    ).toBe(true);
  });
  it("normalizes NFKC, Unicode whitespace and case but preserves punctuation", () => {
    expect(normalizeAnswer("  ＡＢＣ\u3000\tＤ  ")).toBe("abc d");
    expect(normalizeAnswer("answer!")).not.toBe(normalizeAnswer("answer"));
    expect(matchesAccepted("  ＡＢＣ\u3000Ｄ  ", ["other", "abc d"])).toBe(true);
    expect(matchesAccepted("abc d!", ["abc d", "other"])).toBe(false);
  });
  it("rejects unknown exercises, choices and shapes", () => {
    expect(validateAnswers({ unknown: { text: "x" } }, pack.exercises)).toBe(false);
    expect(validateAnswers({ "noni-choice": { choiceId: "wrong" } }, pack.exercises)).toBe(false);
    expect(validateAnswers({ "noni-choice": { text: "x" } }, pack.exercises)).toBe(false);
    expect(validateAnswers({ "habit-short": { choiceId: "noni" } }, pack.exercises)).toBe(false);
  });
  it("rejects injected fields and overlong text", () => {
    for (const field of ["uid", "grade", "result", "updatedAt"]) {
      expect(draftSchema.safeParse({ revision: 0, answers: {}, [field]: "x" }).success).toBe(false);
      expect(
        draftSchema.safeParse({
          revision: 0,
          answers: { "habit-short": { text: "x", [field]: "x" } },
        }).success,
      ).toBe(false);
    }
    expect(
      draftSchema.safeParse({ revision: 0, answers: { "habit-short": { text: "x".repeat(2001) } } })
        .success,
    ).toBe(false);
    expect(
      startSchema.safeParse({
        attemptId: "00000000-0000-4000-8000-000000000000",
        packId: pack.id,
        uid: "x",
      }).success,
    ).toBe(false);
  });
});
