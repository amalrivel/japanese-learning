import { apiError, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, () => apiError(501, "NOT_IMPLEMENTED", "This endpoint is not available yet."));
}

export function POST() { return methodNotAllowed(); }
export function PUT() { return methodNotAllowed(); }
export function PATCH() { return methodNotAllowed(); }
export function DELETE() { return methodNotAllowed(); }
