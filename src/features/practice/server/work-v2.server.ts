import "server-only";

import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { canonicalJson } from "@/features/content/model/schema";
import { learningPackV2Schema } from "@/features/content/model/schema-v2";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { learningWorkV2Schema, workMatchesPackV2, type LearningWorkV2 } from "../model/work-schema-v2";

const root = (uid: string) => getFirebaseAdmin().firestore.collection("users").doc(uid);
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

export async function startWorkV2(uid: string, workId: string, packId: string) {
  const user = root(uid);
  const ref = user.collection("learningWorks").doc(workId);
  const packRef = user.collection("learningPacks").doc(packId);
  const now = new Date().toISOString();
  return getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [existing, pack] = await tx.getAll(ref, packRef);
    if (existing.exists) {
      const work = learningWorkV2Schema.parse(existing.get("work"));
      return work.packId === packId
        ? { result: "existing" as const, work }
        : { result: "conflict" as const };
    }
    if (!pack.exists) return { result: "not_found" as const };
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
  return { work, pack: learningPackV2Schema.parse(pack.get("pack")) };
}

export async function listWorksV2(uid: string, limit: number, cursor: string | null) {
  let query = root(uid).collection("learningWorks").orderBy(FieldPath.documentId());
  if (cursor) query = query.startAfter(cursor);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  return {
    items: page.map((doc) => learningWorkV2Schema.parse(doc.get("work"))),
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
