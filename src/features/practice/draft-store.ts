import { z } from "zod";
import { attemptIdSchema } from "./answers";
import { learningWorkV2Schema } from "./work-schema-v2";

export type EditableWork = Pick<
  z.infer<typeof learningWorkV2Schema>,
  "answers" | "reflection" | "currentExerciseId"
>;
export type PendingWorkMutation = {
  kind: "save" | "submit";
  operationId: string;
  expectedRevision: number;
  sent: EditableWork | null;
};
export type DeviceDraft = {
  uid: string;
  workId: string;
  packId: string;
  branchId: string;
  version: number;
  epoch: number;
  baseRevision: number;
  base: EditableWork;
  editable: EditableWork;
  pending: PendingWorkMutation | null;
  replacement?: { workId: string; operationId: string; sent: EditableWork };
};

const editableSchema = z.strictObject({
  answers: learningWorkV2Schema.shape.answers,
  currentExerciseId: learningWorkV2Schema.shape.currentExerciseId,
  reflection: z.strictObject({
    understood: z.array(z.string().max(500)).max(3),
    unclear: z.array(z.string().max(500)).max(2),
    nextStep: z.string().max(500),
  }),
});
const pendingSchema = z
  .strictObject({
    kind: z.enum(["save", "submit"]),
    operationId: attemptIdSchema,
    expectedRevision: learningWorkV2Schema.shape.revision,
    sent: editableSchema.nullable(),
  })
  .refine((value) => (value.kind === "save") === (value.sent !== null));
const draftSchema = z.strictObject({
  uid: z.string().min(1).max(128),
  workId: attemptIdSchema,
  packId: learningWorkV2Schema.shape.packId,
  branchId: attemptIdSchema,
  version: z.number().int().nonnegative().safe(),
  epoch: z.number().int().nonnegative().safe(),
  baseRevision: learningWorkV2Schema.shape.revision,
  base: editableSchema,
  editable: editableSchema,
  pending: pendingSchema.nullable(),
  replacement: z
    .strictObject({ workId: attemptIdSchema, operationId: attemptIdSchema, sent: editableSchema })
    .optional(),
});

const DATABASE = "japanese-learning-drafts-v2";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("drafts", { keyPath: ["uid", "workId", "branchId"] });
      db.createObjectStore("epochs");
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readDeviceDrafts(uid: string, workId: string) {
  const db = await openDatabase();
  try {
    return await new Promise<{ epoch: number; drafts: DeviceDraft[] }>((resolve, reject) => {
      const tx = db.transaction(["drafts", "epochs"], "readonly");
      const epochRequest = tx.objectStore("epochs").get(uid);
      const range = IDBKeyRange.bound([uid, workId, ""], [uid, workId, "\uffff"]);
      const draftsRequest = tx.objectStore("drafts").getAll(range);
      tx.oncomplete = () => {
        const epoch = (epochRequest.result as number | undefined) ?? 0;
        try {
          const drafts = (draftsRequest.result as unknown[]).map((item) => draftSchema.parse(item));
          resolve({ epoch, drafts: drafts.filter((draft) => draft.epoch === epoch) });
        } catch (error) {
          reject(error);
        }
      };
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB read failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB read aborted"));
    });
  } finally {
    db.close();
  }
}

export async function writeDeviceDraft(draft: DeviceDraft, expectedVersion: number | null) {
  const validated = draftSchema.parse(draft);
  const db = await openDatabase();
  try {
    return await new Promise<"saved" | "conflict" | "revoked">((resolve, reject) => {
      const tx = db.transaction(["drafts", "epochs"], "readwrite");
      const store = tx.objectStore("drafts");
      const epoch = tx.objectStore("epochs").get(draft.uid);
      const current = store.get([draft.uid, draft.workId, draft.branchId]);
      let result: "saved" | "conflict" | "revoked" = "saved";
      current.onsuccess = () => {
        const existing = current.result as DeviceDraft | undefined;
        if (((epoch.result as number | undefined) ?? 0) !== draft.epoch) result = "revoked";
        else if ((existing?.version ?? null) !== expectedVersion) result = "conflict";
        else store.put(validated);
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
    });
  } finally {
    db.close();
  }
}

export async function clearDeviceDrafts(uid: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["drafts", "epochs"], "readwrite");
      const epochs = tx.objectStore("epochs");
      const epoch = epochs.get(uid);
      epoch.onsuccess = () => epochs.put(((epoch.result as number | undefined) ?? 0) + 1, uid);
      const range = IDBKeyRange.bound([uid, "", ""], [uid, "\uffff", "\uffff"]);
      tx.objectStore("drafts").delete(range);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB cleanup failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB cleanup aborted"));
    });
  } finally {
    db.close();
  }
}

export async function deleteDeviceDraft(draft: DeviceDraft) {
  const db = await openDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(["drafts", "epochs"], "readwrite");
      const store = tx.objectStore("drafts");
      const epoch = tx.objectStore("epochs").get(draft.uid);
      const key = [draft.uid, draft.workId, draft.branchId];
      const current = store.get(key);
      let deleted = false;
      current.onsuccess = () => {
        if (
          ((epoch.result as number | undefined) ?? 0) === draft.epoch &&
          (current.result as DeviceDraft | undefined)?.version === draft.version
        ) {
          store.delete(key);
          deleted = true;
        }
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB delete aborted"));
    });
  } finally {
    db.close();
  }
}

export async function hasUnsyncedDeviceDrafts(uid: string) {
  const db = await openDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction("drafts", "readonly");
      const range = IDBKeyRange.bound([uid, "", ""], [uid, "\uffff", "\uffff"]);
      const request = tx.objectStore("drafts").getAll(range);
      tx.oncomplete = () => {
        try {
          const drafts = (request.result as unknown[]).map((item) => draftSchema.parse(item));
          resolve(
            drafts.some(
              (draft) =>
                draft.pending !== null ||
                !!draft.replacement ||
                JSON.stringify(draft.editable) !== JSON.stringify(draft.base),
            ),
          );
        } catch (error) {
          reject(error);
        }
      };
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB read failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB read aborted"));
    });
  } finally {
    db.close();
  }
}

let activeAccount: string | null | undefined;
let accountQueue: Promise<unknown> = Promise.resolve();
const ACCOUNT_KEY = "learning-draft-account";

export function activateDeviceAccount(uid: string | null) {
  const operation = accountQueue.then(async () => {
    let previous = activeAccount;
    let trackingFailed = false;
    if (previous === undefined) {
      try {
        previous = sessionStorage.getItem(ACCOUNT_KEY);
      } catch {
        previous = null;
        trackingFailed = true;
      }
    }
    const changed = !!previous && previous !== uid;
    try {
      if (changed && previous) await clearDeviceDrafts(previous);
      if (uid) sessionStorage.setItem(ACCOUNT_KEY, uid);
      else sessionStorage.removeItem(ACCOUNT_KEY);
      if (trackingFailed) throw new Error("Account tracking unavailable");
      activeAccount = uid;
      return changed;
    } catch (error) {
      activeAccount = previous;
      throw error;
    }
  });
  accountQueue = operation.catch(() => {});
  return operation;
}
