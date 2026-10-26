import "server-only";
import { createHash } from "node:crypto";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { canonicalJson, idSchema, type LearningPack } from "./schema";
import { learnerPack } from "./projection";

const cursorSchema = z.strictObject({
  seconds: z.number().int().min(-62135596800).max(253402300799),
  nanoseconds: z.number().int().min(0).max(999999999),
  id: idSchema,
  packId: z.null(),
});
export function parseCursor(raw: string) {
  if (raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const decoded = Buffer.from(raw, "base64url");
    if (decoded.toString("base64url") !== raw) return null;
    const result = cursorSchema.safeParse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded)),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export async function importPack(uid: string, pack: LearningPack) {
  const db = getFirebaseAdmin().firestore;
  const hash = createHash("sha256").update(canonicalJson(pack)).digest("hex");
  const ref = db.collection("users").doc(uid).collection("packs").doc(pack.id);
  const keyRef = db.collection("users").doc(uid).collection("packKeys").doc(pack.id);
  const projected = learnerPack(pack);
  const keys = Object.fromEntries(pack.exercises.map((e) => [e.id, e.answer]));
  const keyDoc = { schemaVersion: 1, packId: pack.id, contentHash: hash, keys };
  if (
    Buffer.byteLength(JSON.stringify(projected)) > 512 * 1024 ||
    Buffer.byteLength(JSON.stringify(keyDoc)) > 512 * 1024
  )
    throw new Error("Document exceeds budget");
  const result = await db.runTransaction(async (tx) => {
    const [existing, existingKey] = await tx.getAll(ref, keyRef);
    if (
      existing.exists !== existingKey.exists ||
      (existing.exists && existing.get("contentHash") !== existingKey.get("contentHash"))
    )
      throw new Error("Inconsistent pack pair");
    if (existing.exists) return existing.get("contentHash") === hash ? "duplicate" : "conflict";
    tx.create(ref, { ...projected, contentHash: hash, importedAt: FieldValue.serverTimestamp() });
    tx.create(keyRef, keyDoc);
    return "created";
  });
  return { result, packId: pack.id, contentHash: hash };
}

export async function getPack(uid: string, id: string) {
  const doc = await getFirebaseAdmin()
    .firestore.collection("users")
    .doc(uid)
    .collection("packs")
    .doc(id)
    .get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  // Persisted documents are projected again on read to avoid returning unknown fields.
  const publicPack = learnerPack(data as LearningPack);
  return {
    ...publicPack,
    contentHash: data.contentHash,
    importedAt: (data.importedAt as Timestamp).toDate().toISOString(),
  };
}
export async function listPacks(
  uid: string,
  limit: number,
  cursor: ReturnType<typeof parseCursor>,
) {
  const collection = getFirebaseAdmin().firestore.collection("users").doc(uid).collection("packs");
  let query = collection.orderBy("importedAt", "desc").orderBy(FieldPath.documentId(), "desc");
  if (cursor)
    query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.id);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  const items = page.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      subject: { id: d.subject.id, label: d.subject.label },
      level: d.level,
      exerciseCount: d.exercises.length,
      importedAt: (d.importedAt as Timestamp).toDate().toISOString(),
      contentHash: d.contentHash,
    };
  });
  const last = page.at(-1);
  const t = last?.get("importedAt") as Timestamp | undefined;
  const nextCursor =
    docs.length > limit && last && t
      ? Buffer.from(
          JSON.stringify({
            seconds: t.seconds,
            nanoseconds: t.nanoseconds,
            id: last.id,
            packId: null,
          }),
        ).toString("base64url")
      : null;
  return { items, nextCursor };
}
