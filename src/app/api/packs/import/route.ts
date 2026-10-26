export function POST() {
  return Response.json({ error: { code: "NOT_IMPLEMENTED", message: "This endpoint is not available yet." } }, { status: 501, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
}
