import { apiError, apiJson, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";
import { idSchema } from "@/features/content/schema";
import { getPack } from "@/features/content/packs.server";
export function GET(request: Request, context: { params: Promise<{ packId: string }> }) {
  return withAuthenticatedUser(request, async (uid) => {
    const { packId } = await context.params;
    if (!idSchema.safeParse(packId).success)
      return apiError(422, "VALIDATION_FAILED", "Invalid pack ID.");
    const pack = await getPack(uid, packId);
    return pack ? apiJson(pack) : apiError(404, "NOT_FOUND", "Pack not found.");
  });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
