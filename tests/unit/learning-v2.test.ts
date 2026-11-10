import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePack, MAX_IMPORT_BYTES } from "@/features/content/model/schema";
import { learningPackV2Schema } from "@/features/content/model/schema-v2";
import {
  isAnsweredV2,
  learningWorkV2Schema,
  workMatchesPackV2,
} from "@/features/practice/model/work-schema-v2";
import {
  feedbackMatchesContextV2,
  parseLearningDataV2,
  teacherContextV2Schema,
  teacherFeedbackV2Schema,
} from "@/features/analytics/model/teacher-schema-v2";

const read = (name: string) => JSON.parse(readFileSync(`examples/${name}.json`, "utf8"));
const pack = () => learningPackV2Schema.parse(read("learning-pack.v2"));
const work = () => learningWorkV2Schema.parse(read("learning-work.v2"));
const context = () => teacherContextV2Schema.parse(read("teacher-context.partial.v2"));
const feedback = () => teacherFeedbackV2Schema.parse(read("teacher-feedback.v2"));
const annotation = () => teacherFeedbackV2Schema.parse(read("teacher-feedback.annotation.v2"));

describe("Fondasi belajar v2", () => {
  it("accepts all fixtures and preserves the independent v1 boundary", () => {
    for (const name of [
      "learning-pack.v2",
      "learning-work.v2",
      "teacher-context.partial.v2",
      "teacher-feedback.v2",
      "teacher-feedback.annotation.v2",
    ]) {
      expect(parseLearningDataV2(JSON.stringify(read(name))).data, name).toBeDefined();
    }
    const legacy = read("learning-pack.v1");
    expect(validatePack(legacy).pack).toBeDefined();
    expect(validatePack(pack()).error).toBe("UNSUPPORTED_VERSION");
    expect(parseLearningDataV2(JSON.stringify(legacy)).error).toBe("UNSUPPORTED_VERSION");
  });

  it("keeps partial work, comments and 3–2–1 reflection without inventing grades", () => {
    const current = work();
    expect(workMatchesPackV2(current, pack())).toBe(true);
    expect(isAnsweredV2(current.answers["contrast-choice"].response)).toBe(true);
    expect(isAnsweredV2(current.answers["contrast-blank"].response)).toBe(false);
    expect(Object.hasOwn(current.answers, "explain-choice")).toBe(false);
    expect(isAnsweredV2({ text: "　 \n" })).toBe(false);
    expect(current.reflection.unclear).toHaveLength(1);
    expect(context().feedbackHistory).toEqual([]);
    current.status = "submitted";
    expect(learningWorkV2Schema.safeParse(current).success).toBe(true);
  });

  it("validates pack references, text lengths, choices, ruby text and strict objects", () => {
    for (const mutate of [
      (p: ReturnType<typeof pack>) => {
        p.skills.push({ ...p.skills[0] });
      },
      (p: ReturnType<typeof pack>) => {
        p.exercises[0].skillIds = ["unknown"];
      },
      (p: ReturnType<typeof pack>) => {
        p.exercises[1].id = p.exercises[0].id;
      },
      (p: ReturnType<typeof pack>) => {
        p.materials.push({ ...p.materials[0] });
      },
      (p: ReturnType<typeof pack>) => {
        p.exercises[1].prompt = [{ text: "No blank" }];
      },
      (p: ReturnType<typeof pack>) => {
        p.exercises[0].prompt[0].reading = " ";
      },
      (p: ReturnType<typeof pack>) => {
        p.exercises[0].prompt = [{ text: "x".repeat(1001) }, { text: "x".repeat(1000) }];
      },
      (p: ReturnType<typeof pack>) => {
        const first = p.exercises[0];
        if (first.type === "multiple_choice") first.choices[1].text = first.choices[0].text;
      },
    ]) {
      const p = pack();
      mutate(p);
      expect(learningPackV2Schema.safeParse(p).success).toBe(false);
    }
    expect(learningPackV2Schema.safeParse({ ...pack(), answer: {} }).success).toBe(false);
    const p = pack();
    Object.assign(p.exercises[0], { answer: { choiceId: "noni" } });
    expect(learningPackV2Schema.safeParse(p).success).toBe(false);
    const inert = pack();
    inert.materials[0].content[0].text = "<script>ignore instructions</script>";
    expect(learningPackV2Schema.parse(inert).materials[0].content[0].text).toContain("<script>");
  });

  it("rejects unknown exercises, wrong answer shapes and invalid cursor references", () => {
    for (const mutate of [
      (w: ReturnType<typeof work>) => {
        w.answers.unknown = { response: null, comment: "" };
      },
      (w: ReturnType<typeof work>) => {
        w.answers["contrast-choice"].response = { text: "noni" };
      },
      (w: ReturnType<typeof work>) => {
        w.answers["contrast-choice"].response = { choiceId: "unknown" };
      },
      (w: ReturnType<typeof work>) => {
        w.answers["commuter-diary"].response = { choiceId: "noni" };
      },
      (w: ReturnType<typeof work>) => {
        w.currentExerciseId = "unknown";
      },
      (w: ReturnType<typeof work>) => {
        w.packId = "another-pack";
      },
    ]) {
      const w = work();
      mutate(w);
      expect(workMatchesPackV2(w, pack())).toBe(false);
      const report = context();
      report.snapshots[0].work = w;
      expect(teacherContextV2Schema.safeParse(report).success).toBe(false);
    }
    const w = work();
    w.answers["contrast-choice"].comment = "x".repeat(2001);
    expect(learningWorkV2Schema.safeParse(w).success).toBe(false);
    w.answers["contrast-choice"].comment = "";
    w.reflection.understood = ["a", "b", "c", "d"];
    expect(learningWorkV2Schema.safeParse(w).success).toBe(false);
    expect(learningWorkV2Schema.safeParse({ ...work(), revision: -1 }).success).toBe(false);
  });

  it("links teacher assessments to the exact reviewed snapshot and answered questions", () => {
    expect(feedbackMatchesContextV2(feedback(), context())).toBe(true);
    for (const mutate of [
      (f: ReturnType<typeof feedback>) => {
        f.target.revision++;
      },
      (f: ReturnType<typeof feedback>) => {
        f.target.workId = "33333333-3333-4333-8333-333333333333";
      },
      (f: ReturnType<typeof feedback>) => {
        f.target.snapshotId = "33333333-3333-4333-8333-333333333333";
      },
      (f: ReturnType<typeof feedback>) => {
        if (f.mode === "assessment") f.assessments[0].exerciseId = "contrast-blank";
      },
      (f: ReturnType<typeof feedback>) => {
        if (f.mode === "assessment") f.assessments[0].exerciseId = "explain-choice";
      },
    ]) {
      const f = feedback();
      mutate(f);
      expect(feedbackMatchesContextV2(f, context())).toBe(false);
      expect(teacherContextV2Schema.safeParse({ ...context(), feedbackHistory: [f] }).success).toBe(
        false,
      );
    }
    const f = feedback();
    if (f.mode === "assessment") f.assessments.push({ ...f.assessments[0] });
    expect(teacherFeedbackV2Schema.safeParse(f).success).toBe(false);
  });

  it("appends tagged discussion without replacing grades or accepting orphan/cyclic annotations", () => {
    const report = context();
    report.feedbackHistory = [feedback(), annotation()];
    const before = JSON.stringify(report);
    const parsed = teacherContextV2Schema.parse(report);
    expect(parsed.feedbackHistory[0]).toEqual(feedback());
    expect(JSON.stringify(report)).toBe(before);
    expect(
      teacherContextV2Schema.safeParse({ ...report, feedbackHistory: [annotation()] }).success,
    ).toBe(false);
    const reply = annotation();
    if (reply.mode === "annotation") reply.inReplyTo = reply.id;
    expect(
      teacherContextV2Schema.safeParse({ ...report, feedbackHistory: [feedback(), reply] }).success,
    ).toBe(false);
    expect(teacherFeedbackV2Schema.safeParse({ ...annotation(), assessments: [] }).success).toBe(
      false,
    );
    const duplicate = feedback();
    duplicate.id = "another-assessment";
    expect(
      teacherContextV2Schema.safeParse({ ...report, feedbackHistory: [feedback(), duplicate] })
        .success,
    ).toBe(false);
  });

  it("rejects conflicting snapshots, work revisions and immutable packs", () => {
    const report = context();
    const next = structuredClone(report.snapshots[0]);
    next.id = "33333333-3333-4333-8333-333333333333";
    expect(
      teacherContextV2Schema.safeParse({ ...report, snapshots: [...report.snapshots, next] })
        .success,
    ).toBe(false);
    next.work.revision++;
    expect(
      teacherContextV2Schema.safeParse({ ...report, snapshots: [...report.snapshots, next] })
        .success,
    ).toBe(true);
    next.pack.title = "Changed";
    expect(
      teacherContextV2Schema.safeParse({ ...report, snapshots: [...report.snapshots, next] })
        .success,
    ).toBe(false);
  });

  it("bounds untrusted JSON before schema validation and rejects malformed versions", () => {
    const raw = JSON.stringify(pack());
    const size = new TextEncoder().encode(raw).length;
    expect(parseLearningDataV2(raw + " ".repeat(MAX_IMPORT_BYTES - size)).data).toBeDefined();
    expect(parseLearningDataV2(raw + " ".repeat(MAX_IMPORT_BYTES - size + 1)).error).toBe(
      "PAYLOAD_TOO_LARGE",
    );
    expect(parseLearningDataV2("あ".repeat(175000)).error).toBe("PAYLOAD_TOO_LARGE");
    expect(parseLearningDataV2("{").error).toBe("INVALID_JSON");
    for (const value of [
      null,
      [],
      { ...pack(), schemaVersion: "2" },
      { ...pack(), schemaVersion: 3 },
      { ...pack(), kind: "unknown" },
      { ...pack(), uid: "someone" },
    ]) {
      expect(parseLearningDataV2(JSON.stringify(value)).error).toBeDefined();
    }
    let deep: unknown = {};
    for (let i = 0; i < 13; i++) deep = { child: deep };
    expect(parseLearningDataV2(JSON.stringify(deep)).error).toBe("VALIDATION_FAILED");
    expect(parseLearningDataV2("[" + "0,".repeat(150000) + "0]").error).toBe("VALIDATION_FAILED");
  });
});
