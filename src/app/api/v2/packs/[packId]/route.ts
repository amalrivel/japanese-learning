import { getPackV2 } from "@/features/content/server/packs-v2.server";
import { idSchema } from "@/features/content/model/schema";
import { apiError, apiJson, withAuthenticatedUser } from "@/lib/api/server";

type Context = { params: Promise<{ packId: string }> };
export function GET(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { packId } = await context.params;
    if (!idSchema.safeParse(packId).success)
      return apiError(422, "VALIDATION_FAILED", "ID paket tidak valid.");
    const pack = await getPackV2(uid, packId);
    return pack ? apiJson(pack) : apiError(404, "NOT_FOUND", "Paket tidak ditemukan.");
  });
}
