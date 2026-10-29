import { apiJson, methodNotAllowed, withAuthenticatedUser } from "@/lib/api/server";
import { teacherContext } from "@/features/analytics/teacher.server";

export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => apiJson(await teacherContext(uid)));
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
