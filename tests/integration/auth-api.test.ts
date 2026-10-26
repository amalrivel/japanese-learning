import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { assertDemoEmulators } from "@/../tests/helpers/emulator";

const projectId = "demo-learning-pwa";
const users = [
  { uid: "m2-approved-a", email: "m2-a@example.test", password: "test-pass-12345" },
  { uid: "m2-approved-b", email: "m2-b@example.test", password: "test-pass-12345" },
  { uid: "m2-unapproved", email: "m2-unapproved@example.test", password: "test-pass-12345" },
  { uid: "m2-disabled-approved", email: "m2-disabled@example.test", password: "test-pass-12345" },
];
let adminApp: ReturnType<typeof initializeApp>;
let server: ChildProcess;
let serverOutput = "";
let tokens: string[];
let testDirectory: string;

async function signIn(email: string, password: string) {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) throw new Error(`Emulator sign-in failed with ${response.status}.`);
  return ((await response.json()) as { idToken: string }).idToken;
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server exited early: ${serverOutput}`);
    try {
      const response = await fetch("http://127.0.0.1:3100/api/packs");
      if (response.status === 401) return;
    } catch {
      /* The dev server is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become ready: ${serverOutput}`);
}

function startServer(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  serverOutput = "";
  server = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      cwd: testDirectory,
      env: {
        ...process.env,
        NODE_ENV: "development",
        FIREBASE_PROJECT_ID: projectId,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
        NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:demo",
        APP_ALLOWED_UIDS: "m2-approved-a,m2-approved-b,m2-disabled-approved",
        PORT: "3100",
        NEXT_TELEMETRY_DISABLED: "1",
        ...overrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
}

async function stopServer() {
  if (server && server.exitCode === null) {
    const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
    server.kill("SIGTERM");
    await exited;
  }
}

describe("authenticated API boundary", () => {
  beforeAll(async () => {
    assertDemoEmulators();
    // Keep the test server's generated files and demo config separate from a running workspace.
    testDirectory = await mkdtemp(join(tmpdir(), "learning-pwa-m2-"));
    for (const name of [
      "src",
      "public",
      "next.config.ts",
      "tsconfig.json",
      "package.json",
      "package-lock.json",
    ]) {
      await cp(resolve(name), join(testDirectory, name), { recursive: true });
    }
    await symlink(resolve("node_modules"), join(testDirectory, "node_modules"), "dir");
    adminApp = initializeApp({ projectId }, "m2-integration-seed");
    const auth = getAuth(adminApp);
    for (const user of users) {
      try {
        await auth.deleteUser(user.uid);
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      }
      await auth.createUser({ ...user, displayName: user.uid });
    }

    startServer();
    await waitForServer();
    tokens = await Promise.all(users.map((user) => signIn(user.email, user.password)));
  }, 120_000);

  afterAll(async () => {
    assertDemoEmulators();
    await stopServer();
    if (adminApp) {
      const auth = getAuth(adminApp);
      for (const user of users) {
        try {
          await auth.deleteUser(user.uid);
        } catch (error) {
          if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
        }
      }
      await deleteApp(adminApp);
    }
    if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  }, 30_000);

  it("fails closed for absent, invalid, and unapproved bearer tokens", async () => {
    const url = "http://127.0.0.1:3100/api/packs";
    const anonymous = await fetch(url);
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("cache-control")).toBe("private, no-store");
    expect(anonymous.headers.get("vary")).toContain("Authorization");
    expect(await anonymous.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "A valid bearer token is required." },
    });

    const invalid = await fetch(url, { headers: { Authorization: "Bearer invalid-token" } });
    expect(invalid.status).toBe(401);
    expect(await invalid.text()).not.toContain("invalid-token");

    const forbidden = await fetch(url, { headers: { Authorization: `Bearer ${tokens[2]}` } });
    expect(forbidden.status).toBe(403);
    expect(await forbidden.text()).not.toContain(tokens[2]);
  });

  it("returns an empty bounded list only for each approved UID and guards placeholders", async () => {
    for (const token of tokens.slice(0, 2)) {
      const response = await fetch("http://127.0.0.1:3100/api/packs?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ items: [], nextCursor: null });
    }
    const invalidLimit = await fetch("http://127.0.0.1:3100/api/packs?limit=51", {
      headers: { Authorization: `Bearer ${tokens[0]}` },
    });
    expect(invalidLimit.status).toBe(400);

    const post = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
    const anonymousPlaceholder = await fetch("http://127.0.0.1:3100/api/attempts", { ...post });
    expect(anonymousPlaceholder.status).toBe(401);
    const authorizedPlaceholder = await fetch("http://127.0.0.1:3100/api/attempts", {
      ...post,
      headers: { ...post.headers, Authorization: `Bearer ${tokens[0]}` },
    });
    expect(authorizedPlaceholder.status).toBe(501);
    expect(authorizedPlaceholder.headers.get("cache-control")).toBe("private, no-store");

    const invalidJson = await fetch("http://127.0.0.1:3100/api/attempts", {
      ...post,
      headers: { ...post.headers, Authorization: `Bearer ${tokens[0]}` },
      body: "{",
    });
    expect(invalidJson.status).toBe(400);
    const oversized = await fetch("http://127.0.0.1:3100/api/attempts", {
      ...post,
      headers: { ...post.headers, Authorization: `Bearer ${tokens[0]}` },
      body: JSON.stringify({ data: "x".repeat(5 * 1024) }),
    });
    expect(oversized.status).toBe(413);

    const streamedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ data: "x".repeat(5 * 1024) })),
        );
        controller.close();
      },
    });
    const streamedOversized = await fetch("http://127.0.0.1:3100/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens[0]}` },
      body: streamedBody,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect(streamedOversized.status).toBe(413);
  });

  it("rejects cross-origin mutations without reflecting request content", async () => {
    const response = await fetch("http://127.0.0.1:3100/api/packs/import", {
      method: "POST",
      headers: { Origin: "https://attacker.example", Authorization: `Bearer ${tokens[0]}` },
    });
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(tokens[0]);
  });

  it("guards body-free attempts GET independently of POST validation", async () => {
    const url = "http://127.0.0.1:3100/api/attempts";
    for (const authenticated of [false, true]) {
      const response = await fetch(
        url,
        authenticated ? { headers: { Authorization: `Bearer ${tokens[0]}` } } : {},
      );
      expect(response.status).toBe(authenticated ? 501 : 401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Authorization");
      expect((await response.json()).error.code).toBe(
        authenticated ? "NOT_IMPLEMENTED" : "UNAUTHENTICATED",
      );
    }
    for (const contentType of [undefined, "text/plain"]) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens[0]}`,
          ...(contentType ? { "Content-Type": contentType } : {}),
        },
      });
      expect(response.status).toBe(415);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Authorization");
      expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
  });

  it.each(["aud", "iss"])(
    "rejects an emulator token with a foreign-project %s claim under valid server configuration",
    async (claim) => {
      // Emulator tokens are unsigned; alter only the project claim without accessing another project.
      const parts = tokens[0].split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      expect(payload.aud).toBe(projectId);
      expect(payload.iss).toBe(`https://securetoken.google.com/${projectId}`);
      payload[claim] =
        claim === "aud"
          ? "demo-other-project"
          : "https://securetoken.google.com/demo-other-project";
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const foreignToken = parts.join(".");
      const response = await fetch("http://127.0.0.1:3100/api/packs", {
        headers: { Authorization: `Bearer ${foreignToken}` },
      });
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Authorization");
      expect(await response.json()).toEqual({
        error: { code: "UNAUTHENTICATED", message: "The bearer token is invalid or expired." },
      });
    },
  );

  it("rejects a disabled but allowlisted account when the emulator supports revocation checks", async () => {
    await getAuth(adminApp).updateUser(users[3].uid, { disabled: true });
    const response = await fetch("http://127.0.0.1:3100/api/packs", {
      headers: { Authorization: `Bearer ${tokens[3]}` },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toContain(tokens[3]);
  });

  it("fails safely when the server Firebase project is misconfigured", async () => {
    await stopServer();
    startServer({ FIREBASE_PROJECT_ID: "wrong-project" });
    await waitForServer();
    const response = await fetch("http://127.0.0.1:3100/api/packs", {
      headers: { Authorization: `Bearer ${tokens[0]}` },
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toContain("wrong-project");
  });
});
