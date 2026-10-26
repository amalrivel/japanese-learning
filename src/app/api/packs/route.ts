import { apiError, apiJson, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";
import { listPacks, parseCursor } from "@/features/content/packs.server";
export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const params = new URL(request.url).searchParams;
    const rawLimit = params.get("limit");
    if (
      rawLimit !== null &&
      (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50)
    )
      return apiError(422, "VALIDATION_FAILED", "limit must be an integer from 1 to 50.");
    const rawCursor = params.get("cursor");
    const cursor = rawCursor === null ? null : parseCursor(rawCursor);
    if (rawCursor !== null && !cursor) return apiError(422, "VALIDATION_FAILED", "Invalid cursor.");
    return apiJson(await listPacks(uid, rawLimit === null ? 20 : Number(rawLimit), cursor));
  });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
