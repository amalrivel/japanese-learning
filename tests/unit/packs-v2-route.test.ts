import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { importPack } = vi.hoisted(() => ({ importPack: vi.fn() }));
vi.mock("@/features/content/server/packs-v2.server", () => ({ importPackV2: importPack }));
vi.mock("@/lib/api/server", () => ({
  withAuthenticatedUser: (_request: Request, handler: (uid: string) => Promise<Response>) =>
    handler("owner"),
  readJson: async (request: Request, maxBytes: number) => {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes)
      return { response: Response.json({}, { status: 413 }) };
    return { value: JSON.parse(text) };
  },
  apiError: (status: number, code: string) => Response.json({ code }, { status }),
  apiJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
import { POST } from "@/app/api/v2/packs/import/route";

const pack = JSON.parse(readFileSync("examples/learning-pack.v2.json", "utf8"));
function request(value: unknown) {
  return new Request("http://localhost/api/v2/packs/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("v2 pack import boundary", () => {
  beforeEach(() => importPack.mockReset());
  it("imports only a validated v2 pack under the authenticated owner", async () => {
    importPack.mockResolvedValue({ result: "created", packId: pack.id });
    expect((await POST(request(pack)))!.status).toBe(201);
    expect(importPack).toHaveBeenCalledWith("owner", pack);
  });
  it("rejects invalid input without writing", async () => {
    expect((await POST(request({ ...pack, exercises: [] })))!.status).toBe(422);
    expect(importPack).not.toHaveBeenCalled();
  });
  it("reports identical retries and conflicting IDs", async () => {
    importPack
      .mockResolvedValueOnce({ result: "duplicate" })
      .mockResolvedValueOnce({ result: "conflict" });
    expect((await POST(request(pack)))!.status).toBe(200);
    expect((await POST(request(pack)))!.status).toBe(409);
  });
});
