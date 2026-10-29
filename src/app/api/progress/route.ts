import { completedWindow } from "@/features/analytics/progress.server";
import { apiJson, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";
export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) =>
    apiJson((await completedWindow(uid)).progress),
  );
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
