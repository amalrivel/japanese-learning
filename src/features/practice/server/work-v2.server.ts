import "server-only";

import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { canonicalJson } from "@/features/content/model/schema";
import { learningPackV2Schema } from "@/features/content/model/schema-v2";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import {
  learningWorkV2Schema,
  workMatchesPackV2,
  type LearningWorkV2,
} from "../model/work-schema-v2";
import { compareWorks } from "../model/work-order";

const root = (uid: string) => getFirebaseAdmin().firestore.collection("users").doc(uid);
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

async function packReviewed(
  user: FirebaseFirestore.DocumentReference,
  pack: FirebaseFirestore.DocumentSnapshot,
  tx?: FirebaseFirestore.Transaction,
) {
  if (pack.get("reviewedAt")) return true;
  const query = user.collection("teacherSnapshots").where("snapshot.pack.id", "==", pack.id);
  const snapshots = tx ? await tx.get(query) : await query.get();
  const ids = [...new Set(snapshots.docs.flatMap((doc) => doc.get("feedbackIds") as string[]))];
  if (!ids.length) return false;
  const refs = ids.map((id) => user.collection("teacherFeedback").doc(id));
  const feedback = tx
    ? await tx.getAll(...refs)
    : await getFirebaseAdmin().firestore.getAll(...refs);
  if (feedback.some((doc) => !doc.exists)) throw new Error("Missing teacher feedback");
  return feedback.some((doc) => doc.get("feedback.mode") === "assessment");
}

export async function startWorkV2(uid: string, workId: string, packId: string) {
  const user = root(uid);
  const ref = user.collection("learningWorks").doc(workId);
  const packRef = user.collection("learningPacks").doc(packId);
  const now = new Date().toISOString();
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [existing, pack] = await tx.getAll(ref, packRef);
    if (existing.exists) {
      const work = learningWorkV2Schema.parse(existing.get("work"));
      if (work.packId !== packId) return { result: "conflict" as const };
    }
    if (!pack.exists) return { result: "not_found" as const };
    const canonicalId = pack.get("workId") as string | undefined;
    if (canonicalId) {
      const canonical = await tx.get(user.collection("learningWorks").doc(canonicalId));
      if (canonical.exists) {
        const work = learningWorkV2Schema.parse(canonical.get("work"));
        if (work.packId !== packId) throw new Error("Invalid canonical work reference");
        return {
          result: "existing" as const,
          work,
        };
      }
    }
    const previous = await tx.get(
      user.collection("learningWorks").where("work.packId", "==", packId),
    );
    if (!previous.empty) {
      const work = previous.docs
        .map((doc) => learningWorkV2Schema.parse(doc.get("work")))
        .sort(compareWorks)[0];
      tx.update(packRef, { workId: work.id });
      return { result: "existing" as const, work };
    }
    const work: LearningWorkV2 = {
      schemaVersion: 2,
      kind: "learning-work",
      id: workId,
      packId,
      revision: 0,
      status: "in_progress",
      currentExerciseId: null,
      answers: {},
      reflection: { understood: [], unclear: [], nextStep: "" },
      updatedAt: now,
    };
    tx.create(ref, { work });
    tx.update(packRef, { workId });
    return { result: "created" as const, work };
  });
}

export async function getWorkV2(uid: string, workId: string) {
  const user = root(uid);
  const doc = await user.collection("learningWorks").doc(workId).get();
  if (!doc.exists) return null;
  const work = learningWorkV2Schema.parse(doc.get("work"));
  const pack = await user.collection("learningPacks").doc(work.packId).get();
  if (!pack.exists) throw new Error("Missing pack");
  const reviewed = Boolean(doc.get("reviewedAt")) || (await packReviewed(user, pack));
  return { work, pack: learningPackV2Schema.parse(pack.get("pack")), reviewed };
}

