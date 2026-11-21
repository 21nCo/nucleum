import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileFnClient, UploadInput } from "@filefn/client";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount,
  type UserInformation
} from "@nucleum/client/runtime/account/account.type";
import { Product } from "@nucleum/client/config/product.type";
import { configurePersistenceLogger } from "@nucleum/persistence/logging-host";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { createFakeLocks, createFakeOpfs } from "../../../tests/fixtures/opfs";

/** What the FileFn clients of every page received. */
const sdk = vi.hoisted(() => ({
  baseUrls: [] as string[],
  started: [] as UploadInput[],
  /** The index in `baseUrls` of the client that started each upload. */
  startedBy: [] as number[],
  uploads: [] as UploadInput[]
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (
      config: Parameters<typeof actual.createFileFnClient>[0]
    ): Partial<FileFnClient> => {
      const client = sdk.baseUrls.push(config.baseUrl) - 1;
      return {
        uploadFile: (input) => {
          sdk.started.push(input);
          sdk.startedBy.push(client);
          return {
            uploadSessionId: "ses_1",
            fileId: input.fileId,
            onProgress: () => undefined,
            abort: () => undefined,
            done: async () => {
              sdk.uploads.push(input);
              return { fileId: input.fileId!, versionId: "ver_1" };
            }
          } as ReturnType<FileFnClient["uploadFile"]>;
        },
        uploadArtifact: async () =>
          ({}) as Awaited<ReturnType<FileFnClient["uploadArtifact"]>>,
        deleteFile: async () => undefined,
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

/**
 * The account's DataFn authority: the device's DataFn runs local-only, so a
 * fake of its sync stands in, whose every pull applies the file records.
 */
vi.mock("@nucleum/datafn/datafn.store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nucleum/datafn/datafn.store")>();
  const { derived } = await import("svelte/store");
  const handlers = new Set<(event: never) => void>();
  const emit = (type: string, context: Record<string, unknown>) => {
    for (const handler of handlers) {
      handler({ type, timestampMs: Date.now(), context } as never);
    }
  };
  let pulls = 0;
  const pullNow = async () => {
    const pull = ++pulls;
    emit("sync_started", { phase: "pull" });
    emit("sync_applied", { phase: "pull", cursors: { file: `${pull}` } });
  };
  const datafn = new Proxy(actual.datafn, {
    get(target, key) {
      if (key === "subscribe") {
        return (handler: (event: never) => void) => {
          handlers.add(handler);
          return () => handlers.delete(handler);
        };
      }
      if (key === "sync") return { ...target.sync, pullNow };
      return Reflect.get(target, key);
    }
  });
  const datafnRuntime = derived(actual.datafnRuntime, (runtime) =>
    runtime
      ? {
          ...runtime,
          mode: "sync" as const,
          remoteUrl: "https://account-useast-dev.nucleum.app/datafn"
        }
      : null
  );
  return { ...actual, datafn, datafnRuntime };
});

// Navigation and the native shell's sign-out cleanup are outside this test.
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: vi.fn() }
}));
vi.mock("@nucleum/client/runtime/navigation/navigation-request", () => ({
  goto: vi.fn()
}));
vi.mock("@nucleum/client/runtime/account/session-cleanup", () => ({
  signout: vi.fn(async () => undefined)
}));

const ACCOUNT_QUEUE = "nucleum-file-queue-account-user-a";

/** One device: its file system and storage outlive every page. */
const opfs = createFakeOpfs();
let isOnline = true;
let device = { dapId: "", env: "" };

const userInfo: UserInformation = {
  id: "user:user-a",
  email: "user-a@example.test",
  nickName: "user-a",
  joinDate: new Date(0),
  lastLogin: new Date(0),
  region: "useast"
};

const cloudAccount: UserAccount = {
  dataMode: UserDataMode.CLOUD,
  sessionType: UserSessionType.RETURNING,
  userId: "user-a",
  userInfo
};

const signedOut: UserAccount = {
  dataMode: UserDataMode.NONE,
  sessionType: UserSessionType.UNDETERMINED
};

/** The modules of one page of the app. */
type Page = {
  account: typeof import("@nucleum/client/runtime/account/account.store").default;
  accountSession: typeof import("./account-session").accountSession;
  datafnStore: typeof import("@nucleum/datafn/datafn.store");
};
const pages: Page[] = [];

/**
 * Loads the app's modules afresh: a page after a reload, or another tab. A
 * page loads only the account session and DataFn, as a page that never
 * renders or captures a file does.
 */
async function loadPage(): Promise<Page> {
  vi.resetModules();
  const page: Page = {
    account: (await import("@nucleum/client/runtime/account/account.store"))
      .default,
    accountSession: (await import("./account-session")).accountSession,
    datafnStore: await import("@nucleum/datafn/datafn.store")
  };
  pages.push(page);
  return page;
}

