import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("environment selection", () => {
  it("reloads changed and removed file values in a child while preserving external variables", () => {
    const dir = mkdtempSync(join(tmpdir(), "learning-env-reload-"));
    try {
      writeFileSync(
        join(dir, ".env.local"),
        "APP_ALLOWED_UIDS=old-user\nREMOVED=value\nEXTERNAL=file\n",
      );
      const child = join(dir, "child.cjs");
      writeFileSync(
        child,
        `
const fs = require("node:fs");
const env = require(${JSON.stringify(require.resolve("@next/env"))});
fs.writeFileSync(".env.local", "APP_ALLOWED_UIDS=new-user\\nEXTERNAL=changed\\n");
env.loadEnvConfig(process.cwd(), true, undefined, true);
console.log(JSON.stringify([process.env.APP_ALLOWED_UIDS, process.env.REMOVED, process.env.EXTERNAL]));
`,
      );
      const parent = join(dir, "parent.cjs");
      writeFileSync(
        parent,
        `require("node:child_process").execFileSync(process.execPath, ["--require", ${JSON.stringify(resolve("scripts/load-env.cjs"))}, ${JSON.stringify(child)}, "dev"], {env: process.env, stdio:"inherit"});`,
      );
      const result = execFileSync(
        process.execPath,
        ["--require", resolve("scripts/load-env.cjs"), parent, "dev"],
        {
          cwd: dir,
          env: { PATH: process.env.PATH, NODE_ENV: "development", EXTERNAL: "deployment" },
          encoding: "utf8",
        },
      );
      expect(JSON.parse(result)).toEqual(["new-user", null, "deployment"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it.each([
    ["dev", "local", undefined],
    ["build", "production", "production-only"],
    ["start", "production", "production-only"],
  ])("loads the selected file for %s", (command, expected, onlyProduction) => {
    const dir = mkdtempSync(join(tmpdir(), "learning-env-"));
    try {
      writeFileSync(join(dir, ".env"), "CHOICE=production\nONLY_PRODUCTION=production-only\n");
      writeFileSync(join(dir, ".env.local"), "CHOICE=local\nONLY_LOCAL=local-only\n");
      const probe = join(dir, "probe.cjs");
      writeFileSync(
        probe,
        `require(${JSON.stringify(require.resolve("@next/env"))}).loadEnvConfig(process.cwd(), process.argv[2] === "dev", undefined, true); console.log(JSON.stringify([process.env.CHOICE, process.env.ONLY_PRODUCTION, process.env.ONLY_LOCAL]));`,
      );
      const output = execFileSync(
        process.execPath,
        ["--require", resolve("scripts/load-env.cjs"), probe, command],
        {
          cwd: dir,
          env: { PATH: process.env.PATH, NODE_ENV: "test" },
          encoding: "utf8",
        },
      );
      expect(JSON.parse(output)).toEqual([
        expected,
        onlyProduction ?? null,
        command === "dev" ? "local-only" : null,
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
