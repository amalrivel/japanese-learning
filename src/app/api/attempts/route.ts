import { apiError, methodNotAllowed, readJson, withAuthenticatedUser } from "@/lib/api/server";

const unavailable = (request: Request) => withAuthenticatedUser(request, async () => {
  const body = await readJson(request, 4 * 1024);
  return body.response ?? apiError(501, "NOT_IMPLEMENTED", "This endpoint is not available yet.");
});

export function GET(request: Request) { return unavailable(request); }
export function POST(request: Request) { return unavailable(request); }
export function PUT() { return methodNotAllowed(); }
export function PATCH() { return methodNotAllowed(); }
export function DELETE() { return methodNotAllowed(); }
