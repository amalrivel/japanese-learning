const fs = require("node:fs");
// A Next.js child inherits file values from its parent; reload them from the selected file.
if (process.env.__LEARNING_FILE_KEYS !== undefined) {
  for (const key of process.env.__LEARNING_FILE_KEYS.split(",").filter(Boolean))
    delete process.env[key];
  delete process.env.__NEXT_PROCESSED_ENV;
  delete process.env.__LEARNING_FILE_KEYS;
}
const nextEnv = require("@next/env");

const file = process.env.__LEARNING_ENV_FILE || (process.argv[2] === "dev" ? ".env.local" : ".env");
process.env.__LEARNING_ENV_FILE = file;
process.env.NODE_ENV ||= file === ".env.local" ? "development" : "production";
let contents = "";
try {
  contents = fs.readFileSync(file, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

// shortcut: depends on Next's internal environment loader; review when upgrading Next.js.
const loadedFiles = [{ path: file, contents, env: {} }];
function rememberFileKeys(parsed) {
  process.env.__LEARNING_FILE_KEYS = Object.keys(parsed || {}).join(",");
  nextEnv.updateInitialEnv({ __LEARNING_FILE_KEYS: process.env.__LEARNING_FILE_KEYS });
}
rememberFileKeys(nextEnv.processEnv(loadedFiles)[1]);
const modulePath = require.resolve("@next/env");
require.cache[modulePath].exports = {
  ...nextEnv,
  loadEnvConfig(dir, dev, log, forceReload, onReload) {
    if (forceReload) {
      nextEnv.resetEnv();
      try {
        loadedFiles[0].contents = fs.readFileSync(file, "utf8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        loadedFiles[0].contents = "";
      }
    }
    const [combinedEnv, parsedEnv] = nextEnv.processEnv(
      loadedFiles,
      dir,
      log,
      forceReload,
      onReload,
    );
    if (forceReload) rememberFileKeys(parsedEnv);
    return { combinedEnv, parsedEnv, loadedEnvFiles: loadedFiles };
  },
};
