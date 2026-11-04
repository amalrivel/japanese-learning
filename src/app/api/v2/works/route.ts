import { withinDepthV2 } from "@/features/content/schema-v2";
import { attemptIdSchema } from "@/features/practice/answers";
import { startWorkV2Schema } from "@/features/practice/work-v2-request";
import { listWorksV2, startWorkV2 } from "@/features/practice/work-v2.server";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const params = new URL(request.url).searchParams;
    const limit = params.get("limit") ?? "20";
    const cursor = params.get("cursor");
    if (
      !/^\d+$/.test(limit) ||
      Number(limit) < 1 ||
      Number(limit) > 50 ||
      (cursor !== null && !attemptIdSchema.safeParse(cursor).success)
    )
      return apiError(422, "VALIDATION_FAILED", "Parameter daftar tidak valid.");
    return apiJson(await listWorksV2(uid, Number(limit), cursor));
  });
}
export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, 4096);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = startWorkV2Schema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Pekerjaan tidak valid.");
    const result = await startWorkV2(uid, parsed.data.workId, parsed.data.packId);
    if (result.result === "not_found") return apiError(404, "NOT_FOUND", "Paket tidak ditemukan.");
    if (result.result === "conflict")
      return apiError(409, "ID_CONFLICT", "ID pekerjaan sudah digunakan.");
    return apiJson(result.work, result.result === "created" ? 201 : 200);
  });
}
