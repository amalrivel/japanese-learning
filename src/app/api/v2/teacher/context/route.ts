import { contextV2 } from "@/features/analytics/server/teacher-v2.server";
import { attemptIdSchema } from "@/features/practice/model/answers";
import { apiError, apiJson, withAuthenticatedUser } from "@/lib/api/server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const ids = new URL(request.url).searchParams.getAll("snapshotId");
    if (
      ids.length < 1 ||
      ids.length > 10 ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !attemptIdSchema.safeParse(id).success)
    )
      return apiError(422, "VALIDATION_FAILED", "Pilih 1–10 snapshot berbeda.");
    const result = await contextV2(uid, ids);
    if (result.error === "not_found")
      return apiError(404, "NOT_FOUND", "Snapshot tidak ditemukan.");
    if (result.error === "limit")
      return apiError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Konteks melebihi batas; pilih lebih sedikit snapshot.",
      );
    if (!result.context) return apiError(422, "VALIDATION_FAILED", "Konteks tidak valid.");
    return apiJson(result.context);
  });
}
