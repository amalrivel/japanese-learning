import type { User } from "firebase/auth";
import { canonicalJson } from "@/features/content/schema";
import type { LearningPackV2 } from "@/features/content/schema-v2";
import { request } from "./request";
import { learningWorkV2Schema, workMatchesPackV2, type LearningWorkV2 } from "./work-schema-v2";
import {
  readDeviceDrafts,
  activateDeviceAccount,
  writeDeviceDraft,
  deleteDeviceDraft,
  type DeviceDraft,
  type EditableWork,
  type PendingWorkMutation,
} from "./draft-store";

export const editableWork = (work: LearningWorkV2): EditableWork => ({
  answers: work.answers,
  reflection: work.reflection,
  currentExerciseId: work.currentExerciseId,
});
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
export type DraftStatus =
  "loading" | "saving" | "local" | "server" | "failed" | "conflict" | "submitted";
export type DraftView = {
  work: LearningWorkV2;
  editable: EditableWork;
  status: DraftStatus;
  storageFailed: boolean;
  pending: boolean;
  submitting: boolean;
  branches: DeviceDraft[];
  message: string;
};

export class CommuterDraft {
  private controller = new AbortController();
  private queue: Promise<void> = Promise.resolve();
  private syncing = false;
  private submitRequested = false;
  private disposed = false;
  private record: DeviceDraft | null = null;
  private editable: EditableWork;
  private work: LearningWorkV2;
  private branches: DeviceDraft[] = [];
  private status: DraftStatus = "loading";
  private storageFailed = false;
  private message = "";
  private emergencyPending: PendingWorkMutation | null = null;

