import { withinDepthV2 } from "@/features/content/schema-v2";
import { parseLearningDataV2 } from "@/features/analytics/teacher-schema-v2";
import { importFeedbackV2 } from "@/features/analytics/teacher-v2.server";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, 384 * 1024);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = parseLearningDataV2(JSON.stringify(body.value));
    if (parsed.error || parsed.data?.kind !== "teacher-feedback")
      return apiError(422, parsed.error ?? "VALIDATION_FAILED", "Feedback tidak valid.");
    const result = await importFeedbackV2(uid, parsed.data);
    if (result === "not_found") return apiError(404, "NOT_FOUND", "Snapshot tidak ditemukan.");
    if (result === "conflict") return apiError(409, "ID_CONFLICT", "ID feedback sudah digunakan.");
    if (result === "limit")
      return apiError(413, "PAYLOAD_TOO_LARGE", "Riwayat melampaui batas konteks.");
    if (result === "invalid")
      return apiError(
        422,
        "VALIDATION_FAILED",
        "Target, jawaban, atau referensi feedback tidak valid.",
      );
    return apiJson(
      { id: parsed.data.id, duplicate: result === "duplicate" },
      result === "created" ? 201 : 200,
    );
  });
}
