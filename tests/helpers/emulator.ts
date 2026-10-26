const projectId = "demo-learning-pwa";

export function assertDemoEmulators() {
  if (
    process.env.GCLOUD_PROJECT !== projectId ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080"
  ) {
    throw new Error("Refusing emulator test cleanup or access outside the configured demo emulators.");
  }
}
