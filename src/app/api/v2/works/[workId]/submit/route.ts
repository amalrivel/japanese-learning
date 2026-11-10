import { withinDepthV2 } from "@/features/content/model/schema-v2";
import { attemptIdSchema } from "@/features/practice/model/answers";
import { submitWorkV2Schema } from "@/features/practice/model/work-v2-request";
import { changeWorkV2 } from "@/features/practice/server/work-v2.server";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

type Context = { params: Promise<{ workId: string }> };
export function POST(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { workId } = await context.params;
    if (!attemptIdSchema.safeParse(workId).success)
      return apiError(422, "VALIDATION_FAILED", "ID pekerjaan tidak valid.");
    const body = await readJson(request, 4096);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = submitWorkV2Schema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Permintaan tidak valid.");
    const result = await changeWorkV2(
      uid,
      workId,
      parsed.data.operationId,
      parsed.data.expectedRevision,
      null,
    );
    if (result.result === "not_found")
      return apiError(404, "NOT_FOUND", "Pekerjaan tidak ditemukan.");
    if (!("work" in result))
      return apiError(409, result.result.toUpperCase(), "Pekerjaan berubah atau terkunci.");
    return apiJson(result.work);
  });
}
