import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { vi } from "vitest";

type SyncListener = Parameters<
  typeof import("@nucleum/datafn/datafn.store").datafn.subscribe
>[0];
type SyncEvent = Parameters<SyncListener>[0];
type PhotoUploader = {
  uploadFileV2(
    contentType: string,
    name: string,
    blob: Blob,
    options: { isGenerateThumbnail: boolean }
  ): Promise<unknown>;
};

/** Delivers the synthetic DataFn pull events to the tested upload queue. */
export function createUploadSyncEvents() {
  const listeners = new Set<SyncListener>();

  return {
    subscribe(listener: SyncListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(type: string, context: Record<string, unknown>) {
      for (const listener of listeners) {
        listener({ type, timestampMs: Date.now(), context } as SyncEvent);
      }
    }
  };
}

/** Creates a fresh DataFn storage identity for an upload fixture. */
export function newUploadTestDevice() {
  return {
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`
  };
}

/** Stubs the browser constructors and endpoint template used by upload tests. */
export function stubUploadBrowserGlobals() {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubEnv(
    "VITE_ACCOUNT_BASE_URL_TEMPLATE",
    "https://account-{region}-dev.nucleum.app"
  );
}

/** Installs object-URL mocks for previews from a queued file. */
export function stubUploadObjectUrls(
  create: typeof URL.createObjectURL = () => "blob:queued"
) {
  URL.createObjectURL ??= () => "";
  vi.spyOn(URL, "createObjectURL").mockImplementation(create);
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
}

/** The cloud profile used by the upload fixtures. */
export function uploadTestUserInfo(userId: string) {
  return {
    id: `user:${userId}`,
    email: `${userId}@example.test`,
    nickName: userId,
    joinDate: new Date(0),
    lastLogin: new Date(0),
    region: "useast"
  };
}

/** Captures the photo and thumbnail used by the queue and backup tests. */
export async function captureUploadTestPhoto(
  fileUpload: PhotoUploader,
  codec: { mockResolvedValueOnce(blob: Blob): unknown }
) {
  codec.mockResolvedValueOnce(new Blob(["thumb bytes"], { type: "image/jpeg" }));
  const [record] = (await fileUpload.uploadFileV2(
    "image/png",
    "photo.png",
    new Blob(["photo bytes"], { type: "image/png" }),
    { isGenerateThumbnail: true }
  )) as { id: string; fileId: string }[];
  return record;
}
