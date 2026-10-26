import { apiError, methodNotAllowed, readJson, withAuthenticatedUser } from "@/lib/api/server";

export function POST(request: Request) {
  return withAuthenticatedUser(request, async () => {
    const body = await readJson(request, 128 * 1024);
    return body.response ?? apiError(501, "NOT_IMPLEMENTED", "This endpoint is not available yet.");
  });
}

export function GET() {
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