/** Opens the page's DataFn in the namespace of the account (of none: the guest). */
async function openData(page: Page, userId?: string) {
  await page.datafnStore.destroyNucleumDatafn();
  await page.datafnStore.initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId },
    ...device,
    isOffline: true
  });
}

/**
 * Captures a file offline on a page signed in to user-a, then ends the page
 * (its client and listeners go with it), as a reload does. Returns the
 * captured file's id, queued for upload on the device.
 */
async function captureOfflineThenLeave() {
  const page = await loadPage();
  await openData(page, "user-a");
  page.account.set(cloudAccount);
  isOnline = false;
  const { fileUpload } =
    await import("@nucleum/shared-state/files/file-upload");
  const [record] = (await fileUpload.uploadFileV2(
    "text/plain",
    "note.txt",
    new Blob(["note bytes"], { type: "text/plain" })
  )) as { fileId: string }[];
  expect(opfs.list(ACCOUNT_QUEUE)).toEqual([`queued_${record.fileId}`]);
  await leave(page);
  sdk.baseUrls = [];
  return record.fileId;
}

async function leave(page: Page) {
  page.account.set(signedOut);
  await page.datafnStore.destroyNucleumDatafn();
}

/** Stores the session a signed-in cloud account restores after a reload. */
async function storeCloudSession() {
  await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
}

/** Starts a page's session as the app's base layer does, then its DataFn. */
async function startSession(page: Page, userId?: string) {
  await page.accountSession.init();
  await openData(page, userId);
}

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
}

/**
 * Signs user-a in on a page whose session started without a cloud account,
 * as the login page does, and waits until its queue has uploaded.
 */
async function signInAndUpload(page: Page) {
  await openData(page, "user-a");
  page.account.set(cloudAccount);
  await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
}

beforeEach(async () => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubEnv(
    "VITE_ACCOUNT_BASE_URL_TEMPLATE",
    "https://account-{region}-dev.nucleum.app"
  );
  opfs.clear();
  device = {
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`
  };
  isOnline = true;
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    get onLine() {
      return isOnline;
    },
    locks: undefined,
    storage: { getDirectory: opfs.getDirectory }
  });
  URL.createObjectURL ??= () => "";
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:queued");
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  configurePersistenceLogger({ error: vi.fn(), info: vi.fn() });
  sdk.baseUrls = [];
  sdk.started = [];
  sdk.startedBy = [];
  sdk.uploads = [];
  await clientStorage.remove(ClientStorageKey.USER_INFO);
  await clientStorage.remove(ClientStorageKey.OFFLINE_SESSION_ID);
});

afterEach(async () => {
  for (const page of pages.splice(0)) await leave(page);
  await clientStorage.remove(ClientStorageKey.USER_INFO);
  await clientStorage.remove(ClientStorageKey.OFFLINE_SESSION_ID);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account upload replay at session restore", () => {
  it("uploads an offline capture after a reload onto a page without files once the restored session reconnects", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();

    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() =>
      expect(sdk.baseUrls).toEqual([
        "https://account-useast-dev.nucleum.app/files"
      ])
    );
    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.baseUrls).toEqual([
      "https://account-useast-dev.nucleum.app/files"
    ]);
  });

  it("uploads an offline capture once when two tabs restore the session together", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();
    Object.defineProperty(globalThis.navigator, "locks", {
      configurable: true,
      value: createFakeLocks()
    });
    isOnline = true;

    const [first, second] = [await loadPage(), await loadPage()];
    await Promise.all([
      startSession(first, "user-a"),
      startSession(second, "user-a")
    ]);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.started).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it.each([
    { session: "a guest", store: async () => undefined },
    {
      session: "a local-only",
      store: () =>
        clientStorage.set(ClientStorageKey.OFFLINE_SESSION_ID, "local-session")
    }
  ])(
    "does not start an account's upload replay for $session session",
    async ({ store }) => {
      const fileId = await captureOfflineThenLeave();
      await store();

      const page = await loadPage();
      await startSession(page);
      goOnline();
      await vi.dynamicImportSettled();

      expect(page.account.get().dataMode).not.toBe(UserDataMode.CLOUD);
      expect(sdk.baseUrls).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);

      // Only the account's own session, once signed in, creates a client.
      await signInAndUpload(page);
      expect(sdk.baseUrls).toHaveLength(1);
      expect(sdk.started).toEqual([expect.objectContaining({ fileId })]);
    }
  );

  it("stops the account's upload replay on sign-out and starts it again for the next sign-in", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();
    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toHaveLength(1));

    await page.accountSession.signOut({ isPreventRedirect: true });
    // The device's DataFn still holds the account's records, so only the
    // stopped replay keeps the signed-out client from uploading on reconnect.
    await openData(page, "user-a");
    goOnline();
    await vi.dynamicImportSettled();
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);

    await signInAndUpload(page);

    expect(sdk.baseUrls).toHaveLength(2);
    expect(sdk.started).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.startedBy).toEqual([1]);
  });
});
