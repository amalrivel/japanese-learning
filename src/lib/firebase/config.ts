export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  useEmulators: boolean;
};

export type FirebaseServerConfig = {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  useEmulators: boolean;
  allowedUids: string[];
};

export class ConfigurationError extends Error {}
type Environment = Record<string, string | undefined>;

function required(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new ConfigurationError(`Missing ${name}.`);
  return value;
}

export function getPublicFirebaseConfig(env: Environment): FirebasePublicConfig {
  const useEmulators = env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  const projectId = required(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (useEmulators && (env.NODE_ENV === "production" || projectId !== "demo-learning-pwa")) {
    throw new ConfigurationError("Firebase emulators require the demo project outside production.");
  }
  return {
    apiKey: required(env, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: required(env, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId,
    appId: required(env, "NEXT_PUBLIC_FIREBASE_APP_ID"),
    useEmulators,
  };
}

export function parseAllowedUids(value: string | undefined) {
  const uids = value?.split(",").map((uid) => uid.trim()) ?? [];
  if (!uids.length || uids.some((uid) => !uid || uid.length > 128 || uid.includes("/"))) {
    throw new ConfigurationError("APP_ALLOWED_UIDS must contain valid Firebase UIDs.");
  }
  return [...new Set(uids)];
}

export function getServerFirebaseConfig(env: Environment): FirebaseServerConfig {
  const projectId = required(env, "FIREBASE_PROJECT_ID");
  const publicProjectId = required(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const authEmulator = env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulator = env.FIRESTORE_EMULATOR_HOST;
  const useEmulators = Boolean(authEmulator || firestoreEmulator);

  if (projectId !== publicProjectId) {
    throw new ConfigurationError("Firebase project IDs must match.");
  }
  if (
    useEmulators &&
    (env.NODE_ENV === "production" ||
      projectId !== "demo-learning-pwa" ||
      env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "true" ||
      authEmulator !== "127.0.0.1:9099" ||
      firestoreEmulator !== "127.0.0.1:8080")
  ) {
    throw new ConfigurationError("Firebase emulator configuration is invalid.");
  }
  if (
    !useEmulators &&
    (authEmulator || firestoreEmulator || env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true")
  ) {
    throw new ConfigurationError("Firebase emulator configuration is invalid.");
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!useEmulators && (!clientEmail || !privateKey)) {
    throw new ConfigurationError("Firebase Admin credentials are not configured.");
  }
  return {
    projectId,
    clientEmail,
    privateKey,
    useEmulators,
    allowedUids: parseAllowedUids(env.APP_ALLOWED_UIDS),
  };
}
