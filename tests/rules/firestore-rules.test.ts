import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
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
        rules: await readFile(
          fileURLToPath(new URL("../../firestore.rules", import.meta.url)),
          "utf8",
        ),
      },
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it.each(["packs", "packKeys", "attempts"])(
    "denies anonymous, owner, and cross-UID get/list/create/update/delete for %s",
    async (name) => {
      const path = `users/learner-a/${name}`;
      assertDemoEmulators();
      await env.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), path, "m2-rules-existing"), {
          marker: "rules-fixture",
        });
      });
      try {
        for (const context of [
          env.unauthenticatedContext(),
          env.authenticatedContext("learner-a"),
          env.authenticatedContext("learner-b"),
        ]) {
          const db = context.firestore();
          const existing = doc(db, path, "m2-rules-existing");
          await assertFails(getDoc(existing));
          await assertFails(getDocs(collection(db, path)));
          await assertFails(setDoc(doc(db, path, "m2-rules-new"), { marker: "denied" }));
          await assertFails(updateDoc(existing, { marker: "denied" }));
          await assertFails(deleteDoc(existing));
        }
      } finally {
        assertDemoEmulators();
        await env.withSecurityRulesDisabled(async (context) => {
          await deleteDoc(doc(context.firestore(), path, "m2-rules-existing"));
          await deleteDoc(doc(context.firestore(), path, "m2-rules-new"));
        });
      }
    },
  );
});
