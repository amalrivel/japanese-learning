import { withinDepthV2 } from "@/features/content/schema-v2";
import { z } from "zod";
import { createSnapshotV2, listSnapshotsV2 } from "@/features/analytics/teacher-v2.server";
import { revisionV2Schema } from "@/features/content/schema-v2";
import { attemptIdSchema } from "@/features/practice/answers";
import { apiError, apiJson, readJson, withAuthenticatedUser } from "@/lib/api/server";

const schema = z.strictObject({
  snapshotId: attemptIdSchema,
  workId: attemptIdSchema,
  expectedRevision: revisionV2Schema,
});
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
    return apiJson(await listSnapshotsV2(uid, Number(limit), cursor));
  });
}
export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, 4096);
    if (body.response) return body.response;
    if (!withinDepthV2(body.value))
      return apiError(422, "VALIDATION_FAILED", "JSON terlalu dalam.");
    const parsed = schema.safeParse(body.value);
    if (!parsed.success)
      return apiError(422, "VALIDATION_FAILED", "Permintaan snapshot tidak valid.");
    const result = await createSnapshotV2(
      uid,
      parsed.data.snapshotId,
      parsed.data.workId,
      parsed.data.expectedRevision,
    );
    if (result.result === "not_found")
      return apiError(404, "NOT_FOUND", "Pekerjaan tidak ditemukan.");
    if (result.result === "too_large")
      return apiError(413, "PAYLOAD_TOO_LARGE", "Snapshot terlalu besar untuk konteks.");
    if (result.result === "revision_exists")
      return apiJson(
        {
          error: {
            code: "REVISION_EXISTS",
            message: "Revisi sudah memiliki snapshot.",
            snapshotId: result.snapshotId,
          },
        },
        409,
      );
    if (!("snapshot" in result))
      return apiError(409, result.result.toUpperCase(), "Revisi atau ID snapshot tidak sesuai.");
    return apiJson(result.snapshot, result.result === "created" ? 201 : 200);
  });
}
