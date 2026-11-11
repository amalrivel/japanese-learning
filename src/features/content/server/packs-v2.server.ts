import "server-only";

import { createHash } from "node:crypto";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { canonicalJson } from "../model/schema";
import { learningPackV2Schema, type LearningPackV2 } from "../model/schema-v2";

function packs(uid: string) {
  return getFirebaseAdmin().firestore.collection("users").doc(uid).collection("learningPacks");
}

export async function importPackV2(uid: string, pack: LearningPackV2) {
  const ref = packs(uid).doc(pack.id);
  const contentHash = createHash("sha256").update(canonicalJson(pack)).digest("hex");
  const result = await getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists)
      return existing.get("contentHash") === contentHash ? "duplicate" : "conflict";
    tx.create(ref, { pack, contentHash, importedAt: FieldValue.serverTimestamp() });
    return "created";
  });
  return { result, packId: pack.id, contentHash };
}

export async function getPackV2(uid: string, id: string) {
  const doc = await packs(uid).doc(id).get();
  return doc.exists
    ? {
        pack: learningPackV2Schema.parse(doc.get("pack")),
        contentHash: doc.get("contentHash") as string,
      }
    : null;
}

export async function listPacksV2(uid: string, limit: number, cursor: string | null) {
  let query = packs(uid).orderBy(FieldPath.documentId());
  if (cursor) query = query.startAfter(cursor);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  return {
    items: page.map((doc) => {
      const pack = learningPackV2Schema.parse(doc.get("pack"));
      return { id: pack.id, title: pack.title, subject: pack.subject, level: pack.level };
    }),
    nextCursor: docs.length > limit ? page.at(-1)!.id : null,
  };
}
