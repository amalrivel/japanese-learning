import { test, expect, type Page } from "@playwright/test";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertDemoEmulators } from "../helpers/emulator";

const origin = "http://127.0.0.1:3100";
const users = ["m4-browser-a", "m4-browser-b"];
const password = "demo-pass-12345";
let app: App;
let server: ChildProcess;
let directory: string;
let output = "";

test.beforeAll(async () => {
  test.setTimeout(150_000);
  assertDemoEmulators();
  directory = await mkdtemp(join(tmpdir(), "learning-pwa-m4-"));
  for (const name of [
    "src",
    "public",
    "next.config.ts",
    "tsconfig.json",
    "package.json",
    "package-lock.json",
  ])
    await cp(resolve(name), join(directory, name), { recursive: true });
  await symlink(resolve("node_modules"), join(directory, "node_modules"), "dir");
  const signInDirectory = join(directory, "src/app/test-sign-in");
  await mkdir(signInDirectory, { recursive: true });
  await writeFile(
    join(signInDirectory, "page.tsx"),
    `"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
export default function DemoSignIn() { return <main><button onClick={async () => { await signInWithEmailAndPassword(await getFirebaseAuth(), "m4-browser-a@example.test", "${password}"); location.href = "/practice"; }}>Demo A</button><button onClick={async () => { await signInWithEmailAndPassword(await getFirebaseAuth(), "m4-browser-b@example.test", "${password}"); location.href = "/practice"; }}>Demo B</button></main>; }
`,
  );
  app = initializeApp({ projectId: "demo-learning-pwa" }, "m4-browser");
  for (const uid of users) {
    try {
      await getAuth(app).deleteUser(uid);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }
    await getAuth(app).createUser({ uid, email: `${uid}@example.test`, password });
  }
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
      cwd: directory,
      env: {
        ...process.env,
        NODE_ENV: "development",
        FIREBASE_PROJECT_ID: "demo-learning-pwa",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-learning-pwa",
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
        NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-learning-pwa.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:demo",
        APP_ALLOWED_UIDS: users.join(","),
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Demo server exited: ${output}`);
    try {
      if ((await fetch(`${origin}/api/packs`)).status === 401) break;
    } catch {
      /* Starting. */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  for (const uid of users) {
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `${uid}@example.test`, password, returnSecureToken: true }),
      },
    );
    const { idToken } = (await login.json()) as { idToken: string };
    const imported = await fetch(`${origin}/api/packs/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: readFileSync("examples/learning-pack.v1.json", "utf8"),
    });
    expect(imported.status).toBe(201);
    if (uid === users[0]) {
      const original = JSON.parse(readFileSync("examples/learning-pack.v1.json", "utf8"));
      const selected = original.exercises.slice(0, 3);
      const used = new Set(
        selected.flatMap((exercise: { skillIds: string[] }) => exercise.skillIds),
      );
      const objective = {
        ...original,
        id: "m5-browser-objective",
        title: "Objective only fixture",
        exercises: selected,
        skills: original.skills.filter((skill: { id: string }) => used.has(skill.id)),
      };
      expect(
        (
          await fetch(`${origin}/api/packs/import`, {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(objective),
          })
        ).status,
      ).toBe(201);
    }
  }
});

