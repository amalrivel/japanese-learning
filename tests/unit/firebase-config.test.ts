import { describe, expect, it } from "vitest";
import {
  ConfigurationError,
  getPublicFirebaseConfig,
  getServerFirebaseConfig,
  parseAllowedUids,
} from "@/lib/firebase/config";

const emulatorEnv = {
  NODE_ENV: "development",
  FIREBASE_PROJECT_ID: "demo-learning-pwa",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-learning-pwa",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  APP_ALLOWED_UIDS: "learner-a, learner-b,learner-a",
};

describe("Firebase environment validation", () => {
  it("requires a nonempty allowlist, trims entries, and removes duplicates", () => {
    expect(parseAllowedUids(" learner-a,learner-b, learner-a ")).toEqual(["learner-a", "learner-b"]);
    expect(() => parseAllowedUids("learner-a,,learner-b")).toThrow(ConfigurationError);
    expect(() => parseAllowedUids(" ")).toThrow(ConfigurationError);
    expect(() => parseAllowedUids("bad/uid")).toThrow(ConfigurationError);
  });

  it("accepts only the explicit demo emulator project and loopback ports", () => {
    expect(getServerFirebaseConfig(emulatorEnv).useEmulators).toBe(true);
    expect(() => getServerFirebaseConfig({ ...emulatorEnv, FIRESTORE_EMULATOR_HOST: "localhost:8080" })).toThrow(ConfigurationError);
    expect(() => getServerFirebaseConfig({ ...emulatorEnv, NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "false" })).toThrow(ConfigurationError);
    expect(() => getServerFirebaseConfig({ ...emulatorEnv, NODE_ENV: "production" })).toThrow(ConfigurationError);
  });

  it("fails closed when server credentials, allowlist, or matching project IDs are missing", () => {
    expect(() => getServerFirebaseConfig({})).toThrow(ConfigurationError);
    expect(() => getServerFirebaseConfig({
      FIREBASE_PROJECT_ID: "real-project",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "real-project",
      APP_ALLOWED_UIDS: "learner-a",
    })).toThrow(ConfigurationError);
    expect(() => getServerFirebaseConfig({
      FIREBASE_PROJECT_ID: "real-project",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "other-project",
      FIREBASE_CLIENT_EMAIL: "service@example.test",
      FIREBASE_PRIVATE_KEY: "key",
      APP_ALLOWED_UIDS: "learner-a",
    })).toThrow(ConfigurationError);
    expect(() => getServerFirebaseConfig({
      FIREBASE_PROJECT_ID: "real-project",
      FIREBASE_CLIENT_EMAIL: "service@example.test",
      FIREBASE_PRIVATE_KEY: "key",
    })).toThrow(ConfigurationError);
  });

  it("requires all public Firebase values and confines client emulators to the demo project", () => {
    const env = {
      NEXT_PUBLIC_FIREBASE_API_KEY: "fake-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-learning-pwa.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-learning-pwa",
      NEXT_PUBLIC_FIREBASE_APP_ID: "fake-app",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
      NODE_ENV: "development",
    };
    expect(getPublicFirebaseConfig(env).useEmulators).toBe(true);
    expect(() => getPublicFirebaseConfig({ ...env, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "real-project" })).toThrow(ConfigurationError);
    expect(() => getPublicFirebaseConfig({ ...env, NODE_ENV: "production" })).toThrow(ConfigurationError);
    expect(() => getPublicFirebaseConfig({ ...env, NEXT_PUBLIC_FIREBASE_API_KEY: "" })).toThrow(ConfigurationError);
  });
});
