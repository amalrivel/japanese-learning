import "server-only";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { idSchema, type LearningPack } from "@/features/content/schema";
import { learnerPack } from "@/features/content/projection";
import { attemptIdSchema, draftSchema, validateAnswers, type Answers } from "./answers";

const collection = (uid: string) => getFirebaseAdmin().firestore.collection("users").doc(uid);
const date = (value: Timestamp | null) => (value ? value.toDate().toISOString() : null);
function draft(data: FirebaseFirestore.DocumentData) {
  return {
    schemaVersion: 1,
    id: data.id,
    packId: data.packId,
    packHash: data.packHash,
    packTitle: data.packTitle,
    subject: { id: data.subject.id, label: data.subject.label },
    level: data.level,
    skills: data.skills.map((s: { id: string; label: string }) => ({ id: s.id, label: s.label })),
    status: data.status,
    revision: data.revision,
    answers: draftSchema.parse({ revision: data.revision, answers: data.answers }).answers,
    results: {},
    createdAt: date(data.createdAt),
    updatedAt: date(data.updatedAt),
    submittedAt: date(data.submittedAt),
    completedAt: date(data.completedAt),
  };
}

export async function getAttempt(uid: string, id: string) {
  const doc = await collection(uid).collection("attempts").doc(id).get();
  return doc.exists ? draft(doc.data()!) : null;
}

export async function startAttempt(uid: string, id: string, packId: string) {
  const root = collection(uid);
  const ref = root.collection("attempts").doc(id);
  const packRef = root.collection("packs").doc(packId);
  const keyRef = root.collection("packKeys").doc(packId);
  const result = await getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const [existing, pack] = await tx.getAll(ref, packRef);
    if (existing.exists) return existing.get("packId") === packId ? "existing" : "conflict";
    const [key] = await tx.getAll(keyRef, { fieldMask: ["contentHash"] });
    if (!pack.exists && !key.exists) return "not_found";
    if (pack.exists !== key.exists || pack.get("contentHash") !== key.get("contentHash"))
      throw new Error("Inconsistent pack pair");
    const p = learnerPack(pack.data() as LearningPack);
    tx.create(ref, {
      schemaVersion: 1,
      id,
      packId,
      packHash: pack.get("contentHash"),
      packTitle: p.title,
      subject: p.subject,
      level: p.level,
      skills: p.skills,
      status: "in_progress",
      revision: 0,
      answers: {},
      results: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      submittedAt: null,
      completedAt: null,
      submissionHash: null,
      assessmentHash: null,
    });
    return "created";
  });
  return {
    result,
    attempt: result === "created" || result === "existing" ? await getAttempt(uid, id) : null,
  };
}

export async function saveAttempt(uid: string, id: string, revision: number, answers: Answers) {
  const root = collection(uid);
  const ref = root.collection("attempts").doc(id);
  const result = await getFirebaseAdmin().firestore.runTransaction(async (tx) => {
    const attempt = await tx.get(ref);
    if (!attempt.exists) return "not_found";
    if (attempt.get("status") !== "in_progress") return "invalid_state";
    if (attempt.get("revision") !== revision) return "stale";
    if (revision === Number.MAX_SAFE_INTEGER) return "invalid_state";
    const pack = await tx.get(root.collection("packs").doc(attempt.get("packId")));
    if (!pack.exists || pack.get("contentHash") !== attempt.get("packHash"))
      throw new Error("Missing immutable pack");
    if (!validateAnswers(answers, learnerPack(pack.data() as LearningPack).exercises))
      return "invalid";
    if (Buffer.byteLength(JSON.stringify({ ...attempt.data(), answers })) > 512 * 1024)
      return "invalid";
    tx.update(ref, { answers, revision: revision + 1, updatedAt: FieldValue.serverTimestamp() });
    return "saved";
  });
  const updated = result === "saved" ? await getAttempt(uid, id) : null;
  return {
    result,
    updated: updated ? { revision: revision + 1, updatedAt: updated.updatedAt } : null,
  };
}

const cursorSchema = z.strictObject({
  seconds: z.number().int().min(-62135596800).max(253402300799),
  nanoseconds: z.number().int().min(0).max(999999999),
  id: attemptIdSchema,
  packId: idSchema.nullable(),
});
export function parseAttemptCursor(raw: string, packId: string | null) {
  if (raw.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const bytes = Buffer.from(raw, "base64url");
    if (bytes.toString("base64url") !== raw) return null;
    const parsed = cursorSchema.safeParse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
    return parsed.success && parsed.data.packId === packId ? parsed.data : null;
  } catch {
    return null;
  }
}
export async function listAttempts(
  uid: string,
  limit: number,
  packId: string | null,
  cursor: ReturnType<typeof parseAttemptCursor>,
) {
  const ref = collection(uid).collection("attempts");
  let query: FirebaseFirestore.Query = packId ? ref.where("packId", "==", packId) : ref;
  query = query.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
  if (cursor)
    query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.id);
  const docs = (await query.limit(limit + 1).get()).docs;
  const page = docs.slice(0, limit);
  const items = page.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      packId: d.packId,
      packTitle: d.packTitle,
      status: d.status,
      createdAt: date(d.createdAt),
      updatedAt: date(d.updatedAt),
      submittedAt: date(d.submittedAt),
      completedAt: date(d.completedAt),
    };
  });
  const last = page.at(-1);
  const timestamp = last?.get("createdAt") as Timestamp | undefined;
  const nextCursor =
    docs.length > limit && last && timestamp
      ? Buffer.from(
          JSON.stringify({
            seconds: timestamp.seconds,
            nanoseconds: timestamp.nanoseconds,
            id: last.id,
            packId,
          }),
        ).toString("base64url")
      : null;
  return { items, nextCursor };
}
