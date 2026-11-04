import { withinDepthV2 } from "@/features/content/schema-v2";
import { attemptIdSchema } from "@/features/practice/answers";
import { saveWorkV2Schema } from "@/features/practice/work-v2-request";
import { changeWorkV2, getWorkV2 } from "@/features/practice/work-v2.server";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

type Context = { params: Promise<{ workId: string }> };
export function GET(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { workId } = await context.params;
    if (!attemptIdSchema.safeParse(workId).success)
      return apiError(422, "VALIDATION_FAILED", "ID pekerjaan tidak valid.");
    const result = await getWorkV2(uid, workId);
    return result ? apiJson(result) : apiError(404, "NOT_FOUND", "Pekerjaan tidak ditemukan.");
  });
}
export function PATCH(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { workId } = await context.params;
    if (!attemptIdSchema.safeParse(workId).success)
      return apiError(422, "VALIDATION_FAILED", "ID pekerjaan tidak valid.");
    const body = await readJson(request, 384 * 1024);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = saveWorkV2Schema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Pekerjaan tidak valid.");
    const { operationId, expectedRevision, ...edit } = parsed.data;
    const result = await changeWorkV2(uid, workId, operationId, expectedRevision, edit);
    if (result.result === "not_found")
      return apiError(404, "NOT_FOUND", "Pekerjaan tidak ditemukan.");
    if (result.result === "invalid")
      return apiError(422, "VALIDATION_FAILED", "Jawaban tidak sesuai paket.");
    if (!("work" in result))
      return apiError(409, result.result.toUpperCase(), "Pekerjaan berubah atau terkunci.");
    return apiJson(result.work);
  });
}
