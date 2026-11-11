import { selectionSchema } from "@/features/analytics/server/progress-v2.server";
import { latestWorkV2 } from "@/features/practice/server/work-v2.server";
import { learningPackV2Schema } from "@/features/content/model/schema-v2";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";
export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const root = getFirebaseAdmin().firestore.collection("users").doc(uid);
    const [settings, pending] = await Promise.all([
      root.collection("settings").doc("learning").get(),
      latestWorkV2(uid),
    ]);
    const packId = settings.exists ? selectionSchema.parse(settings.data()).packId : null;
    const packDoc = packId ? await root.collection("learningPacks").doc(packId).get() : null;
    const pack = packDoc?.exists ? learningPackV2Schema.parse(packDoc.get("pack")) : null;
    return apiJson({
      pack: pack ? { id: pack.id, title: pack.title } : null,
      work: pending,
    });
  });
}
export function PUT(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, 1024);
    if (body.response) return body.response;
    const parsed = selectionSchema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Pilihan tidak valid.");
    const root = getFirebaseAdmin().firestore.collection("users").doc(uid);
    const settings = root.collection("settings").doc("learning");
    const found = await getFirebaseAdmin().firestore.runTransaction(async (tx) => {
      if (
        parsed.data.packId &&
        !(await tx.get(root.collection("learningPacks").doc(parsed.data.packId))).exists
      )
        return false;
      tx.set(settings, parsed.data);
      return true;
    });
    return found ? apiJson(parsed.data) : apiError(404, "NOT_FOUND", "Paket tidak ditemukan.");
  });
}
