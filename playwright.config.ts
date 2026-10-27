import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 90_000,
  use: {
    browserName: "chromium",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined),
      args: ["--no-sandbox"],
    },
  },
});
