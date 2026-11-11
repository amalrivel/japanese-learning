import { withinDepthV2 } from "@/features/content/model/schema-v2";
import { parseLearningDataV2 } from "@/features/analytics/model/teacher-schema-v2";
import { importPackV2 } from "@/features/content/server/packs-v2.server";
import { MAX_IMPORT_BYTES } from "@/features/content/model/schema";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, MAX_IMPORT_BYTES);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = parseLearningDataV2(JSON.stringify(body.value));
    if (parsed.error || parsed.data?.kind !== "learning-pack")
      return apiError(422, parsed.error ?? "VALIDATION_FAILED", "Paket v2 tidak valid.");
    const result = await importPackV2(uid, parsed.data);
    if (result.result === "conflict")
      return apiError(409, "ID_CONFLICT", "ID paket sudah digunakan.");
    return apiJson(result, result.result === "created" ? 201 : 200);
  });
}
