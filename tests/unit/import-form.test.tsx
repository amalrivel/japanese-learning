import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  index: 0,
  states: [] as unknown[],
  refs: [] as { current: number }[],
  cleanup: undefined as (() => void) | undefined,
}));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useState(initial: unknown) {
      const i = h.index++;
      if (!(i in h.states)) h.states[i] = initial;
      return [
        h.states[i],
        (v: unknown) => {
          h.states[i] = v;
        },
      ];
    },
    useRef(initial: number) {
      const i = h.index++;
      return (h.refs[i] ??= { current: initial });
    },
    useEffect(effect: () => void | (() => void)) {
      h.cleanup ??= effect() || undefined;
    },
  };
});
vi.mock("@/lib/auth/client", () => ({
  useAuth: () => ({ user: { uid: "test", getIdToken: async () => "test-token" } }),
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
function find(
  element: ReactElement,
  predicate: (e: ReactElement<{ children?: unknown; [key: string]: unknown }>) => boolean,
): ReactElement<{ children?: unknown; [key: string]: unknown }> | undefined {
  const e = element as ReactElement<{ children?: unknown; [key: string]: unknown }>;
  if (predicate(e)) return e;
  const children = Array.isArray(e.props.children) ? e.props.children : [e.props.children];
  for (const child of children.flat(Infinity))
    if (child && typeof child === "object" && "props" in child) {
      const found = find(child as ReactElement, predicate);
      if (found) return found;
    }
}
const unmount = () => h.cleanup?.();
beforeEach(() => {
  h.index = 0;
  h.states = [];
  h.refs = [];
  h.cleanup = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 404 })),
  );
});
it("preview and cancel never submit an import, including invalid input", async () => {
  const { ImportForm } = await import("@/features/content/import-form");
  const render = () => {
    h.index = 0;
    return ImportForm();
  };
  let tree = render();
  const setText = (value: string) => {
    const input = find(tree, (e) => e.type === "textarea")!;
    (input.props.onChange as (e: unknown) => void)({ target: { value } });
  };
  setText("{");
  tree = render();
  (find(tree, (e) => e.props.children === "Preview")!.props.onClick as () => void)();
  expect(fetch).not.toHaveBeenCalled();
  tree = render();
  setText(readFileSync("examples/learning-pack.v1.json", "utf8"));
  tree = render();
  (find(tree, (e) => e.props.children === "Preview")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  tree = render();
  expect(find(tree, (e) => e.props.children === "Cancel")).toBeDefined();
  (find(tree, (e) => e.props.children === "Cancel")!.props.onClick as () => void)();
  tree = render();
  expect(find(tree, (e) => e.type === "textarea")?.props.value).toBe("");
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init || init.method !== "POST")).toBe(
    true,
  );
});

it("ignores a response after the authenticated workspace unmounts", async () => {
  const { ImportForm } = await import("@/features/content/import-form");
  let resolveResponse!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    ),
  );
  const render = () => {
    h.index = 0;
    return ImportForm();
  };
  let tree = render();
  (find(tree, (e) => e.type === "textarea")!.props.onChange as (e: unknown) => void)({
    target: { value: readFileSync("examples/learning-pack.v1.json", "utf8") },
  });
  tree = render();
  (find(tree, (e) => e.props.children === "Preview")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  h.cleanup?.();
  h.states = [];
  h.refs = [];
  h.cleanup = undefined;
  tree = render();
  resolveResponse(Response.json({ contentHash: "different" }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  tree = render();
  expect(find(tree, (e) => e.type === "textarea")?.props.value).toBe("");
  expect(
    find(
      tree,
      (e) => typeof e.props.children === "string" && e.props.children.includes("different content"),
    ),
  ).toBeUndefined();
});
it("file and paste use the same preview and reject invalid UTF-8", async () => {
  const { ImportForm } = await import("@/features/content/import-form");
  const render = () => {
    h.index = 0;
    return ImportForm();
  };
  const raw = readFileSync("examples/learning-pack.v1.json", "utf8");
  let tree = render();
  const fileInput = find(tree, (e) => e.props.id === "pack-file")!;
  await (fileInput.props.onChange as (e: unknown) => Promise<void>)({
    target: {
      files: [
        {
          size: Buffer.byteLength(raw),
          arrayBuffer: async () => new TextEncoder().encode(raw).buffer,
        },
      ],
      value: "chosen",
    },
  });
  const filePack = structuredClone(h.states[1]);
  h.states = [];
  h.refs = [];
  h.cleanup = undefined;
  tree = render();
  (find(tree, (e) => e.type === "textarea")!.props.onChange as (e: unknown) => void)({
    target: { value: raw },
  });
  tree = render();
  (find(tree, (e) => e.props.children === "Preview")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(h.states[1]).toEqual(filePack));
  unmount();
  h.states = [];
  h.refs = [];
  h.cleanup = undefined;
  tree = render();
  await (
    find(tree, (e) => e.props.id === "pack-file")!.props.onChange as (e: unknown) => Promise<void>
  )({
    target: {
      files: [{ size: 1, arrayBuffer: async () => new Uint8Array([255]).buffer }],
      value: "chosen",
    },
  });
  expect(h.states[1]).toBeNull();
  expect(h.states[2]).toContain("valid UTF-8");
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init || init.method !== "POST")).toBe(
    true,
  );
});
it("confirms a file preview with the original JSON and clears it after success", async () => {
  const { ImportForm } = await import("@/features/content/import-form");
  const raw = readFileSync("examples/learning-pack.v1.json", "utf8");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "POST"
        ? Response.json({ duplicate: false }, { status: 201 })
        : new Response(null, { status: 404 }),
    ),
  );
  const render = () => {
    h.index = 0;
    return ImportForm();
  };
  let tree = render();
  await (
    find(tree, (e) => e.props.id === "pack-file")!.props.onChange as (e: unknown) => Promise<void>
  )({
    target: {
      files: [
        {
          size: Buffer.byteLength(raw),
          arrayBuffer: async () => new TextEncoder().encode(raw).buffer,
        },
      ],
      value: "chosen",
    },
  });
  tree = render();
  (find(tree, (e) => e.props.children === "Confirm import")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls).toHaveLength(2));
  expect(vi.mocked(fetch).mock.calls[1][1]?.body).toBe(raw);
  await vi.waitFor(() => expect(h.states[1]).toBeNull());
  tree = render();
  expect(find(tree, (e) => e.type === "textarea")?.props.value).toBe("");
  expect(h.states[2]).toBe("Pack imported successfully.");
});
