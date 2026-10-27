import {
  apiError,
  apiJson,
  apiValidationError,
  methodNotAllowed,
  readJson,
  withAuthenticatedUser,
} from "@/lib/api/server";
import { attemptIdSchema, draftSchema } from "@/features/practice/answers";
import { getAttempt, saveAttempt } from "@/features/practice/attempts.server";

type Context = { params: Promise<{ attemptId: string }> };
export function GET(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { attemptId } = await context.params;
    if (!attemptIdSchema.safeParse(attemptId).success)
      return apiError(422, "VALIDATION_FAILED", "Invalid attempt ID.");
    const attempt = await getAttempt(uid, attemptId);
    return attempt ? apiJson(attempt) : apiError(404, "NOT_FOUND", "Attempt not found.");
  });
}
export function PATCH(request: Request, context: Context) {
  return withAuthenticatedUser(request, async (uid) => {
    const { attemptId } = await context.params;
    if (!attemptIdSchema.safeParse(attemptId).success)
      return apiError(422, "VALIDATION_FAILED", "Invalid attempt ID.");
    const body = await readJson(request, 384 * 1024);
    if (body.response) return body.response;
    const parsed = draftSchema.safeParse(body.value);
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { result, updated } = await saveAttempt(
      uid,
      attemptId,
      parsed.data.revision,
      parsed.data.answers,
    );
    if (result === "not_found") return apiError(404, "NOT_FOUND", "Attempt not found.");
    if (result === "stale") return apiError(409, "STALE_REVISION", "The draft has changed.");
    if (result === "invalid_state")
      return apiError(409, "INVALID_STATE", "The attempt is not a draft.");
    if (result === "invalid") return apiValidationError([{ path: ["answers"] }]);
    return apiJson(updated);
  });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
