import "server-only";

import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { canonicalJson } from "@/features/content/schema";
import { learningPackV2Schema } from "@/features/content/schema-v2";
import { learningWorkV2Schema, workMatchesPackV2 } from "@/features/practice/work-schema-v2";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  teacherContextV2Schema,
  teacherFeedbackV2Schema,
  type TeacherContextV2,
  type TeacherFeedbackV2,
} from "./teacher-schema-v2";

const root = (uid: string) => getFirebaseAdmin().firestore.collection("users").doc(uid);
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const maxContextBytes = 512 * 1024;

type Snapshot = TeacherContextV2["snapshots"][number];
function snapshotValue(doc: FirebaseFirestore.DocumentSnapshot): Snapshot {
  const value = doc.get("snapshot") as Snapshot;
  const context = {
    schemaVersion: 2,
    kind: "teacher-context",
    generatedAt: new Date().toISOString(),
    snapshots: [value],
    feedbackHistory: [],
  };
  return teacherContextV2Schema.parse(context).snapshots[0];
}

export async function createSnapshotV2(
  uid: string,
  snapshotId: string,
  workId: string,
  revision: number,
) {
  const user = root(uid);
  const ref = user.collection("teacherSnapshots").doc(snapshotId);
  const workRef = user.collection("learningWorks").doc(workId);
  const revisionRef = workRef.collection("snapshotRevisions").doc(String(revision));
  const now = new Date().toISOString();
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [existing, workDoc, prior] = await tx.getAll(ref, workRef, revisionRef);
    if (existing.exists) {
      const snapshot = snapshotValue(existing);
      return snapshot.work.id === workId && snapshot.work.revision === revision
        ? { result: "existing" as const, snapshot }
        : { result: "conflict" as const };
    }
    if (prior.exists)
      return { result: "revision_exists" as const, snapshotId: prior.get("snapshotId") as string };
    if (!workDoc.exists) return { result: "not_found" as const };
    const work = learningWorkV2Schema.parse(workDoc.get("work"));
    if (work.revision !== revision) return { result: "stale" as const };
    const packDoc = await tx.get(user.collection("learningPacks").doc(work.packId));
    if (!packDoc.exists) throw new Error("Missing pack");
    const pack = learningPackV2Schema.parse(packDoc.get("pack"));
    if (!workMatchesPackV2(work, pack)) throw new Error("Invalid saved work");
    const snapshot = { id: snapshotId, pack, work };
    const context = {
      schemaVersion: 2,
      kind: "teacher-context",
      generatedAt: now,
      snapshots: [snapshot],
      feedbackHistory: [],
    };
    if (
      !teacherContextV2Schema.safeParse(context).success ||
      Buffer.byteLength(JSON.stringify(context)) > maxContextBytes
    )
      return { result: "too_large" as const };
    tx.create(ref, { snapshot, feedbackIds: [], createdAt: now });
    tx.create(revisionRef, { snapshotId });
    return { result: "created" as const, snapshot };
  });
}

export async function listSnapshotsV2(uid: string, limit: number, cursor: string | null) {
  let query = root(uid).collection("teacherSnapshots").orderBy(FieldPath.documentId());
  if (cursor) query = query.startAfter(cursor);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  return {
    items: page.map((doc) => {
      const snapshot = snapshotValue(doc);
      return {
        id: snapshot.id,
        packId: snapshot.pack.id,
        title: snapshot.pack.title,
        workId: snapshot.work.id,
        revision: snapshot.work.revision,
        createdAt: doc.get("createdAt") as string,
      };
    }),
    nextCursor: docs.length > limit ? page.at(-1)!.id : null,
  };
}

export async function importFeedbackV2(uid: string, feedback: TeacherFeedbackV2) {
  const user = root(uid);
  const ref = user.collection("teacherFeedback").doc(feedback.id);
  const snapshotRef = user.collection("teacherSnapshots").doc(feedback.target.snapshotId);
  const contentHash = hash(feedback);
  const now = new Date().toISOString();
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [existing, snapshotDoc] = await tx.getAll(ref, snapshotRef);
    if (existing.exists)
      return existing.get("contentHash") === contentHash
        ? ("duplicate" as const)
        : ("conflict" as const);
    if (!snapshotDoc.exists) return "not_found" as const;
    const snapshot = snapshotValue(snapshotDoc);
    const ids = snapshotDoc.get("feedbackIds") as string[];
    if (!Array.isArray(ids) || ids.length >= 40) return "limit" as const;
    const docs = ids.length
      ? await tx.getAll(...ids.map((id) => user.collection("teacherFeedback").doc(id)))
      : [];
    if (docs.some((doc) => !doc.exists)) throw new Error("Missing feedback");
    const feedbackHistory = docs.map((doc) => teacherFeedbackV2Schema.parse(doc.get("feedback")));
    const candidate = {
      schemaVersion: 2,
      kind: "teacher-context",
      generatedAt: now,
      snapshots: [snapshot],
      feedbackHistory: [...feedbackHistory, feedback],
    };
    if (Buffer.byteLength(JSON.stringify(candidate)) > maxContextBytes) return "limit" as const;
    if (!teacherContextV2Schema.safeParse(candidate).success) return "invalid" as const;
    tx.create(ref, { feedback, contentHash, importedAt: now });
    tx.update(snapshotRef, { feedbackIds: [...ids, feedback.id] });
    return "created" as const;
  });
}

export async function contextV2(uid: string, ids: string[]) {
  const user = root(uid);
  const snapshots = await getFirebaseAdmin().firestore.getAll(
    ...ids.map((id) => user.collection("teacherSnapshots").doc(id)),
  );
  if (snapshots.some((doc) => !doc.exists)) return { error: "not_found" as const };
  const feedbackIds = snapshots.flatMap((doc) => doc.get("feedbackIds") as string[]);
  if (feedbackIds.length > 40) return { error: "limit" as const };
  const feedback = feedbackIds.length
    ? await getFirebaseAdmin().firestore.getAll(
        ...feedbackIds.map((id) => user.collection("teacherFeedback").doc(id)),
      )
    : [];
  if (feedback.some((doc) => !doc.exists)) throw new Error("Missing feedback");
  const context = {
    schemaVersion: 2,
    kind: "teacher-context",
    generatedAt: new Date().toISOString(),
    snapshots: snapshots.map(snapshotValue),
    feedbackHistory: feedback.map((doc) => teacherFeedbackV2Schema.parse(doc.get("feedback"))),
  };
  if (Buffer.byteLength(JSON.stringify(context)) > maxContextBytes)
    return { error: "limit" as const };
  const validated = teacherContextV2Schema.safeParse(context);
  return validated.success ? { context: validated.data } : { error: "invalid" as const };
}
