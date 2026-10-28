import { readFileSync } from "node:fs";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
    const forbiddenAttempts = await fetch("http://127.0.0.1:3100/api/attempts", {
      headers: { Authorization: `Bearer ${tokens[2]}` },
    });
    expect(forbiddenAttempts.status).toBe(403);
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
    expect(invalidLimit.status).toBe(422);

    const post = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
    const anonymousPlaceholder = await fetch("http://127.0.0.1:3100/api/attempts", { ...post });
    expect(anonymousPlaceholder.status).toBe(401);
    const authorizedPlaceholder = await fetch("http://127.0.0.1:3100/api/attempts", {
      ...post,
      headers: { ...post.headers, Authorization: `Bearer ${tokens[0]}` },
    });
    expect(authorizedPlaceholder.status).toBe(422);
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
      expect(response.status).toBe(authenticated ? 200 : 401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vary")).toContain("Authorization");
      const data = await response.json();
      if (authenticated) expect(data).toEqual({ items: [], nextCursor: null });
      else expect(data.error.code).toBe("UNAUTHENTICATED");
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

  it("imports atomically, isolates users, preserves retries and redacts keys", async () => {
    assertDemoEmulators();
    const fixture = JSON.parse(readFileSync("examples/learning-pack.v1.json", "utf8"));
    const url = "http://127.0.0.1:3100/api/packs";
    const headers = (index: number) => ({
      Authorization: `Bearer ${tokens[index]}`,
      "Content-Type": "application/json",
    });
    const post = (index: number, body: string) =>
      fetch(`${url}/import`, { method: "POST", headers: headers(index), body });
    const raw = JSON.stringify(fixture);
    const browserOrigin = await fetch(`${url}/import`, {
      method: "POST",
      headers: { ...headers(0), Origin: "http://127.0.0.1:3100" },
      body: "{",
    });
    expect(browserOrigin.status).toBe(400); // Same-origin request reaches JSON validation.
    const crossOrigin = await fetch(`${url}/import`, {
      method: "POST",
      headers: { ...headers(0), Origin: "http://attacker.test" },
      body: raw,
    });
    expect(crossOrigin.status).toBe(403);
    const [a, b] = await Promise.all([post(0, raw), post(0, raw)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    const db = getFirestore(adminApp);
    const root = db.collection("users").doc(users[0].uid);
    const packRef = root.collection("packs").doc(fixture.id);
    const keyRef = root.collection("packKeys").doc(fixture.id);
    const first = await packRef.get();
    const key = await keyRef.get();
    expect(first.exists && key.exists).toBe(true);
    expect(first.get("contentHash")).toBe(key.get("contentHash"));
    const padded = raw + " ".repeat(128 * 1024 - Buffer.byteLength(raw));
    expect((await post(0, padded)).status).toBe(200);
    expect((await post(0, padded + " ")).status).toBe(413);
    const reversed = Object.fromEntries(Object.entries(fixture).reverse());
    expect((await post(0, JSON.stringify(reversed))).status).toBe(200);
    const retry = await post(0, JSON.stringify(fixture, null, 2));
    expect(retry.status).toBe(200);
    expect((await retry.json()).duplicate).toBe(true);
    expect((await packRef.get()).get("importedAt").isEqual(first.get("importedAt"))).toBe(true);
    const changed = structuredClone(fixture);
    changed.title = "Different";
    expect((await post(0, JSON.stringify(changed))).status).toBe(409);
    expect((await post(1, JSON.stringify(changed))).status).toBe(201);
    const detail = await fetch(`${url}/${fixture.id}`, { headers: headers(0) });
    expect(detail.status).toBe(200);
    const text = await detail.text();
    expect(text).not.toMatch(
      /"(?:answer|explanation|acceptedAnswers|modelAnswer|rubric|choiceId)":/,
    );
    expect(
      (await (await fetch(`${url}/${fixture.id}`, { headers: headers(1) })).json()).title,
    ).toBe("Different");
    const onlyA = structuredClone(fixture);
    onlyA.id = "only-a";
    expect((await post(0, JSON.stringify(onlyA))).status).toBe(201);
    expect((await fetch(`${url}/only-a`, { headers: headers(1) })).status).toBe(404);
    const attempts = "http://127.0.0.1:3100/api/attempts";
    const attemptId = "11111111-1111-4111-8111-111111111111";
    const start = (index: number, packId = fixture.id) =>
      fetch(attempts, {
        method: "POST",
        headers: headers(index),
        body: JSON.stringify({ attemptId, packId }),
      });
    expect((await start(0)).status).toBe(201);
    expect((await start(0)).status).toBe(200);
    expect((await start(0, "only-a")).status).toBe(409);
    expect((await fetch(`${attempts}/${attemptId}`, { headers: headers(1) })).status).toBe(404);
    expect(
      (
        await fetch(`${attempts}/${attemptId}`, {
          method: "PATCH",
          headers: headers(1),
          body: JSON.stringify({ revision: 0, answers: {} }),
        })
      ).status,
    ).toBe(404);
    const save = (text: string) =>
      fetch(`${attempts}/${attemptId}`, {
        method: "PATCH",
        headers: headers(0),
        body: JSON.stringify({ revision: 0, answers: { "habit-short": { text } } }),
      });
    const saves = await Promise.all([save("first"), save("second")]);
    expect(saves.map((response) => response.status).sort()).toEqual([200, 409]);
    const current = await (await fetch(`${attempts}/${attemptId}`, { headers: headers(0) })).json();
    expect(current.revision).toBe(1);
    expect(["first", "second"]).toContain(current.answers["habit-short"].text);
    const retriedStart = await (await start(0)).json();
    expect(retriedStart.answers).toEqual(current.answers);
    expect(retriedStart.revision).toBe(current.revision);
    expect(retriedStart.createdAt).toBe(current.createdAt);
    expect(retriedStart.updatedAt).toBe(current.updatedAt);
    expect((await start(1)).status).toBe(201);
    const bSave = await fetch(`${attempts}/${attemptId}`, {
      method: "PATCH",
      headers: headers(1),
      body: JSON.stringify({ revision: 0, answers: { "habit-short": { text: "user B" } } }),
    });
    expect(bSave.status).toBe(200);
    const bAttempt = await (
      await fetch(`${attempts}/${attemptId}`, { headers: headers(1) })
    ).json();
    expect(bAttempt.answers["habit-short"].text).toBe("user B");
    expect(bAttempt.packTitle).toBe("Different");
    expect(
      (await (await fetch(`${attempts}/${attemptId}`, { headers: headers(0) })).json()).answers,
    ).toEqual(current.answers);
    expect((await save("stale")).status).toBe(409);
    expect(
      (await (await fetch(`${attempts}/${attemptId}`, { headers: headers(0) })).json()).answers,
    ).toEqual(current.answers);
    await root
      .collection("attempts")
      .doc(attemptId)
      .update({ explanation: "private sentinel", grade: "private sentinel" });
    const projected = await (
      await fetch(`${attempts}/${attemptId}`, { headers: headers(0) })
    ).text();
    expect(projected).not.toContain("private sentinel");
    const invalidSave = await fetch(`${attempts}/${attemptId}`, {
      method: "PATCH",
      headers: headers(0),
      body: JSON.stringify({ revision: 1, answers: { "noni-choice": { choiceId: "unknown" } } }),
    });
    expect(invalidSave.status).toBe(422);
    const badFields = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`bad-${i}`, { text: 123 }]),
    );
    const invalidFields = await fetch(`${attempts}/${attemptId}`, {
      method: "PATCH",
      headers: headers(0),
      body: JSON.stringify({ revision: 1, answers: badFields }),
    });
    const invalidBody = await invalidFields.json();
    expect(invalidFields.status).toBe(422);
    expect(invalidBody.error.message).toContain("25 issue(s)");
    expect(invalidBody.error.issues).toHaveLength(20);
    for (const field of ["uid", "grade", "result", "updatedAt"]) {
      expect(
        (
          await fetch(`${attempts}/${attemptId}`, {
            method: "PATCH",
            headers: headers(0),
            body: JSON.stringify({ revision: 1, answers: {}, [field]: "forged" }),
          })
        ).status,
      ).toBe(422);
    }
    for (const endpoint of ["submit", "assessments"]) {
      expect(
        (
          await fetch(`${attempts}/${attemptId}/${endpoint}`, {
            method: "POST",
            headers: headers(0),
            body: "{}",
          })
        ).status,
      ).toBe(422);
    }
    expect(
      (
        await fetch(`${attempts}/${attemptId}`, {
          method: "PATCH",
          headers: { ...headers(0), Origin: "http://attacker.test" },
          body: JSON.stringify({ revision: 1, answers: {} }),
        })
      ).status,
    ).toBe(403);
    await root.collection("attempts").doc(attemptId).update({ status: "completed" });
    const nonDraft = await fetch(`${attempts}/${attemptId}`, {
      method: "PATCH",
      headers: headers(0),
      body: JSON.stringify({ revision: 1, answers: {} }),
    });
    expect(nonDraft.status).toBe(409);
    expect((await root.collection("attempts").doc(attemptId).get()).get("answers")).toEqual(
      current.answers,
    );
    expect(JSON.stringify([current, retriedStart, bAttempt])).not.toMatch(
      /explanation|acceptedAnswers|modelAnswer|rubric|feedback/,
    );
    const history = await (
      await fetch(`${attempts}?packId=${fixture.id}`, { headers: headers(0) })
    ).json();
    expect(history.items.map((item: { id: string }) => item.id)).toContain(attemptId);
    expect(JSON.stringify(history)).not.toMatch(/explanation|acceptedAnswers|modelAnswer|rubric/);
    const ids = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
    for (const id of ids) {
      expect(
        (
          await fetch(attempts, {
            method: "POST",
            headers: headers(0),
            body: JSON.stringify({ attemptId: id, packId: fixture.id }),
          })
        ).status,
      ).toBe(201);
      await root
        .collection("attempts")
        .doc(id)
        .update({ createdAt: new Timestamp(253402300000, 123456000) });
    }
    const firstHistory = await (
      await fetch(`${attempts}?packId=${fixture.id}&limit=1`, { headers: headers(0) })
    ).json();
    expect(firstHistory.items[0].id).toBe(ids[1]);
    expect(
      JSON.parse(Buffer.from(firstHistory.nextCursor, "base64url").toString()).nanoseconds,
    ).toBe(123456000);
    const secondHistory = await (
      await fetch(`${attempts}?packId=${fixture.id}&limit=1&cursor=${firstHistory.nextCursor}`, {
        headers: headers(0),
      })
    ).json();
    expect(secondHistory.items[0].id).toBe(ids[0]);
    expect(
      (
        await fetch(`${attempts}?packId=only-a&cursor=${firstHistory.nextCursor}`, {
          headers: headers(0),
        })
      ).status,
    ).toBe(422);
    expect((await fetch(`${attempts}?cursor=invalid`, { headers: headers(0) })).status).toBe(422);
    expect((await fetch(`${attempts}?limit=51`, { headers: headers(0) })).status).toBe(422);
    const snapshotId = "55555555-5555-4555-8555-555555555555";
    expect(
      (
        await fetch(attempts, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ attemptId: snapshotId, packId: fixture.id }),
        })
      ).status,
    ).toBe(201);
    const writeSnapshot = (revision: number, answers: object) =>
      fetch(`${attempts}/${snapshotId}`, {
        method: "PATCH",
        headers: headers(0),
        body: JSON.stringify({ revision, answers }),
      });
    expect(
      (
        await writeSnapshot(0, {
          "noni-choice": { choiceId: "noni" },
          "prepare-blank": { text: "x" },
        })
      ).status,
    ).toBe(200);
    expect((await writeSnapshot(1, { "reading-short": { text: "new snapshot" } })).status).toBe(
      200,
    );
    const recoveredSnapshot = await (
      await fetch(`${attempts}/${snapshotId}`, { headers: headers(0) })
    ).json();
    expect(recoveredSnapshot.revision).toBe(2);
    expect(recoveredSnapshot.answers).toEqual({ "reading-short": { text: "new snapshot" } });
    expect((await writeSnapshot(1, {})).status).toBe(409);
    expect(
      (await (await fetch(`${attempts}/${snapshotId}`, { headers: headers(0) })).json()).answers,
    ).toEqual(recoveredSnapshot.answers);
    const page1 = await (await fetch(`${url}?limit=1`, { headers: headers(0) })).json();
    expect(page1.items).toHaveLength(1);
    expect(page1.nextCursor).toBeTruthy();
    const page2 = await (
      await fetch(`${url}?limit=1&cursor=${page1.nextCursor}`, { headers: headers(0) })
    ).json();
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
    expect(JSON.stringify([page1, page2])).not.toMatch(/"(?:answer|explanation|rubric|choiceId)":/);
    expect((await fetch(`${url}?cursor=invalid`, { headers: headers(0) })).status).toBe(422);
    const wrongFilter = Buffer.from(
      JSON.stringify({ seconds: 0, nanoseconds: 0, id: "valid", packId: "other" }),
    ).toString("base64url");
    expect((await fetch(`${url}?cursor=${wrongFilter}`, { headers: headers(0) })).status).toBe(422);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(" ".repeat(128 * 1024 + 1)));
        controller.close();
      },
    });
    expect(
      (
        await fetch(`${url}/import`, {
          method: "POST",
          headers: headers(0),
          body: stream,
          duplex: "half",
        } as RequestInit & { duplex: "half" })
      ).status,
    ).toBe(413);
    expect((await post(0, "{")).status).toBe(400);
    expect(
      (
        await fetch(`${url}/import`, {
          method: "POST",
          headers: headers(0),
          body: new Uint8Array([0xff]),
        })
      ).status,
    ).toBe(400);
    // A near-limit valid body exercises the actual emulator writes and document budgets.
    const large = {
      ...fixture,
      id: "large-pack",
      skills: Array.from({ length: 20 }, (_, i) => ({ id: `skill.${i}`, label: `Skill ${i}` })),
      exercises: Array.from({ length: 40 }, (_, i) => ({
        id: `exercise-${i}`,
        type: "self_review",
        skillIds: [`skill.${i % 20}`],
        prompt: "p".repeat(1800),
        answer: {
          modelAnswer: "m".repeat(600),
          rubric: ["r".repeat(100)],
          explanation: "e".repeat(500),
        },
      })),
    };
    const largeBody = JSON.stringify(large);
    expect(Buffer.byteLength(largeBody)).toBeGreaterThan(120 * 1024);
    expect(Buffer.byteLength(largeBody)).toBeLessThanOrEqual(128 * 1024);
    expect((await post(0, largeBody)).status).toBe(201);
    const largePack = await root.collection("packs").doc(large.id).get();
    const largeKeys = await root.collection("packKeys").doc(large.id).get();
    expect(Buffer.byteLength(JSON.stringify(largePack.data()))).toBeLessThanOrEqual(512 * 1024);
    expect(Buffer.byteLength(JSON.stringify(largeKeys.data()))).toBeLessThanOrEqual(512 * 1024);
    const largeAttemptId = "44444444-4444-4444-8444-444444444444";
    expect(
      (
        await fetch(attempts, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ attemptId: largeAttemptId, packId: large.id }),
        })
      ).status,
    ).toBe(201);
    const largeAnswers = Object.fromEntries(
      large.exercises.map((exercise: { id: string }) => [exercise.id, { text: "界".repeat(2000) }]),
    );
    const largeSave = await fetch(`${attempts}/${largeAttemptId}`, {
      method: "PATCH",
      headers: headers(0),
      body: JSON.stringify({ revision: 0, answers: largeAnswers }),
    });
    expect(largeSave.status).toBe(200);
    const storedLargeAttempt = await root.collection("attempts").doc(largeAttemptId).get();
    expect(Buffer.byteLength(JSON.stringify(storedLargeAttempt.data()))).toBeLessThanOrEqual(
      512 * 1024,
    );
    const overLimit = await fetch(`${attempts}/${largeAttemptId}`, {
      method: "PATCH",
      headers: headers(0),
      body: " ".repeat(384 * 1024 + 1),
    });
    expect(overLimit.status).toBe(413);
    const oversizedDraftStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(384 * 1024));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    expect(
      (
        await fetch(`${attempts}/${largeAttemptId}`, {
          method: "PATCH",
          headers: headers(0),
          body: oversizedDraftStream,
          duplex: "half",
        } as RequestInit & { duplex: "half" })
      ).status,
    ).toBe(413);
    expect(
      (
        await fetch(`${attempts}/${largeAttemptId}/submit`, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ revision: 1, answers: largeAnswers }),
        })
      ).status,
    ).toBe(200);
    const largeRatings = Object.fromEntries(
      large.exercises.map((exercise: { id: string }) => [exercise.id, "met"]),
    );
    expect(
      (
        await fetch(`${attempts}/${largeAttemptId}/assessments`, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ ratings: largeRatings }),
        })
      ).status,
    ).toBe(200);
    const completedLargeAttempt = await root.collection("attempts").doc(largeAttemptId).get();
    expect(Buffer.byteLength(JSON.stringify(completedLargeAttempt.data()))).toBeLessThanOrEqual(
      512 * 1024,
    );
    // Force identical timestamps and sub-millisecond differences to verify both ordering components.
    const seed = first.data()!;
    for (const [id, nanos] of [
      ["order-a", 123456000],
      ["order-b", 123456000],
      ["order-c", 123455000],
    ] as const) {
      await root
        .collection("packs")
        .doc(id)
        .create({ ...seed, id, importedAt: new Timestamp(253402300000, nanos) });
    }
    let cursor = "";
    const ordered: string[] = [];
    for (let i = 0; i < 3; i++) {
      const page = await (
        await fetch(`${url}?limit=1${cursor ? `&cursor=${cursor}` : ""}`, { headers: headers(0) })
      ).json();
      ordered.push(page.items[0].id);
      cursor = page.nextCursor;
      if (i === 0)
        expect(JSON.parse(Buffer.from(cursor, "base64url").toString()).nanoseconds).toBe(123456000);
    }
    expect(ordered).toEqual(["order-b", "order-a", "order-c"]);
    const rollbackPack = root.collection("packs").doc("rollback");
    const rollbackKey = root.collection("packKeys").doc("rollback");
    await expect(
      db.runTransaction(async (tx) => {
        tx.create(rollbackPack, { id: "rollback" });
        tx.create(rollbackKey, { packId: "rollback" });
        throw new Error("simulated transaction failure");
      }),
    ).rejects.toThrow("simulated transaction failure");
    expect((await rollbackPack.get()).exists).toBe(false);
    expect((await rollbackKey.get()).exists).toBe(false);
    const invalid = structuredClone(fixture);
    invalid.id = "invalid";
    invalid.subject.extra = true;
    expect((await post(0, JSON.stringify(invalid))).status).toBe(422);
    expect((await root.collection("packs").doc("invalid").get()).exists).toBe(false);
    const orphan = structuredClone(fixture);
    orphan.id = "orphan";
    await root.collection("packKeys").doc("orphan").create({ contentHash: "bad" });
    expect((await post(0, JSON.stringify(orphan))).status).toBe(500);
    expect((await root.collection("packs").doc("orphan").get()).exists).toBe(false);
    const orphanPack = structuredClone(fixture);
    orphanPack.id = "orphan-pack";
    await root.collection("packs").doc("orphan-pack").create({ contentHash: "bad" });
    expect((await post(0, JSON.stringify(orphanPack))).status).toBe(500);
    expect((await root.collection("packKeys").doc("orphan-pack").get()).exists).toBe(false);
    const reviewId = "66666666-6666-4666-8666-666666666666";
    const startReview = await fetch(attempts, {
      method: "POST",
      headers: headers(0),
      body: JSON.stringify({ attemptId: reviewId, packId: fixture.id }),
    });
    expect(startReview.status).toBe(201);
    const reviewUrl = `${attempts}/${reviewId}`;
    const answers = {
      "noni-choice": { choiceId: "noni" },
      "prepare-blank": { text: "  おきます  " },
      "reading-short": { text: "やくそく" },
      "habit-short": { text: "習慣" },
      "contrast-review": { text: "contrast" },
    };
    const submit = (body: object, index = 0) =>
      fetch(`${reviewUrl}/submit`, {
        method: "POST",
        headers: headers(index),
        body: JSON.stringify(body),
      });
    const assess = (body: object, index = 0) =>
      fetch(`${reviewUrl}/assessments`, {
        method: "POST",
        headers: headers(index),
        body: JSON.stringify(body),
      });
    expect((await assess({ ratings: {} })).status).toBe(409);
    expect((await submit({ revision: 0, answers: {} })).status).toBe(422);
    expect((await submit({ revision: 1, answers })).status).toBe(409);
    expect((await submit({ revision: 0, answers, uid: "forged" })).status).toBe(422);
    for (const field of [
      "grade",
      "score",
      "correct",
      "key",
      "explanation",
      "updatedAt",
      "status",
    ]) {
      expect((await submit({ revision: 0, answers, [field]: "forged" })).status).toBe(422);
    }
    for (const invalidAnswers of [
      { ...answers, "habit-short": { text: "   " } },
      { ...answers, unknown: { text: "x" } },
      { ...answers, "noni-choice": { text: "noni" } },
      { ...answers, "habit-short": { text: "x", score: 1 } },
    ])
      expect((await submit({ revision: 0, answers: invalidAnswers })).status).toBe(422);
    expect((await submit({ revision: 0, answers }, 1)).status).toBe(404);
    const concurrentSubmissions = await Promise.all([
      submit({ revision: 0, answers }),
      submit({ revision: 0, answers }),
    ]);
    expect(concurrentSubmissions.map((response) => response.status)).toEqual([200, 200]);
    const review = await concurrentSubmissions[0].json();
    expect(review.status).toBe("awaiting_self_review");
    expect(review.revision).toBe(1);
    expect(review.results["noni-choice"].grade).toEqual({
      kind: "objective",
      correct: true,
      score: 1,
    });
    expect(review.results["prepare-blank"].grade).toEqual({
      kind: "objective",
      correct: true,
      score: 1,
    });
    expect(review.results["reading-short"].grade).toEqual({
      kind: "objective",
      correct: true,
      score: 1,
    });
    expect(review.results["habit-short"].grade).toEqual({
      kind: "self",
      rating: null,
      score: null,
    });
    expect(review.results["contrast-review"].grade).toEqual({
      kind: "self",
      rating: null,
      score: null,
    });
    expect(review.feedback["habit-short"].modelAnswer).toBeTruthy();
    expect(review).not.toHaveProperty("submissionHash");
    expect(review).not.toHaveProperty("assessmentHash");
    const submittedDocument = (await root.collection("attempts").doc(reviewId).get()).data();
    expect(JSON.stringify(submittedDocument)).not.toMatch(
      /explanation|acceptedAnswers|modelAnswer|rubric|prompt/,
    );
    expect(submittedDocument?.submissionHash).toMatch(/^[0-9a-f]{64}$/);
    const retryReview = await (await submit({ revision: 0, answers })).json();
    expect(retryReview.revision).toBe(1);
    expect(retryReview.submittedAt).toBe(review.submittedAt);
    expect(retryReview.updatedAt).toBe(review.updatedAt);
    expect(retryReview.results).toEqual(review.results);
    const reorderedAnswers = Object.fromEntries(Object.entries(answers).reverse());
    expect((await (await submit({ revision: 0, answers: reorderedAnswers })).json()).revision).toBe(
      1,
    );
    expect(
      (await submit({ revision: 0, answers: { ...answers, "habit-short": { text: "different" } } }))
        .status,
    ).toBe(409);
    expect(
      (
        await fetch(reviewUrl, {
          method: "PATCH",
          headers: headers(0),
          body: JSON.stringify({ revision: 1, answers }),
        })
      ).status,
    ).toBe(409);
    for (const ratings of [
      {},
      { "habit-short": "met" },
      { "habit-short": "met", "contrast-review": "partial", "noni-choice": "met" },
      { "habit-short": "bad", "contrast-review": "met" },
    ])
      expect((await assess({ ratings })).status).toBe(422);
    const ratings = { "habit-short": "met", "contrast-review": "partial" };
    expect((await assess({ ratings, uid: "forged" })).status).toBe(422);
    const assessed = await Promise.all([assess({ ratings }), assess({ ratings })]);
    expect(assessed.map((response) => response.status)).toEqual([200, 200]);
    const completed = await assessed[0].json();
    expect(completed.status).toBe("completed");
    expect(completed.revision).toBe(2);
    expect(completed.results["habit-short"].grade).toEqual({
      kind: "self",
      rating: "met",
      score: 1,
    });
    expect(completed.results["contrast-review"].grade).toEqual({
      kind: "self",
      rating: "partial",
      score: 0.5,
    });
    const retriedAssessment = await (await assess({ ratings })).json();
    expect(retriedAssessment.completedAt).toBe(completed.completedAt);
    expect(retriedAssessment.updatedAt).toBe(completed.updatedAt);
    expect(retriedAssessment.revision).toBe(completed.revision);
    expect(retriedAssessment.results).toEqual(completed.results);
    expect(
      (
        await (
          await assess({ ratings: Object.fromEntries(Object.entries(ratings).reverse()) })
        ).json()
      ).revision,
    ).toBe(2);
    const retriedAfterCompletion = await (await submit({ revision: 0, answers })).json();
    expect(retriedAfterCompletion.status).toBe("completed");
    expect(retriedAfterCompletion.revision).toBe(completed.revision);
    expect(retriedAfterCompletion.submittedAt).toBe(completed.submittedAt);
    const retriedStartReview = await (
      await fetch(attempts, {
        method: "POST",
        headers: headers(0),
        body: JSON.stringify({ attemptId: reviewId, packId: fixture.id }),
      })
    ).json();
    expect(retriedStartReview.feedback).toEqual(completed.feedback);
    expect(retriedStartReview).not.toHaveProperty("assessmentHash");
    expect((await assess({ ratings: { ...ratings, "habit-short": "not_yet" } })).status).toBe(409);
    expect((await (await fetch(reviewUrl, { headers: headers(0) })).json()).results).toEqual(
      completed.results,
    );
    for (const [kind, rawSelected] of [
      ["objective", fixture.exercises.slice(0, 3)],
      ["self", fixture.exercises.slice(3)],
    ] as const) {
      const selected = structuredClone(rawSelected);
      if (kind === "objective") selected[1].answer.acceptedAnswers = ["ＡＢＣ", "Second Option"];
      const skillIds = new Set(
        selected.flatMap((exercise: { skillIds: string[] }) => exercise.skillIds),
      );
      const pack = {
        ...fixture,
        id: `m5-${kind}`,
        exercises: selected,
        skills: fixture.skills.filter((skill: { id: string }) => skillIds.has(skill.id)),
      };
      expect((await post(0, JSON.stringify(pack))).status).toBe(201);
      const id =
        kind === "objective"
          ? "77777777-7777-4777-8777-777777777777"
          : "88888888-8888-4888-8888-888888888888";
      expect(
        (
          await fetch(attempts, {
            method: "POST",
            headers: headers(0),
            body: JSON.stringify({ attemptId: id, packId: pack.id }),
          })
        ).status,
      ).toBe(201);
      const selectedAnswers = Object.fromEntries(
        selected.map((exercise: { id: string }) => [
          exercise.id,
          answers[exercise.id as keyof typeof answers],
        ]),
      );
      if (kind === "objective") {
        selectedAnswers["noni-choice"] = { choiceId: "node" };
        selectedAnswers["prepare-blank"] = { text: "  SECOND\u3000OPTION  " };
        selectedAnswers["reading-short"] = { text: "やくそく!" };
      }
      const response = await fetch(`${attempts}/${id}/submit`, {
        method: "POST",
        headers: headers(0),
        body: JSON.stringify({ revision: 0, answers: selectedAnswers }),
      });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.status).toBe(kind === "objective" ? "completed" : "awaiting_self_review");
      if (kind === "objective") {
        expect(result.completedAt).toBe(result.submittedAt);
        expect(result.results["noni-choice"].grade.correct).toBe(false);
        expect(result.results["prepare-blank"].grade.correct).toBe(true);
        expect(result.results["reading-short"].grade.correct).toBe(false);
      } else {
        const concurrentRatings = [ratings, { ...ratings, "habit-short": "not_yet" }].map(
          (snapshot) =>
            fetch(`${attempts}/${id}/assessments`, {
              method: "POST",
              headers: headers(0),
              body: JSON.stringify({ ratings: snapshot }),
            }),
        );
        expect(
          (await Promise.all(concurrentRatings)).map((response) => response.status).sort(),
        ).toEqual([200, 409]);
        expect(
          (await (await fetch(`${attempts}/${id}`, { headers: headers(0) })).json()).revision,
        ).toBe(2);
      }
    }
    const raceId = "99999999-9999-4999-8999-999999999999";
    expect(
      (
        await fetch(attempts, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ attemptId: raceId, packId: fixture.id }),
        })
      ).status,
    ).toBe(201);
    const raceUrl = `${attempts}/${raceId}`;
    const raceSave = fetch(raceUrl, {
      method: "PATCH",
      headers: headers(0),
      body: JSON.stringify({ revision: 0, answers }),
    });
    const raceSubmit = fetch(`${raceUrl}/submit`, {
      method: "POST",
      headers: headers(0),
      body: JSON.stringify({ revision: 0, answers }),
    });
    expect(
      (await Promise.all([raceSave, raceSubmit])).map((response) => response.status).sort(),
    ).toEqual([200, 409]);
    const raceAttempt = await (await fetch(raceUrl, { headers: headers(0) })).json();
    expect(raceAttempt.revision).toBe(1);
    const mismatchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(
      (
        await fetch(attempts, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ attemptId: mismatchId, packId: fixture.id }),
        })
      ).status,
    ).toBe(201);
    const different = { ...answers, "reading-short": { text: "やくそく!" } };
    const racePayloads = [answers, different].map((snapshot) =>
      fetch(`${attempts}/${mismatchId}/submit`, {
        method: "POST",
        headers: headers(0),
        body: JSON.stringify({ revision: 0, answers: snapshot }),
      }),
    );
    expect((await Promise.all(racePayloads)).map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const brokenPack = { ...fixture, id: "m5-broken-key" };
    expect((await post(0, JSON.stringify(brokenPack))).status).toBe(201);
    const brokenId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(
      (
        await fetch(attempts, {
          method: "POST",
          headers: headers(0),
          body: JSON.stringify({ attemptId: brokenId, packId: brokenPack.id }),
        })
      ).status,
    ).toBe(201);
    const brokenKeyRef = root.collection("packKeys").doc(brokenPack.id);
    const brokenKeys = (await brokenKeyRef.get()).get("keys");
    brokenKeys["prepare-blank"] = { explanation: "private-key-sentinel" };
    await brokenKeyRef.update({ keys: brokenKeys });
    const failedSubmit = await fetch(`${attempts}/${brokenId}/submit`, {
      method: "POST",
      headers: headers(0),
      body: JSON.stringify({ revision: 0, answers }),
    });
    expect(failedSubmit.status).toBe(500);
    const failedBody = await failedSubmit.text();
    expect(failedBody).not.toContain("private-key-sentinel");
    expect(failedBody).not.toContain(tokens[0]);
    expect((await root.collection("attempts").doc(brokenId).get()).get("revision")).toBe(0);
    for (const uid of users.slice(0, 2).map((u) => u.uid))
      await db.recursiveDelete(db.collection("users").doc(uid));
  }, 60000);

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