test.afterAll(async () => {
  assertDemoEmulators();
  if (server && server.exitCode === null) {
    const exited = new Promise<void>((resolveExit) => server.once("exit", () => resolveExit()));
    server.kill("SIGTERM");
    await exited;
  }
  if (app) {
    for (const uid of users) {
      await getFirestore(app).recursiveDelete(getFirestore(app).collection("users").doc(uid));
      await getAuth(app).deleteUser(uid);
    }
    await deleteApp(app);
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function signIn(page: Page, account: "A" | "B") {
  await page.goto(`${origin}/test-sign-in`);
  await page.getByRole("button", { name: `Demo ${account}` }).click();
  await expect(page.getByRole("heading", { name: "Practice", exact: true })).toBeVisible();
}

test("practice, saved resume, failure, conflict and account isolation", async ({
  page,
  context,
}) => {
  const leaked: string[] = [];
  page.on("response", (response) => {
    if (/\/api\/(?:packs|attempts)/.test(response.url()) && response.ok())
      void response
        .text()
        .then((body) => {
          if (/"(?:answer|explanation|acceptedAnswers|modelAnswer|rubric|feedback)"\s*:/.test(body))
            leaked.push(response.url());
        })
        .catch(() => {});
  });
  await signIn(page, "A");
  await page.getByRole("link", { name: /N3 practice/ }).click();
  const startIds: string[] = [];
  await page.route("**/api/attempts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    startIds.push((route.request().postDataJSON() as { attemptId: string }).attemptId);
    if (startIds.length === 1) {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Start new attempt" }).click();
  await expect(page.getByText(/Could not start practice/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Retry start" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(startIds).toHaveLength(2);
  expect(startIds[0]).toBe(startIds[1]);
  await page.unroute("**/api/attempts");
  await page.getByLabel("のに", { exact: true }).check();
  await page.getByLabel("のに", { exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("ので", { exact: true })).toBeChecked();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByLabel("のに", { exact: true })).toBeChecked();
  const textboxes = page.locator("textarea");
  await textboxes.nth(0).fill("おきます");
  await textboxes.nth(1).fill("やくそく");
  await textboxes.nth(2).fill("毎日練習します");
  await textboxes.nth(3).fill("contrast and reason");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  await page.getByRole("link", { name: "History", exact: true }).click();
  await page.getByLabel("Filter by pack ID").fill("jlpt-n3-20261026-01");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await page.getByRole("link", { name: /N3 practice/ }).click();
  const attemptUrl = page.url();
  await page.reload();
  await expect(page.getByLabel("のに", { exact: true })).toBeChecked();
  await expect(page.locator("textarea")).toHaveCount(4);
  await expect(page.locator("textarea").nth(0)).toHaveValue("おきます");
  await expect(page.locator("textarea").nth(1)).toHaveValue("やくそく");
  await expect(page.locator("textarea").nth(2)).toHaveValue("毎日練習します");
  await expect(page.locator("textarea").nth(3)).toHaveValue("contrast and reason");
  await expect(page.getByRole("button", { name: /grade/i })).toHaveCount(0);

  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.locator("textarea").nth(1).fill("lost response recovered");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.unroute("**/api/attempts/*");
  await page.reload();
  await expect(page.locator("textarea").nth(1)).toHaveValue("lost response recovered");

  let releaseFailedSave!: () => void;
  const failedSaveHeld = new Promise<void>((resolveHeld) => {
    releaseFailedSave = resolveHeld;
  });
  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await failedSaveHeld;
      await route.abort();
    } else await route.continue();
  });
  await page.locator("textarea").nth(1).fill("pending old request");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saving…");
  await page.locator("textarea").nth(1).fill("lost response recovered");
  releaseFailedSave();
  await expect(page.getByRole("status")).toContainText("Save failed");
  await page.unroute("**/api/attempts/*");
  const settledWrite = page.waitForRequest(
    (request) => request.method() === "PATCH" && request.url().includes("/api/attempts/"),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await settledWrite;
  await expect(page.getByRole("status")).toHaveText("Saved");

  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "PATCH") await route.fetch();
    await route.abort();
  });
  await page.locator("textarea").nth(1).fill("committed but unacknowledged");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Save failed");
  await page.locator("textarea").nth(1).fill("lost response recovered");
  await expect(page.getByRole("status")).toContainText("Save failed");
  await page.unroute("**/api/attempts/*");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.locator("textarea").nth(1)).toHaveValue("lost response recovered");

  let release!: () => void;
  const held = new Promise<void>((resolveHeld) => {
    release = resolveHeld;
  });
  let first = true;
  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "PATCH" && first) {
      first = false;
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.locator("textarea").nth(0).fill("first snapshot");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saving…");
  await page.locator("textarea").nth(0).fill("typed during save");
  release();
  await expect(page.getByRole("status")).toHaveText("Unsaved changes");
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });
  await page.unroute("**/api/attempts/*");

  await page.route("**/api/attempts/*", (route) => route.abort());
  await page.locator("textarea").nth(0).fill("network failure");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Save failed");
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page.locator("textarea").nth(0)).toHaveValue("network failure");
  page.once("dialog", (confirmation) => void confirmation.dismiss());
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.locator("textarea").nth(0)).toHaveValue("network failure");
  const backDialog = page.waitForEvent("dialog");
  await page.evaluate(() => window.history.back());
  await (await backDialog).dismiss();
  await expect(page).toHaveURL(attemptUrl);
  await expect(page.locator("textarea").nth(0)).toHaveValue("network failure");
  const reloadDialog = page.waitForEvent("dialog");
  const reloading = page.reload({ timeout: 3_000 }).catch(() => null);
  const dialog = await reloadDialog;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await reloading;
  await expect(page.locator("textarea").nth(0)).toHaveValue("network failure");
  await page.unroute("**/api/attempts/*");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  const second = await context.newPage();
  await signIn(second, "A");
  await second.goto(attemptUrl);
  await expect(second.locator("textarea").nth(0)).toHaveValue("network failure");
  await page.locator("textarea").nth(0).fill("server version");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await second.locator("textarea").nth(0).fill("local version");
  await second.getByRole("button", { name: "Save", exact: true }).click();
  await expect(second.getByRole("heading", { name: "Recover this draft" })).toBeVisible();
  await expect(second.locator("textarea").nth(0)).toHaveValue("local version");
  await expect(second.locator("pre")).toContainText("server version");
  await second.getByRole("button", { name: "Use server answers" }).click();
  await expect(second.locator("textarea").nth(0)).toHaveValue("server version");
  await page.locator("textarea").nth(0).fill("new server version");
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });
  await second.locator("textarea").nth(0).fill("recovered local version");
  await expect(second.getByRole("heading", { name: "Recover this draft" })).toBeVisible();
  await second.getByRole("button", { name: "Keep my answers" }).click();
  await expect(second.getByRole("status")).toHaveText("Saved");
  await second.reload();
  await expect(second.locator("textarea").nth(0)).toHaveValue("recovered local version");
  let releaseLoad!: () => void;
  let loadStarted!: () => void;
  const loadHeld = new Promise<void>((resolveHeld) => {
    releaseLoad = resolveHeld;
  });
  const loadSeen = new Promise<void>((resolveSeen) => {
    loadStarted = resolveSeen;
  });
  await second.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "GET") {
      const response = await route.fetch();
      loadStarted();
      await loadHeld;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  await second.reload({ waitUntil: "domcontentloaded" });
  await loadSeen;
  await second.getByRole("button", { name: "Sign out" }).click();
  await expect(second.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  releaseLoad();
  await second.unroute("**/api/attempts/*");
  await signIn(second, "B");
  await second.goto(attemptUrl);
  await expect(second.getByText("Could not load attempt.")).toBeVisible();
  await expect(second.locator("textarea")).toHaveCount(0);
  await second.close();
  expect(leaked).toEqual([]);
});

