import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getServerFirebaseConfig } from "@/lib/firebase/config";

const adminKey = "__learningAdminApp" as const;
const globalForFirebase = globalThis as typeof globalThis & {
  [adminKey]?: ReturnType<typeof initializeApp>;
};

export function getFirebaseAdmin() {
  const config = getServerFirebaseConfig(process.env);
  let app =
    globalForFirebase[adminKey] ??
    getApps().find((candidate) => candidate.name === "learning-admin");
  if (!app) {
    app = initializeApp(
      {
        projectId: config.projectId,
        ...(config.useEmulators
          ? {}
          : {
              credential: cert({
                projectId: config.projectId,
                clientEmail: config.clientEmail!,
                privateKey: config.privateKey!,
              }),
            }),
      },
      "learning-admin",
    );
    globalForFirebase[adminKey] = app;
  }
  return { auth: getAuth(app), firestore: getFirestore(app), config };
}
