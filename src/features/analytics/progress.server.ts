import "server-only";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { summarize, type CompletedAttempt } from "./summary";

export async function completedWindow(uid: string) {
  const generatedAt = new Date().toISOString();
  const root = getFirebaseAdmin().firestore.collection("users").doc(uid);
  const snapshots = await root
    .collection("attempts")
    .where("status", "==", "completed")
    .where("completedAt", "<=", Timestamp.fromDate(new Date(generatedAt)))
    .orderBy("completedAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(101)
    .get();
  const rows = snapshots.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    completedAt: (doc.get("completedAt") as Timestamp).toDate().toISOString(),
  }));
  return {
    root,
    rows,
    generatedAt,
    progress: summarize(rows as unknown as CompletedAttempt[], generatedAt),
  };
}
