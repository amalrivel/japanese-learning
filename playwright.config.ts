import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    browserName: "chromium",
    launchOptions: {
      ignoreDefaultArgs: ["--disable-back-forward-cache"],
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (!process.env.CI && existsSync("/usr/bin/google-chrome")
          ? "/usr/bin/google-chrome"
          : undefined),
      args: ["--no-sandbox"],
    },
  },
});
