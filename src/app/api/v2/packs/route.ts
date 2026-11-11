import { listPacksV2 } from "@/features/content/server/packs-v2.server";
import { idSchema } from "@/features/content/model/schema";
import { apiError, apiJson, withAuthenticatedUser } from "@/lib/api/server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const params = new URL(request.url).searchParams;
    const rawLimit = params.get("limit") ?? "20";
    const cursor = params.get("cursor");
    if (
      !/^\d+$/.test(rawLimit) ||
      Number(rawLimit) < 1 ||
      Number(rawLimit) > 50 ||
      (cursor !== null && !idSchema.safeParse(cursor).success)
    )
      return apiError(422, "VALIDATION_FAILED", "Parameter daftar tidak valid.");
    return apiJson(await listPacksV2(uid, Number(rawLimit), cursor));
  });
}