export async function listWorksV2(uid: string, limit: number, cursor: string | null) {
  let query = root(uid).collection("learningWorks").orderBy(FieldPath.documentId());
  if (cursor) query = query.startAfter(cursor);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  const user = root(uid);
  const packIds = [
    ...new Set(page.map((doc) => learningWorkV2Schema.parse(doc.get("work")).packId)),
  ];
  const packDocs = packIds.length
    ? await getFirebaseAdmin().firestore.getAll(
        ...packIds.map((id) => user.collection("learningPacks").doc(id)),
      )
    : [];
  const canonical = new Map<string, { id: string; title: string; reviewed: boolean }>();
  for (const pack of packDocs) {
    if (!pack.exists) continue;
    let id = pack.get("workId") as string | undefined;
    if (!id) {
      const candidates = await user
        .collection("learningWorks")
        .where("work.packId", "==", pack.id)
        .get();
      id = candidates.docs
        .map((doc) => learningWorkV2Schema.parse(doc.get("work")))
        .sort(compareWorks)[0]?.id;
    }
    if (id)
      canonical.set(pack.id, {
        id,
        title: learningPackV2Schema.parse(pack.get("pack")).title,
        reviewed: await packReviewed(user, pack),
      });
  }
  return {
    items: page.flatMap((doc) => {
      const work = learningWorkV2Schema.parse(doc.get("work"));
      const selected = canonical.get(work.packId);
      return selected?.id === work.id
        ? [{ ...work, packTitle: selected.title, reviewed: selected.reviewed }]
        : [];
    }),
    nextCursor: docs.length > limit ? page.at(-1)!.id : null,
  };
}

type Edit = Pick<LearningWorkV2, "answers" | "reflection" | "currentExerciseId">;
export async function changeWorkV2(
  uid: string,
  workId: string,
  operationId: string,
  expectedRevision: number,
  edit: Edit | null,
) {
  const user = root(uid);
  const ref = user.collection("learningWorks").doc(workId);
  const receipt = ref.collection("operations").doc(operationId);
  const requestHash = hash({ expectedRevision, edit });
  const now = new Date().toISOString();
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [doc, prior] = await tx.getAll(ref, receipt);
    if (prior.exists)
      return prior.get("hash") === requestHash
        ? { result: "existing" as const, work: learningWorkV2Schema.parse(prior.get("work")) }
        : { result: "conflict" as const };
    if (!doc.exists) return { result: "not_found" as const };
    const work = learningWorkV2Schema.parse(doc.get("work"));
    if (work.revision !== expectedRevision) return { result: "stale" as const };
    if (work.status !== "in_progress" || work.revision === Number.MAX_SAFE_INTEGER)
      return { result: "invalid_state" as const };
    const packDoc = await tx.get(user.collection("learningPacks").doc(work.packId));
    if (!packDoc.exists) throw new Error("Missing pack");
    if (doc.get("reviewedAt") || (await packReviewed(user, packDoc, tx)))
      return { result: "invalid_state" as const };
    const pack = learningPackV2Schema.parse(packDoc.get("pack"));
    const changed =
      edit === null ||
      canonicalJson(edit) !==
        canonicalJson({
          answers: work.answers,
          reflection: work.reflection,
          currentExerciseId: work.currentExerciseId,
        });
    const next = learningWorkV2Schema.safeParse({
      ...work,
      ...(edit ?? { status: "submitted" }),
      revision: work.revision + (changed ? 1 : 0),
      updatedAt: changed ? now : work.updatedAt,
    });
    if (
      !next.success ||
      !workMatchesPackV2(next.data, pack) ||
      Buffer.byteLength(JSON.stringify(next.data)) > 384 * 1024
    )
      return { result: "invalid" as const };
    if (changed) tx.update(ref, { work: next.data });
    tx.create(receipt, { hash: requestHash, work: next.data });
    return { result: "updated" as const, work: next.data };
  });
}

export async function reopenWorkV2(
  uid: string,
  workId: string,
  operationId: string,
  expectedRevision: number,
) {
  const user = root(uid);
  const ref = user.collection("learningWorks").doc(workId);
  const receipt = ref.collection("reopenOperations").doc(operationId);
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [doc, prior] = await tx.getAll(ref, receipt);
    if (!doc.exists) return { result: "not_found" as const };
    const work = learningWorkV2Schema.parse(doc.get("work"));
    const pack = await tx.get(user.collection("learningPacks").doc(work.packId));
    if (doc.get("reviewedAt") || (await packReviewed(user, pack, tx)))
      return { result: "invalid_state" as const };
    if (prior.exists)
      return prior.get("expectedRevision") === expectedRevision
        ? { result: "existing" as const, work: learningWorkV2Schema.parse(prior.get("work")) }
        : { result: "conflict" as const };
    if (work.revision !== expectedRevision || work.revision === Number.MAX_SAFE_INTEGER)
      return { result: "stale" as const };
    const next: LearningWorkV2 =
      work.status === "submitted"
        ? {
            ...work,
            status: "in_progress",
            revision: work.revision + 1,
            updatedAt: new Date().toISOString(),
          }
        : work;
    tx.set(receipt, { expectedRevision, work: next });
    if (next !== work) tx.update(ref, { work: next });
    return { result: "updated" as const, work: next };
  });
}
