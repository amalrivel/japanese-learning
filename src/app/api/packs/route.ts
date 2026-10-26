import { apiError, apiJson, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, () => {
    const limit = new URL(request.url).searchParams.get("limit");
    if (limit !== null && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 50)) {
      return apiError(400, "VALIDATION_FAILED", "limit must be an integer from 1 to 50.");
    }
    return apiJson({ items: [], nextCursor: null });
  });
}

export function POST() {
  return methodNotAllowed();
}
export function PUT() {
  return methodNotAllowed();
}
export function PATCH() {
  return methodNotAllowed();
}
export function DELETE() {
  return methodNotAllowed();
}
