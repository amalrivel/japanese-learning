import { assessmentSchema, attemptIdSchema } from "@/features/practice/answers";
import { assessAttempt } from "@/features/practice/attempts.server";
import {
  apiError,
  apiJson,
  apiValidationError,
  methodNotAllowed,
  readJson,
  withAuthenticatedUser,
} from "@/lib/api/server";

export function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return withAuthenticatedUser(request, async (uid) => {
    const { attemptId } = await context.params;
    if (!attemptIdSchema.safeParse(attemptId).success)
      return apiError(422, "VALIDATION_FAILED", "Invalid attempt ID.");
    const body = await readJson(request, 8 * 1024);
    if (body.response) return body.response;
    const parsed = assessmentSchema.safeParse(body.value);
    if (!parsed.success) return apiValidationError(parsed.error.issues);
    const { result, attempt } = await assessAttempt(uid, attemptId, parsed.data.ratings);
    if (result === "not_found") return apiError(404, "NOT_FOUND", "Attempt not found.");
    if (result === "conflict")
      return apiError(409, "ID_CONFLICT", "Different ratings were already submitted.");
    if (result === "invalid_state")
      return apiError(409, "INVALID_STATE", "This attempt cannot be assessed.");
    if (result === "invalid") return apiValidationError([{ path: ["ratings"] }]);
    return apiJson(attempt);
  });
}
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
