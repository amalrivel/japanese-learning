import { progressV2 } from "@/features/analytics/server/progress-v2.server";
import { apiJson, withAuthenticatedUser } from "@/lib/api/server";
export function GET(request: Request) {
  return withAuthenticatedUser(request, async (uid) => apiJson(await progressV2(uid)));
}
