import {
  apiError,
  apiJson,
  methodNotAllowed,
  readJson,
  withAuthenticatedUser,
} from "@/lib/api/server";
import { MAX_IMPORT_BYTES, validatePack } from "@/features/content/schema";
import { importPack } from "@/features/content/packs.server";

export function POST(request: Request) {
  return withAuthenticatedUser(request, async (uid) => {
    const body = await readJson(request, MAX_IMPORT_BYTES);
    if (body.response) return body.response;
    const result = validatePack(body.value);
    if (result.error === "UNSUPPORTED_VERSION")
      return apiError(422, result.error, "Supported schema versions: [1].");
    if (result.error)
      return apiJson(
        {
          error: {
            code: result.error,
            message: `Validation failed with ${result.issues.length} issue(s).`,
            issues: result.issues.slice(0, 20),
          },
        },
        422,
      );
    const imported = await importPack(uid, result.pack);
    if (imported.result === "conflict")
      return apiError(
        409,
        "ID_CONFLICT",
        "This pack ID already contains different content. Use a new pack ID.",
      );
    return apiJson(
      {
        packId: imported.packId,
        contentHash: imported.contentHash,
        duplicate: imported.result === "duplicate",
      },
      imported.result === "duplicate" ? 200 : 201,
    );
  });
}
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
