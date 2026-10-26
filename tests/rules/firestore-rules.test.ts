import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { assertDemoEmulators } from "@/../tests/helpers/emulator";

describe("Firestore client access rules", () => {
  let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  beforeAll(async () => {
    assertDemoEmulators();
    env = await initializeTestEnvironment({
      projectId: "demo-learning-pwa",
      firestore: {
        host: "127.0.0.1",
        port: 8080,
        rules: await readFile(fileURLToPath(new URL("../../firestore.rules", import.meta.url)), "utf8"),
      },
    });
  });

  afterAll(async () => { await env?.cleanup(); });

  it("denies unauthenticated and authenticated reads and writes", async () => {
    const anonymous = env.unauthenticatedContext().firestore();
    const authenticated = env.authenticatedContext("learner-a").firestore();
    for (const db of [anonymous, authenticated]) {
      const reference = doc(db, "users/learner-a/packs/pack-a");
      await assertFails(getDoc(reference));
      await assertFails(setDoc(reference, { title: "private" }));
    }
  });
});