test("a start retry from another account is not reused", async ({ page }) => {
  await signIn(page, "A");
  await page.getByRole("link", { name: /N3 practice/ }).click();
  await page.getByRole("button", { name: "Start new attempt" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await expect(page).toHaveURL(/\?start=/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "B");
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Start new attempt" })).toBeVisible();
  await expect(page).not.toHaveURL(/\?start=/);
});

test("acknowledged answers survive sign-out and sign-in", async ({ page }) => {
  await signIn(page, "A");
  await page.getByRole("link", { name: /N3 practice/ }).click();
  await page.getByRole("button", { name: "Start new attempt" }).click();
  await page.locator("textarea").nth(0).fill("durable answer");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  const attemptId = new URL(page.url()).searchParams.get("start");
  expect(attemptId).toBeTruthy();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await signIn(page, "A");
  await page.goto(`${origin}/history/${attemptId}`);
  await expect(page.locator("textarea").nth(0)).toHaveValue("durable answer");
});

test("submit waits for save, retries lost responses, and persists review", async ({ page }) => {
  await signIn(page, "A");
  await page.goto(`${origin}/practice/jlpt-n3-20261026-01`);
  await page.getByRole("button", { name: "Start new attempt" }).click();
  await page.getByLabel("のに", { exact: true }).check();
  await page.locator("textarea").nth(0).fill("おきます");
  await page.locator("textarea").nth(1).fill("やくそく");
  await page.locator("textarea").nth(2).fill("毎日勉強します");
  await page.locator("textarea").nth(3).fill("contrast and reason");
  const id = new URL(page.url()).searchParams.get("start");
  let releaseSave!: () => void;
  const held = new Promise<void>((resolveHeld) => {
    releaseSave = resolveHeld;
  });
  let firstSave = true;
  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "PATCH" && firstSave) {
      firstSave = false;
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } else await route.continue();
  });
  let submitCount = 0;
  await page.route("**/submit", async (route) => {
    submitCount++;
    if (submitCount === 1) {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saving…");
  await page.locator("textarea").nth(2).fill("jawaban terbaru saat menyimpan");
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.locator("textarea").first()).toBeDisabled();
  releaseSave();
  await expect(page.getByText(/Submission could not be confirmed/)).toBeVisible();
  await page.getByRole("button", { name: "Retry submission" }).click();
  await expect(page.getByRole("heading", { name: "Results and self review" })).toBeVisible();
  await expect(page.getByText("Your answer: jawaban terbaru saat menyimpan")).toBeVisible();
  expect(submitCount).toBe(2);
  await expect(page.getByText("Objective result: Correct (1/1)")).toHaveCount(3);
  await expect(page.getByText("Self assessment: Pending")).toHaveCount(2);
  await page.goto(`${origin}/history/${id}`);
  await page.reload();
  await expect(page.getByText("Self assessment: Pending")).toHaveCount(2);
  const ratingFields = page.getByRole("group", { name: "Rate your answer" });
  await ratingFields.nth(0).getByLabel("met", { exact: true }).check();
  await ratingFields.nth(1).getByLabel("partial", { exact: true }).check();
  let assessmentCount = 0;
  await page.route("**/assessments", async (route) => {
    assessmentCount++;
    if (assessmentCount === 1) {
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Complete self review" }).click();
  await expect(page.getByText(/Could not save ratings/)).toBeVisible();
  await page.getByRole("button", { name: "Retry ratings" }).click();
  await expect(page.getByRole("heading", { name: "Completed review" })).toBeVisible();
  expect(assessmentCount).toBe(2);
  await page.goto(`${origin}/history/${id}`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Completed review" })).toBeVisible();
  await expect(page.getByText("Self assessment: met", { exact: true })).toBeVisible();
  await expect(page.getByText("Self assessment: partial", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete self review" })).toHaveCount(0);
  await page.unroute("**/api/attempts/*");
  let releaseReview!: () => void;
  let reviewStarted!: () => void;
  const reviewHeld = new Promise<void>((resolveHeld) => {
    releaseReview = resolveHeld;
  });
  const reviewSeen = new Promise<void>((resolveSeen) => {
    reviewStarted = resolveSeen;
  });
  await page.route("**/api/attempts/*", async (route) => {
    if (route.request().method() === "GET") {
      const response = await route.fetch();
      reviewStarted();
      await reviewHeld;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await reviewSeen;
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  releaseReview();
  await page.unroute("**/api/attempts/*");
  await signIn(page, "B");
  await page.goto(`${origin}/history/${id}`);
  await expect(page.getByText("Could not load attempt.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Completed review" })).toHaveCount(0);
});

test("objective-only submission completes without ratings", async ({ page }) => {
  await signIn(page, "A");
  await page.goto(`${origin}/practice/m5-browser-objective`);
  await page.getByRole("button", { name: "Start new attempt" }).click();
  await page.getByLabel("のに", { exact: true }).check();
  await page.locator("textarea").nth(0).fill("おきます");
  await page.locator("textarea").nth(1).fill("やくそく");
  const originalId = new URL(page.url()).searchParams.get("start");
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByRole("heading", { name: "Completed review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete self review" })).toHaveCount(0);
  await page.getByRole("link", { name: "Start a new attempt" }).click();
  await page.getByRole("button", { name: "Start new attempt" }).click();
  expect(new URL(page.url()).searchParams.get("start")).not.toBe(originalId);
  await page.goto(`${origin}/history/${originalId}`);
  await expect(page.getByRole("heading", { name: "Completed review" })).toBeVisible();
});
