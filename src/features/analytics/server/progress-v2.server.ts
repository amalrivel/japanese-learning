import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { learningPackV2Schema, utcV2Schema } from "@/features/content/model/schema-v2";
import { learningWorkV2Schema, workMatchesPackV2 } from "@/features/practice/model/work-schema-v2";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  teacherContextV2Schema,
  teacherFeedbackV2Schema,
  feedbackMatchesContextV2,
} from "../model/teacher-schema-v2";
import { summarizeV2 } from "../model/progress-v2";

const limit = 100;
export async function progressV2(uid: string) {
  const db = getFirebaseAdmin().firestore;
  const root = db.collection("users").doc(uid);
  const [workDocs, feedbackDocs] = await Promise.all([
    root
      .collection("learningWorks")
      .orderBy("work.updatedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit + 1)
      .get(),
    root
      .collection("teacherFeedback")
      .where("feedback.mode", "==", "assessment")
      .orderBy("importedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit + 1)
      .get(),
  ]);
  const works = workDocs.docs
    .slice(0, limit)
    .map((doc) => learningWorkV2Schema.parse(doc.get("work")));
  const feedback = feedbackDocs.docs
    .slice(0, limit)
    .map((doc) => ({
      feedback: teacherFeedbackV2Schema.parse(doc.get("feedback")),
      importedAt: utcV2Schema.parse(doc.get("importedAt")),
    }));
  const packIds = [...new Set(works.map((work) => work.packId))];
  const snapshotIds = [...new Set(feedback.map(({ feedback }) => feedback.target.snapshotId))];
  const [packs, snapshots] = await Promise.all([
    packIds.length
      ? db.getAll(...packIds.map((id) => root.collection("learningPacks").doc(id)))
      : [],
    snapshotIds.length
      ? db.getAll(...snapshotIds.map((id) => root.collection("teacherSnapshots").doc(id)))
      : [],
  ]);
  const packMap = new Map(
    packs.map((doc) => [doc.id, learningPackV2Schema.parse(doc.get("pack"))]),
  );
  const snapshotMap = new Map(
    snapshots.map((doc) => [
      doc.id,
      teacherContextV2Schema.parse({
        schemaVersion: 2,
        kind: "teacher-context",
        generatedAt: new Date().toISOString(),
        snapshots: [doc.get("snapshot")],
        feedbackHistory: [],
      }).snapshots[0],
    ]),
  );
  const workRows = works.map((work) => {
    const pack = packMap.get(work.packId);
    if (!pack || !workMatchesPackV2(work, pack)) throw new Error("Invalid work");
    return { work, pack };
  });
  const assessmentRows = feedback.map((row) => {
    const snapshot = snapshotMap.get(row.feedback.target.snapshotId);
    if (
      !snapshot ||
      row.feedback.mode !== "assessment" ||
      !feedbackMatchesContextV2(row.feedback, {
        schemaVersion: 2,
        kind: "teacher-context",
        generatedAt: new Date().toISOString(),
        snapshots: [snapshot],
        feedbackHistory: [],
      })
    )
      throw new Error("Invalid assessment");
    return { ...row, feedback: row.feedback, snapshot };
  });
  const range = (dates: string[], truncated: boolean) => ({
    count: dates.length,
    newest: dates[0] ?? null,
    oldest: dates.at(-1) ?? null,
    truncated,
  });
  return {
    ...summarizeV2(workRows, assessmentRows),
    workWindow: range(
      works.map((w) => w.updatedAt),
      workDocs.size > limit,
    ),
    assessmentWindow: range(
      feedback.map((f) => f.importedAt),
      feedbackDocs.size > limit,
    ),
  };
}
export type ProgressV2 = Awaited<ReturnType<typeof progressV2>>;
export const selectionSchema = z.strictObject({
  packId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .nullable(),
});
