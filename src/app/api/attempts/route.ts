import {
  apiError,
  apiJson,
  apiValidationError,
  methodNotAllowed,
  readJson,
  withAuthenticatedUser,
} from "@/lib/api/server";
import { idSchema } from "@/features/content/schema";
import { startSchema } from "@/features/practice/answers";
import {
  listAttempts,
  parseAttemptCursor,
  startAttempt,
} from "@/features/practice/attempts.server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const params = new URL(request.url).searchParams;
    const rawLimit = params.get("limit");
    const packId = params.get("packId");
    if (
      (rawLimit !== null &&
        (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50)) ||
      (packId !== null && !idSchema.safeParse(packId).success)
    )
      return apiError(422, "VALIDATION_FAILED", "Invalid list parameters.");
    const rawCursor = params.get("cursor");
    const cursor = rawCursor === null ? null : parseAttemptCursor(rawCursor, packId);
    if (rawCursor !== null && !cursor) return apiError(422, "VALIDATION_FAILED", "Invalid cursor.");
    return apiJson(
      await listAttempts(uid, rawLimit === null ? 20 : Number(rawLimit), packId, cursor),
    );
  });
}
export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, 4 * 1024);
    if (body.response) return body.response;
    const parsed = startSchema.safeParse(body.value);
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { result, attempt } = await startAttempt(uid, parsed.data.attemptId, parsed.data.packId);
    if (result === "not_found") return apiError(404, "NOT_FOUND", "Pack not found.");
    if (result === "conflict")
      return apiError(409, "ID_CONFLICT", "Attempt ID belongs to another pack.");
    return apiJson(attempt, result === "created" ? 201 : 200);
  });
}
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