  constructor(
    private user: User,
    work: LearningWorkV2,
    private pack: LearningPackV2,
    private notify: (view: DraftView) => void,
  ) {
    this.work = work;
    this.editable = editableWork(work);
  }
  private currentStatus(): DraftStatus {
    return this.status;
  }
  private publish() {
    if (!this.disposed)
      this.notify({
        work: this.work,
        editable: this.editable,
        status: this.status,
        storageFailed: this.storageFailed,
        pending: this.submitRequested || !!(this.record?.pending ?? this.emergencyPending),
        submitting:
          this.submitRequested ||
          (this.record?.pending ?? this.emergencyPending)?.kind === "submit",
        branches: this.branches,
        message: this.message,
      });
  }
  private valid(editable: EditableWork) {
    return workMatchesPackV2({ ...this.work, ...editable }, this.pack);
  }
  private enqueue(action: () => Promise<void>) {
    const operation = this.queue.then(async () => {
      if (!this.disposed) await action();
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  private async persist(next: DeviceDraft) {
    if (!this.record) throw new Error("Draf belum siap.");
    const candidate = { ...next, version: this.record.version + 1 };
    let result: "saved" | "conflict" | "revoked";
    try {
      result = await writeDeviceDraft(candidate, this.record.version);
    } catch (error) {
      this.storageFailed = true;
      this.emergencyPending = this.record.pending;
      throw error;
    }
    if (result === "revoked") throw new Error("Sesi akun telah berubah.");
    if (result === "conflict") {
      const branch = { ...candidate, branchId: crypto.randomUUID(), version: 0 };
      if ((await writeDeviceDraft(branch, null)) !== "saved")
        throw new Error("Cabang draf tidak dapat disimpan.");
      this.record = branch;
      this.status = "conflict";
      this.message = "Draf berubah di tab lain. Kedua salinan dipertahankan; pilih pemulihan.";
      this.branches = (await readDeviceDrafts(this.user.uid, this.work.id)).drafts;
      return false;
    }
    this.record = candidate;
    return true;
  }
  async open() {
    try {
      await activateDeviceAccount(this.user.uid);
      const stored = await readDeviceDrafts(this.user.uid, this.work.id);
      if (this.disposed) return;
      const valid = stored.drafts.filter(
        (draft) =>
          draft.packId === this.pack.id &&
          this.valid(draft.editable) &&
          this.valid(draft.base) &&
          (!draft.pending ||
            (draft.pending.expectedRevision === draft.baseRevision &&
              (!draft.pending.sent || this.valid(draft.pending.sent)))) &&
          (!draft.replacement || this.valid(draft.replacement.sent)),
      );
      if (valid.length !== stored.drafts.length)
        throw new Error("Draf perangkat tidak cocok dengan paket; data dipertahankan.");
      if (valid.length > 1) {
        this.branches = valid;
        this.status = "conflict";
        this.message = "Ada beberapa draf perangkat. Pilih salinan yang akan dipulihkan.";
        this.publish();
        return;
      }
      if (valid.length === 1) this.record = valid[0];
      else {
        this.record = {
          uid: this.user.uid,
          workId: this.work.id,
          packId: this.pack.id,
          branchId: crypto.randomUUID(),
          version: 0,
          epoch: stored.epoch,
          baseRevision: this.work.revision,
          base: editableWork(this.work),
          editable: editableWork(this.work),
          pending: null,
        };
        if ((await writeDeviceDraft(this.record, null)) !== "saved")
          throw new Error("Draf perangkat tidak dapat dibuat.");
      }
      if (this.disposed) return;
      this.editable = this.record.editable;
      if (this.record.pending) {
        this.status = "local";
        this.message = "Memeriksa ulang penyimpanan yang belum pasti.";
        this.kick();
      } else if (
        this.work.status === "submitted" &&
        !same(this.record.editable, editableWork(this.work))
      ) {
        this.status = "submitted";
        this.message =
          "Pekerjaan telah diakhiri. Draf perangkat dipertahankan untuk pekerjaan baru.";
      } else if (this.work.revision !== this.record.baseRevision) {
        this.status = "conflict";
        this.message = "Revisi server berubah. Pilih salinan yang akan digunakan.";
      } else {
        this.status =
          this.work.status === "submitted"
            ? "submitted"
            : same(this.editable, editableWork(this.work))
              ? "server"
              : "local";
        if (this.status === "local") this.kick();
      }
      this.publish();
    } catch {
      if (this.disposed) return;
      this.storageFailed = true;
      this.status = "failed";
      this.message =
        "Penyimpanan HP gagal. Pemulihan lokal tidak tersedia; simpan ke server atau salin input.";
      this.publish();
    }
  }
  update(editable: EditableWork) {
    if (
      this.disposed ||
      this.work.status === "submitted" ||
      this.status === "loading" ||
      this.submitRequested ||
      this.record?.pending?.kind === "submit" ||
      this.branches.length > 1
    )
      return;
    this.editable = editable;
    const conflicted = this.status === "conflict";
    this.status = this.storageFailed ? "failed" : conflicted ? "conflict" : "saving";
    if (!this.storageFailed && !conflicted) this.message = "Menyimpan ke HP…";
    this.publish();
    if (this.storageFailed || !this.record) return;
    void this.enqueue(async () => {
      if (!this.record) return;
      try {
        if (await this.persist({ ...this.record, editable })) {
          if (!conflicted && this.status !== "conflict") {
            this.status = "local";
            this.message = "Tersimpan di HP; menunggu server.";
            this.kick();
          }
        }
      } catch {
        this.storageFailed = true;
        this.status = "failed";
        this.message =
          "Penyimpanan HP gagal. Pemulihan lokal tidak tersedia; simpan ke server atau salin input.";
      }
      this.publish();
    });
  }
  private kick() {
    if (
      !this.syncing &&
      !this.disposed &&
      !this.storageFailed &&
      this.status !== "conflict" &&
      this.status !== "submitted"
    )
      void this.sync();
  }
  private async api<T>(url: string, init: RequestInit = {}) {
    const response = await request(this.user, this.controller.signal, url, init);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error?.message ?? "Permintaan gagal.");
      Object.assign(error, { status: response.status });
      throw error;
    }
    return data as T;
  }
  private async send(pending: PendingWorkMutation) {
    const suffix = pending.kind === "submit" ? "/submit" : "";
    const body = {
      operationId: pending.operationId,
      expectedRevision: pending.expectedRevision,
      ...(pending.sent ?? {}),
    };
    return this.api<LearningWorkV2>(`/api/v2/works/${this.work.id}${suffix}`, {
      method: pending.kind === "save" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  async sync() {
    if (
      this.syncing ||
      this.disposed ||
      this.storageFailed ||
      this.status === "conflict" ||
      this.status === "submitted"
    )
      return;
    this.syncing = true;
    try {
      while (!this.disposed) {
        const queued = this.queue;
        await queued;
        if (queued !== this.queue) continue;
        if (!this.record || this.currentStatus() === "conflict") break;
        if (!this.record.pending) {
          if (same(this.record.editable, this.record.base)) {
            this.status = "server";
            this.message = "Tersimpan di server.";
            break;
          }
          if (!learningWorkV2Schema.safeParse({ ...this.work, ...this.record.editable }).success) {
            this.status = "local";
            this.message =
              "Draf tersimpan di HP. Lengkapi atau hapus bagian refleksi kosong sebelum sinkronisasi.";
            break;
          }
          const pending: PendingWorkMutation = {
            kind: "save",
            operationId: crypto.randomUUID(),
            expectedRevision: this.record.baseRevision,
            sent: this.record.editable,
          };
          await this.enqueue(async () => {
            if (this.record) await this.persist({ ...this.record, pending });
          });
        }
        const pending = this.record?.pending;
        if (!pending || this.currentStatus() === "conflict") break;
        this.status = "saving";
        this.message = "Menyimpan ke server…";
        this.publish();
        const acknowledged = await this.send(pending);
        const latest = await this.api<{ work: LearningWorkV2 }>(`/api/v2/works/${this.work.id}`);
        if (this.disposed) break;
        await this.enqueue(async () => {
          if (!this.record || this.record.pending?.operationId !== pending.operationId) return;
          const base = pending.sent ?? this.record.base;
          if (
            !(await this.persist({
              ...this.record,
              base,
              baseRevision: acknowledged.revision,
              pending: null,
            }))
          )
            return;
          this.work = latest.work;
          if (this.currentStatus() === "conflict" || this.branches.length > 1) {
            this.branches = (await readDeviceDrafts(this.user.uid, this.work.id)).drafts;
            this.status = "conflict";
            this.message =
              "Draf berubah di tab lain. Kedua salinan dipertahankan; pilih pemulihan.";
          } else if (
            latest.work.revision !== acknowledged.revision ||
            (latest.work.status === "submitted" && pending.kind !== "submit")
          ) {
            this.status = latest.work.status === "submitted" ? "submitted" : "conflict";
            this.message = "Pekerjaan server berubah; draf HP tetap dipertahankan.";
          } else if (pending.kind === "submit") {
            this.status = "submitted";
            this.message = "Pekerjaan telah diakhiri.";
          } else {
            this.status = "local";
            this.message = "Tersimpan di HP; memeriksa perubahan berikutnya.";
          }
        });
        this.publish();
        if (this.currentStatus() === "conflict" || this.currentStatus() === "submitted") break;
      }
    } catch (error) {
      if (!this.disposed) {
        if (this.storageFailed) {
          this.status = "failed";
          this.message =
            "Penyimpanan HP gagal. Pemulihan lokal tidak tersedia; simpan ke server atau salin input.";
        } else if (this.currentStatus() === "conflict") {
          this.message =
            "Draf bersaing tetap tersimpan. Pilih pemulihan setelah pemeriksaan selesai.";
        } else if (error instanceof Error && "status" in error && error.status === 409) {
          try {
            const latest = await this.api<{ work: LearningWorkV2 }>(
              `/api/v2/works/${this.work.id}`,
            );
            this.work = latest.work;
          } catch {
            /* The saved draft remains recoverable if the status cannot be refreshed. */
          }
          this.status = this.work.status === "submitted" ? "submitted" : "conflict";
          this.message =
            this.status === "submitted"
              ? "Pekerjaan telah diakhiri; draf HP tetap dipertahankan."
              : "Revisi server berubah. Draf HP tetap dipertahankan.";
        } else if (
          error instanceof Error &&
          "status" in error &&
          typeof error.status === "number" &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 401 &&
          error.status !== 403
        ) {
          try {
            await this.enqueue(async () => {
              if (this.record) await this.persist({ ...this.record, pending: null });
            });
          } catch {
            this.storageFailed = true;
          }
          this.submitRequested = false;
          this.status = this.storageFailed ? "failed" : "local";
          this.message =
            "Server menolak input. Draf tetap ada; periksa dan perbaiki sebelum menyimpan lagi.";
        } else {
          this.status = "local";
          this.message = "Belum tersinkron. Draf tersimpan di HP; coba lagi saat tersambung.";
        }
      }
    } finally {
      this.syncing = false;
      this.publish();
    }
  }
  async resolve(useLocal: boolean) {
    if (this.syncing) {
      this.message = "Menunggu hasil penyimpanan sebelumnya sebelum pemulihan.";
      this.publish();
      return;
    }
    try {
      const latest = await this.api<{ work: LearningWorkV2 }>(`/api/v2/works/${this.work.id}`);
      if (latest.work.status === "submitted") {
        this.work = latest.work;
        this.status = "submitted";
        this.message = "Pekerjaan sudah diakhiri; draf HP tetap dipertahankan.";
        this.publish();
        return;
      }
      if (this.storageFailed || !this.record) {
        this.work = latest.work;
        if (!useLocal) this.editable = editableWork(latest.work);
        this.emergencyPending = null;
        this.submitRequested = false;
        this.status = "failed";
        this.message = useLocal
          ? "Draf HP siap disimpan darurat; pemulihan lokal tidak tersedia."
          : "Versi server dipilih; pemulihan lokal tidak tersedia.";
        this.publish();
        return;
      }
      await this.enqueue(async () => {
        if (!this.record) return;
        const base = editableWork(latest.work);
        const editable = useLocal ? this.editable : base;
        if (
          await this.persist({
            ...this.record,
            base,
            editable,
            baseRevision: latest.work.revision,
            pending: null,
          })
        ) {
          this.work = latest.work;
          this.editable = editable;
          this.submitRequested = false;
          this.branches = [];
          this.status = useLocal ? "local" : "server";
          this.message = useLocal ? "Draf HP siap disimpan." : "Menggunakan versi server.";
        }
      });
      this.publish();
      if (useLocal) this.kick();
    } catch {
      if (!this.disposed) {
        this.status = this.storageFailed ? "failed" : "conflict";
        this.message =
          "Pemulihan belum berhasil. Draf tetap dipertahankan; periksa koneksi lalu coba lagi.";
        this.publish();
      }
    }
  }
  async selectBranch(branch: DeviceDraft) {
    if (this.syncing) {
      this.message = "Menunggu hasil penyimpanan sebelumnya sebelum memilih draf.";
      this.publish();
      return;
    }
    this.record = branch;
    this.editable = branch.editable;
    this.branches = [];
    if (branch.pending && this.work.status !== "submitted") {
      this.status = "local";
      this.message = "Memeriksa ulang penyimpanan yang belum pasti.";
      this.publish();
      this.kick();
    } else {
      this.status = this.work.status === "submitted" ? "submitted" : "conflict";
      this.message =
        this.work.status === "submitted"
          ? "Pekerjaan telah diakhiri; draf dipertahankan."
          : "Pilih apakah akan memakai draf ini atau versi server.";
      this.publish();
    }
  }
  async emergencySave() {
    if (!this.storageFailed || this.work.status === "submitted") return;
    this.emergencyPending ??= {
      kind: "save",
      operationId: crypto.randomUUID(),
      expectedRevision: this.work.revision,
      sent: this.editable,
    };
    this.status = "saving";
    this.message = "Menyimpan darurat ke server…";
    this.publish();
    try {
      const sent = this.emergencyPending;
      const saved = await this.send(sent);
      if (this.disposed) return;
      this.work = saved;
      this.emergencyPending = null;
      if (sent.kind === "submit") {
        this.submitRequested = false;
        this.status = "submitted";
        this.message = "Pekerjaan telah diakhiri. Pemulihan lokal tidak tersedia.";
      } else {
        this.status = same(this.editable, sent.sent) ? "server" : "failed";
        this.message =
          this.status === "server"
            ? "Tersimpan di server. Pemulihan lokal tetap tidak tersedia."
            : "Sebagian perubahan belum disimpan; simpan lagi atau salin input.";
      }
    } catch (error) {
      if (!this.disposed) {
        if (error instanceof Error && "status" in error && error.status === 409) {
          this.status = "conflict";
          this.message = "Revisi server berubah. Pilih pemulihan; input tetap ada di layar.";
        } else if (
          error instanceof Error &&
          "status" in error &&
          typeof error.status === "number" &&
          error.status >= 400 &&
          error.status < 500
        ) {
          this.emergencyPending = null;
          this.status = "failed";
          this.message =
            "Server menolak input. Perbaiki input atau salin sebelum meninggalkan halaman.";
        } else {
          this.status = "failed";
          this.message =
            "Hasil belum pasti. Ulangi simpan; menutup halaman dapat menghilangkan input dan retry.";
        }
      }
    }
    this.publish();
  }
  async submit() {
    if (this.storageFailed || !this.record || this.status !== "server") return;
    this.submitRequested = true;
    this.status = "saving";
    this.message = "Menyiapkan pengiriman…";
    this.publish();
    try {
      await this.enqueue(async () => {
        if (!this.record) return;
        const pending: PendingWorkMutation = {
          kind: "submit",
          operationId: crypto.randomUUID(),
          expectedRevision: this.record.baseRevision,
          sent: null,
        };
        await this.persist({ ...this.record, pending });
      });
      this.kick();
    } catch {
      if (!this.disposed) {
        this.submitRequested = false;
        this.storageFailed = true;
        this.status = "failed";
        this.message =
          "Tidak dapat menyimpan operasi di HP. Input tetap di layar; simpan ke server atau salin input.";
        this.publish();
      }
    }
  }
  async createReplacement() {
    if (!this.record || this.work.status !== "submitted") return;
    try {
      await this.enqueue(async () => {
        if (!this.record || this.record.replacement) return;
        await this.persist({
          ...this.record,
          replacement: {
            workId: crypto.randomUUID(),
            operationId: crypto.randomUUID(),
            sent: this.editable,
          },
        });
      });
      const replacement = this.record?.replacement;
      if (!replacement || this.status === "conflict") return;
      this.status = "saving";
      this.message = "Membuat pekerjaan baru…";
      this.publish();
      await this.api("/api/v2/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: replacement.workId, packId: this.pack.id }),
      });
      const saved = await this.api<LearningWorkV2>(`/api/v2/works/${replacement.workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: replacement.operationId,
          expectedRevision: 0,
          ...replacement.sent,
        }),
      });
      if (this.disposed) return;
      await deleteDeviceDraft(this.record!);
      this.work = saved;
      this.editable = editableWork(saved);
      this.status = "server";
      this.message = "Draf disimpan sebagai pekerjaan baru.";
    } catch {
      if (!this.disposed) {
        this.status = "submitted";
        this.message =
          "Pekerjaan baru belum dipastikan. Draf tetap disimpan; ulangi untuk melanjutkan.";
      }
    }
    this.publish();
  }
  retry() {
    if (!this.storageFailed) this.kick();
  }
  close() {
    this.disposed = true;
    this.controller.abort();
  }
}
