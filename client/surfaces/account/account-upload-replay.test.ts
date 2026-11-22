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
  uploads: [] as UploadInput[],
  deleted: [] as string[],
  /** The index in `baseUrls` of the client that sent each delete. */
  deletedBy: [] as number[],
  /**
   * When set, each delete is also sent through the real SDK client of its
   * config, so its transport and retries run against the global fetch.
   */
  isRealDelete: false,
  /** How each delete sent through the real SDK settled, by authority. */
  realDeletes: [] as { baseUrl: string; error?: unknown }[]
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
        deleteFile: async (fileId: string) => {
          sdk.deleted.push(fileId);
          sdk.deletedBy.push(client);
          if (!sdk.isRealDelete) return;
          try {
            await actual
              .createFileFnClient({ ...config, offline: { enabled: false } })
              .deleteFile(fileId);
            sdk.realDeletes.push({ baseUrl: config.baseUrl });
          } catch (error) {
            sdk.realDeletes.push({ baseUrl: config.baseUrl, error });
            throw error;
          }
        },
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

/**
 * The session AuthFn returns for the stored credentials (null: none), or the
 * response `respond` returns instead when set; `region`, when set, resolves
 * the session's region instead of resolving none.
 */
const authfn = vi.hoisted(() => ({
  session: null as unknown,
  respond: undefined as (() => Promise<unknown>) | undefined,
  region: undefined as ((options: any) => Promise<void>) | undefined
}));
vi.mock("@authfn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@authfn/client")>();
  return {
    ...actual,
    createAuthFnRegionalClient: (
      options: Parameters<typeof actual.createAuthFnRegionalClient>[0]
    ) =>
      Object.assign(actual.createAuthFnRegionalClient(options), {
        getSession: async () =>
          authfn.respond
            ? authfn.respond()
            : { ok: true, data: { session: authfn.session } },
        resolveRegion: async () =>
          authfn.region ? authfn.region(options) : undefined
      })
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
  const destroyNucleumDatafn = async () => {
    await datafnTeardown.before?.();
    return actual.destroyNucleumDatafn();
  };
  return { ...actual, datafn, datafnRuntime, destroyNucleumDatafn };
});

// Navigation and the native shell's sign-out cleanup are outside this test.
/** How many resolutions of the stored session have returned. */
/**
 * How many session resolutions finished; `failNext`, when set, makes the next
 * one fail before it reads the stored session, and `failNextWhen` makes the
 * next one fail once that promise settles. `probeStorage` is the client
 * storage instance the auth module itself reads and writes.
 */
const auth = vi.hoisted(() => ({
  resolved: 0,
  failNext: false,
  failNextWhen: undefined as Promise<void> | undefined,
  probeStorage: undefined as any
}));
vi.mock("@nucleum/client/runtime/account/auth", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@nucleum/client/runtime/account/auth")
    >();
  auth.probeStorage = (
    await import("@nucleum/persistence/client-storage")
  ).clientStorage;
  return {
    ...actual,
    resolveAuthSession: async (
      ...args: Parameters<typeof actual.resolveAuthSession>
    ) => {
      try {
        const failWhen = auth.failNextWhen;
        auth.failNextWhen = undefined;
        if (failWhen) await failWhen;
        if (auth.failNext || failWhen) {
          auth.failNext = false;
          throw new Error("stored session read failed");
        }
        return await actual.resolveAuthSession(...args);
      } finally {
        auth.resolved += 1;
      }
    }
  };
});

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: vi.fn() }
}));
vi.mock("@nucleum/client/runtime/navigation/navigation-request", () => ({
  goto: vi.fn()
}));
vi.mock("@nucleum/client/runtime/account/session-cleanup", () => ({
  signout: vi.fn(async () => undefined)
}));

/** While `gate` is pending, sign-out's DataFn E2EE cleanup waits for it. */
const cleanupHold = vi.hoisted(() => ({
  gate: undefined as Promise<void> | undefined
}));
/** When set, every DataFn teardown runs it first. */
const datafnTeardown = vi.hoisted(() => ({
  before: undefined as (() => Promise<void>) | undefined
}));
vi.mock("@nucleum/datafn/datafnE2ee.store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nucleum/datafn/datafnE2ee.store")>();
  return {
    ...actual,
    clearCachedDatafnE2eeState: async () => {
      await cleanupHold.gate;
      return actual.clearCachedDatafnE2eeState();
    }
  };
});

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

/** user-a's live AuthFn session. */
const liveSession = {
  id: "session-user-a",
  actorId: "user:user-a",
  primaryEmail: userInfo.email,
  regionId: "useast",
  metadata: { nucleus: { isBootstrapped: true } }
};

const signedOut: UserAccount = {
  dataMode: UserDataMode.NONE,
  sessionType: UserSessionType.UNDETERMINED
};

/** The modules of one page of the app. */
type Page = {
  account: typeof import("@nucleum/client/runtime/account/account.store").default;
  accountSession: typeof import("./account-session").accountSession;
  sessionAccess: typeof import("./session-access");
  uploadReplay: typeof import("./account-upload-replay");
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
    sessionAccess: await import("./session-access"),
    uploadReplay: await import("./account-upload-replay"),
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
  page.uploadReplay.stopUploadReplayForSession();
  page.account.set(signedOut);
  await page.datafnStore.destroyNucleumDatafn();
}

/** Stores the session a signed-in cloud account restores after a reload. */
async function storeCloudSession() {
  await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
}

/**
 * Starts a page as the app does: its base layer seeds the account from
 * storage, its auth guard resolves the stored session, then DataFn opens.
 */
async function startSession(page: Page, userId?: string) {
  await page.accountSession.init();
  await page.sessionAccess.performLoginStatusCheck();
  await openData(page, userId);
}

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
}

/**
 * Signs user-a in online on a page whose session started without a cloud
 * account, as the login page does, runs the auth guard of the page it then
 * opens, and waits until the queue has uploaded.
 */
async function signInAndUpload(page: Page) {
  isOnline = true;
  authfn.session = liveSession;
  await page.accountSession.signInFromAuthFnSession({
    session: liveSession,
    isPreventRedirect: true
  });
  await openData(page, "user-a");
  expect(await page.sessionAccess.performLoginStatusCheck()).toBe(true);
  await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
}

/** Installs fake Web Locks and returns the names of the locks requested. */
function installLocks() {
  const locks = createFakeLocks();
  const request = vi.spyOn(locks, "request");
  Object.defineProperty(globalThis.navigator, "locks", {
    configurable: true,
    value: locks
  });
  return () => request.mock.calls.map(([name]) => name);
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
  sdk.deleted = [];
  sdk.deletedBy = [];
  sdk.isRealDelete = false;
  sdk.realDeletes = [];
  authfn.session = null;
  authfn.respond = undefined;
  authfn.region = undefined;
  auth.resolved = 0;
  auth.failNext = false;
  auth.failNextWhen = undefined;
  await clearStorage();
});

async function clearStorage() {
  for (const key of [
    ClientStorageKey.USER,
    ClientStorageKey.USER_INFO,
    ClientStorageKey.OFFLINE_SESSION_ID,
    ClientStorageKey.AUTHFN_TOKEN,
    ClientStorageKey.OFFLINE_MODE
  ]) {
    await clientStorage.remove(key);
  }
}

afterEach(async () => {
  datafnTeardown.before = undefined;
  cleanupHold.gate = undefined;
  for (const page of pages.splice(0)) await leave(page);
  await clearStorage();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account upload replay at session restore", () => {
  it("uploads an offline capture after a reload onto a page without files once the session restored offline reconnects", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();

    // Offline at startup, the stored session resolves as the cached cloud one.
    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() =>
      expect(sdk.baseUrls).toEqual([
        "https://account-useast-dev.nucleum.app/files"
      ])
    );
    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);

    authfn.session = liveSession;
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.baseUrls).toHaveLength(1);
  });

  it("uploads an offline capture after a reload onto a page without files once the live session is restored online", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();
    isOnline = true;
    authfn.session = liveSession;

    const page = await loadPage();
    await startSession(page, "user-a");

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.baseUrls).toEqual([
      "https://account-useast-dev.nucleum.app/files"
    ]);
  });

  it("uploads an offline capture once when two tabs restore the session together", async () => {
    const fileId = await captureOfflineThenLeave();
    await storeCloudSession();
    installLocks();

    // Both tabs restore offline, each with its own file client, then reconnect.
    const first = await loadPage();
    await startSession(first, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toHaveLength(1));
    const second = await loadPage();
    await startSession(second, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toHaveLength(2));

    authfn.session = liveSession;
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.started).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it.each([
    {
      check: "the app's route check",
      isExpired: async () => {
        const { resolveAuthSession } =
          await import("@nucleum/client/runtime/account/auth");
        return (await resolveAuthSession()).status === "expired";
      }
    },
    {
      check: "the auth guard",
      isExpired: async (page: Page) =>
        !(await page.sessionAccess.performLoginStatusCheck())
    },
    {
      check: "an extension's session check",
      isExpired: (page: Page) => page.accountSession.checkIfSessionExpired()
    }
  ])(
    "does not start an account's upload replay when $check resolves the stored session as expired",
    async ({ isExpired }) => {
      await captureOfflineThenLeave();
      await storeCloudSession();
      const lockNames = installLocks();
      isOnline = true;

      // The base layer seeds the stored identity, then the session resolves.
      const page = await loadPage();
      await page.accountSession.init();
      await openData(page, "user-a");
      expect(await isExpired(page)).toBe(true);
      goOnline();
      await vi.dynamicImportSettled();

      expect(sdk.baseUrls).toEqual([]);
      expect(lockNames()).not.toContainEqual(
        expect.stringContaining("filefn-offline-replay")
      );
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
    }
  );

  const sessionChecks = [
    {
      order: "a sheet's order (seed, then check)",
      start: async (page: Page) => {
        await page.accountSession.init();
        return page.accountSession.checkIfSessionExpired();
      }
    },
    {
      order: "an extension's order (check, then seed)",
      start: async (page: Page) => {
        const isExpired = await page.accountSession.checkIfSessionExpired();
        await page.accountSession.init();
        return isExpired;
      }
    }
  ];

  it.each(sessionChecks)(
    "does not replay the stored account's queue under another user's live session in $order",
    async ({ start }) => {
      await captureOfflineThenLeave();
      await storeCloudSession();
      const lockNames = installLocks();
      isOnline = true;
      authfn.session = {
        ...liveSession,
        id: "session-user-b",
        actorId: "user:user-b",
        primaryEmail: "user-b@example.test"
      };

      const page = await loadPage();
      expect(await start(page)).toBe(false);
      await openData(page, "user-a");
      goOnline();
      await vi.dynamicImportSettled();

      expect(page.account.get().userId).toBe("user-a");
      expect(sdk.baseUrls).toEqual([]);
      expect(lockNames()).not.toContainEqual(
        expect.stringContaining("filefn-offline-replay")
      );
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
    }
  );

  it.each(sessionChecks)(
    "replays the stored account's queue under its own live session in $order",
    async ({ start }) => {
      const fileId = await captureOfflineThenLeave();
      await storeCloudSession();
      isOnline = true;
      authfn.session = liveSession;

      const page = await loadPage();
      expect(await start(page)).toBe(false);
      await openData(page, "user-a");

      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(sdk.baseUrls).toEqual([
        "https://account-useast-dev.nucleum.app/files"
      ]);
    }
  );

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
      isOnline = true;

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

describe("account upload replay authorization", () => {
  const USEAST_FILES = "https://account-useast-dev.nucleum.app/files";
  const PENDING_DELETE = "pending-delete-file";
  const PENDING_DELETES = [
    "filefn-pending-deletes-user-a",
    encodeURIComponent(USEAST_FILES)
  ];
  const userB = {
    ...liveSession,
    id: "session-user-b",
    actorId: "user:user-b",
    primaryEmail: "user-b@example.test"
  };
  const revokingSessions = [
    {
      resolves: "another user's live session",
      session: () => userB,
      isExpired: false
    },
    { resolves: "an expired session", session: () => null, isExpired: true }
  ];

  async function recordPendingDelete() {
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.recordFileFnPendingDelete(
      { userId: "user-a", baseUrl: USEAST_FILES },
      PENDING_DELETE
    );
  }

  /**
   * Restores user-a's session offline after an offline capture and a pending
   * delete, so the stored account's client is bound but sends nothing yet.
   */
  async function restoreOffline() {
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST_FILES]));
    expect(sdk.started).toEqual([]);
    return { page, fileId };
  }

  /**
   * Confirms user-a's live session through the auth guard, then waits until
   * user-a's queued upload and pending delete are sent, and returns the
   * clients that sent them.
   */
  async function confirmUserA(page: Page, fileId?: string) {
    authfn.session = liveSession;
    expect(await page.sessionAccess.performLoginStatusCheck()).toBe(true);
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(opfs.list(...PENDING_DELETES)).toEqual([]);
    if (fileId) {
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      expect(sdk.started).toEqual([expect.objectContaining({ fileId })]);
    }
    return { startedBy: sdk.startedBy, deletedBy: sdk.deletedBy };
  }

  it.each(revokingSessions)(
    "keeps the restored account's queue and pending delete when the extension's session check resolves $resolves",
    async ({ session, isExpired }) => {
      const { page, fileId } = await restoreOffline();
      authfn.session = session();
      isOnline = true;

      expect(await page.accountSession.checkIfSessionExpired()).toBe(isExpired);
      await vi.dynamicImportSettled();
      goOnline();

      expect(page.account.get().userId).toBe("user-a");
      expect(await confirmUserA(page, fileId)).toEqual({
        startedBy: [1],
        deletedBy: [1]
      });
    }
  );

  it("keeps the restored account's queue and pending delete when another user's live session resolves on reconnect", async () => {
    const { page, fileId } = await restoreOffline();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    authfn.session = userB;

    goOnline();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );

    expect(page.account.get().userId).toBe("user-a");
    expect(await confirmUserA(page, fileId)).toEqual({
      startedBy: [1],
      deletedBy: [1]
    });
  });

  it("uploads and sends the pending delete when the restored account's live session resolves on reconnect", async () => {
    const { fileId } = await restoreOffline();
    authfn.session = liveSession;

    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.baseUrls).toEqual([USEAST_FILES]);
  });

  it.each(revokingSessions)(
    "stops sending for the account it replayed once the extension's session check resolves $resolves",
    async ({ session, isExpired }) => {
      await captureOfflineThenLeave();
      await storeCloudSession();
      isOnline = true;
      authfn.session = liveSession;
      const page = await loadPage();
      await startSession(page, "user-a");
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));

      authfn.session = session();
      expect(await page.accountSession.checkIfSessionExpired()).toBe(isExpired);
      await vi.dynamicImportSettled();
      await recordPendingDelete();
      goOnline();

      expect(await confirmUserA(page)).toEqual({
        startedBy: [0],
        deletedBy: [1]
      });
    }
  );

  it("does not bind the stored account's region when the live session names another", async () => {
    await captureOfflineThenLeave();
    await storeCloudSession();
    isOnline = true;
    authfn.session = { ...liveSession, regionId: "euwest" };

    const page = await loadPage();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    await page.accountSession.init();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await openData(page, "user-a");
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );

    expect(sdk.baseUrls).not.toContain(USEAST_FILES);
    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  });

  /** Holds every AuthFn response until the test answers it. */
  function holdAuthFnResponses() {
    const held: ((session: unknown) => void)[] = [];
    authfn.respond = () =>
      new Promise((resolve) =>
        held.push((session) => resolve({ ok: true, data: { session } }))
      );
    return held;
  }

  async function expectNothingSent() {
    await vi.dynamicImportSettled();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  }

  it("applies only the latest reconnect's session when an earlier one resolves later", async () => {
    const { page, fileId } = await restoreOffline();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    const held = holdAuthFnResponses();

    goOnline();
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(2));
    held[0](liveSession);
    await vi.waitFor(() => expect(auth.resolved).toBeGreaterThan(1));
    held[1](userB);
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );
    await expectNothingSent();

    authfn.respond = undefined;
    expect(await confirmUserA(page, fileId)).toEqual({
      startedBy: [1],
      deletedBy: [1]
    });
  });

  it("requires the live session after a file operation while no cloud account was signed in", async () => {
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    const page = await loadPage();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    expect(await files.getFileFnClient()).toBeNull();
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST_FILES]));
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    authfn.session = userB;

    goOnline();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );
    await expectNothingSent();

    expect(await confirmUserA(page, fileId)).toEqual({
      startedBy: [1],
      deletedBy: [1]
    });
  });

  it("uploads when the live session names the stored region in another letter case", async () => {
    const fileId = await captureOfflineThenLeave();
    await clientStorage.set(ClientStorageKey.USER_INFO, {
      ...userInfo,
      region: "UsEast"
    });
    isOnline = true;
    authfn.session = liveSession;

    const page = await loadPage();
    await page.accountSession.init();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await openData(page, "user-a");

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.baseUrls).toEqual([USEAST_FILES]);
  });

  it("uploads once the app's offline mode ends while the network stays up", async () => {
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    await clientStorage.set(ClientStorageKey.OFFLINE_MODE, "true");
    isOnline = true;
    const page = await loadPage();
    const context = (await import("@nucleum/client/runtime/context.store"))
      .default;
    context.update((value) => ({ ...value, isInOfflineMode: true }));
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST_FILES]));
    await expectNothingSent();
    authfn.session = liveSession;

    await context.toggleOfflineMode(false);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("resolves the session again after a transient AuthFn failure while online", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    isOnline = true;
    authfn.respond = async () => ({
      ok: false,
      error: { code: "AUTHFN_NETWORK_ERROR", retryable: true }
    });
    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST_FILES]));
    await expectNothingSent();
    authfn.respond = undefined;
    authfn.session = liveSession;

    await vi.advanceTimersByTimeAsync(5_000);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("drops a reconnect's session that resolves after sign-out", async () => {
    const { page } = await restoreOffline();
    const held = holdAuthFnResponses();
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    const resolved = auth.resolved;

    await page.accountSession.signOut({ isPreventRedirect: true });
    held[0](liveSession);
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));

    expect(await clientStorage.get(ClientStorageKey.USER)).toBeFalsy();
    await expectNothingSent();
  });

  it("keeps the stored session when an earlier reconnect's expired session resolves after a newer one started", async () => {
    const { fileId } = await restoreOffline();
    const held = holdAuthFnResponses();
    goOnline();
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(2));
    const resolved = auth.resolved;

    held[0](null);
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    expect(await clientStorage.get(ClientStorageKey.USER_INFO)).toBeTruthy();
    held[1](liveSession);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(await clientStorage.get(ClientStorageKey.USER_INFO)).toBeTruthy();
  });

  it("uploads when the network returned while the restored session was being resolved", async () => {
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    const page = await loadPage();
    await page.accountSession.init();
    const { resolveAuthSession } =
      await import("@nucleum/client/runtime/account/auth");
    const resolution = await resolveAuthSession();
    expect(resolution.status).toBe("cached-cloud");
    await openData(page, "user-a");
    isOnline = true;
    authfn.session = liveSession;

    page.uploadReplay.startUploadReplayForSession(resolution);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });
});

describe("replay authorization across the session lifetime", () => {
  const USEAST_FILES = "https://account-useast-dev.nucleum.app/files";
  const EUWEST_FILES = "https://account-euwest-dev.nucleum.app/files";
  const PENDING_DELETE = "pending-delete-file";
  const userB = {
    ...liveSession,
    id: "session-user-b",
    actorId: "user:user-b",
    primaryEmail: "user-b@example.test"
  };

  async function recordPendingDelete(baseUrl = USEAST_FILES) {
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.recordFileFnPendingDelete(
      { userId: "user-a", baseUrl },
      PENDING_DELETE
    );
  }

  async function restoreOffline() {
    const fileId = await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    const page = await loadPage();
    await startSession(page, "user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST_FILES]));
    expect(sdk.started).toEqual([]);
    return { page, fileId };
  }

  function holdAuthFnResponses() {
    const held: ((session: unknown) => void)[] = [];
    authfn.respond = () =>
      new Promise((resolve) =>
        held.push((session) => resolve({ ok: true, data: { session } }))
      );
    return held;
  }

  async function settle() {
    await vi.dynamicImportSettled();
    await vi.dynamicImportSettled();
  }

  /**
   * Goes online and returns whether that started a pending-delete drain: a
   * drain opens the device storage synchronously from the online event.
   */
  function goOnlineStartsDrain() {
    const open = vi.spyOn(navigator.storage, "getDirectory");
    goOnline();
    const isStarted = open.mock.calls.length > 0;
    open.mockRestore();
    return isStarted;
  }

  it("does not let a file lookup authorize the replay of an account another user's live session contradicted", async () => {
    await restoreOffline();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    authfn.session = userB;
    goOnline();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await settle();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  });

  it("does not carry a file operation's authorization past sign-out into the same user's next cached restore", async () => {
    await storeCloudSession();
    isOnline = false;
    const page = await loadPage();
    await startSession(page, "user-a");
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    await recordPendingDelete();
    await storeCloudSession();
    await page.accountSession.init();
    await page.sessionAccess.performLoginStatusCheck();
    await settle();
    expect(sdk.deleted).toEqual([]);
  });

  it("drains pending deletes only at the authority the live session confirmed", async () => {
    await restoreOffline();
    await recordPendingDelete(EUWEST_FILES);
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await settle();
    expect(sdk.deleted.filter((id) => id === PENDING_DELETE)).toHaveLength(1);
  });

  it("starts no replay from an auth guard session that resolves after sign-out", async () => {
    await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    isOnline = true;
    const held = holdAuthFnResponses();
    const page = await loadPage();
    await page.accountSession.init();
    const check = page.sessionAccess.performLoginStatusCheck();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await page.accountSession.signOut({ isPreventRedirect: true });
    held[0](liveSession);
    await check.catch(() => undefined);
    await settle();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  });

  it("stores no region or session from a recheck whose region lookup finishes after sign-out", async () => {
    await restoreOffline();
    await clientStorage.remove(ClientStorageKey.REGION);
    const heldRegion: (() => void)[] = [];
    authfn.region = (options) =>
      new Promise<void>((resolve) =>
        heldRegion.push(() => {
          Promise.resolve(
            options.onRegionChanged?.({
              fromRegionId: "useast",
              toRegionId: "euwest"
            })
          ).then(() => resolve());
        })
      );
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(heldRegion).toHaveLength(1));
    const resolved = auth.resolved;
    await signOutLatestPage();
    heldRegion[0]();
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    await settle();
    expect(await clientStorage.get(ClientStorageKey.REGION)).toBeFalsy();
    expect(await clientStorage.get(ClientStorageKey.USER)).toBeFalsy();

    async function signOutLatestPage() {
      await pages[pages.length - 1].accountSession.signOut({
        isPreventRedirect: true
      });
    }
  });

  it("still stores regions through the shared AuthFn client after a recheck settles", async () => {
    await restoreOffline();
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    authfn.region = (options) =>
      Promise.resolve(
        options.onRegionChanged?.({
          fromRegionId: "useast",
          toRegionId: "euwest"
        })
      );
    const { authClient } = await import("@nucleum/client/runtime/account/auth");
    await (await authClient()).resolveRegion({ identifier: userInfo.email });
    expect(await clientStorage.get(ClientStorageKey.REGION)).toBe("euwest");
  });

  it("keeps retrying an unavailable recheck while online until the live session confirms the account", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const { fileId } = await restoreOffline();
    authfn.respond = async () => ({
      ok: false,
      error: { code: "AUTHFN_SERVER_ERROR", retryable: false }
    });
    const resolved = auth.resolved;
    goOnline();
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    await vi.dynamicImportSettled();
    expect(sdk.started).toEqual([]);
    authfn.respond = undefined;
    authfn.session = liveSession;
    await vi.advanceTimersByTimeAsync(300_000);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]), {
      timeout: 3_000
    });
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  function holdCleanup() {
    let release: () => void = () => undefined;
    cleanupHold.gate = new Promise<void>((resolve) => {
      release = () => {
        cleanupHold.gate = undefined;
        resolve();
      };
    });
    return () => release();
  }

  it("does not restart a contradicted account's replay from a file lookup while sign-out cleanup is pending", async () => {
    const { page } = await restoreOffline();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    authfn.session = userB;
    goOnline();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await settle();
    try {
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
    } finally {
      release();
      await signingOut;
    }
  });

  it("sends nothing for the ending session from a file lookup while sign-out cleanup is pending", async () => {
    const { page } = await restoreOffline();
    isOnline = true;
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await settle();
    try {
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
    } finally {
      release();
      await signingOut;
    }
  });

  it("sends nothing for the stored account from a file lookup during sign-out cleanup after an unavailable recheck", async () => {
    const { page } = await restoreOffline();
    authfn.respond = async () => ({
      ok: false,
      error: { code: "AUTHFN_SERVER_ERROR", retryable: false }
    });
    const resolved = auth.resolved;
    goOnline();
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    await settle();
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await settle();
    try {
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
    } finally {
      release();
      await signingOut;
    }
  });

  it("tears the ending session's client down before sign-out destroys DataFn", async () => {
    const { page } = await restoreOffline();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    const ending = await files.getFileFnClient();
    let atTeardown: unknown;
    datafnTeardown.before = async () => {
      datafnTeardown.before = undefined;
      atTeardown = await files.getFileFnClient();
    };
    await page.accountSession.signOut({ isPreventRedirect: true });
    expect(ending).not.toBeNull();
    expect(atTeardown).not.toBe(ending);
  });

  it("drains the queue and the pending delete once when a live session confirms the account after sign-out", async () => {
    const { page, fileId } = await restoreOffline();
    isOnline = true;
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    release();
    await signingOut;
    await settle();
    expect(sdk.deleted).toEqual([]);

    await signInAndUpload(page);
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("drains a pending delete that a file operation made eligible at another authority without a reconnect", async () => {
    await restoreOffline();
    await recordPendingDelete(EUWEST_FILES);
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await settle();
    expect(sdk.deleted.filter((id) => id === PENDING_DELETE)).toHaveLength(1);
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await vi.waitFor(() =>
      expect(sdk.deleted.filter((id) => id === PENDING_DELETE)).toHaveLength(2)
    );
  });

  async function expectNothingSent() {
    await settle();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  }

  it("does not restart the ending session's replay from a session check during sign-out cleanup", async () => {
    const { page } = await restoreOffline();
    isOnline = true;
    authfn.session = liveSession;
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    await page.accountSession.checkIfSessionExpired();
    try {
      await expectNothingSent();
    } finally {
      release();
      await signingOut;
    }
  });

  it("drains once for a live sign-in after a sign-out whose cleanup saw a session check", async () => {
    const { page, fileId } = await restoreOffline();
    isOnline = true;
    authfn.session = liveSession;
    const release = holdCleanup();
    const signingOut = page.accountSession.signOut({ isPreventRedirect: true });
    await settle();
    await page.accountSession.checkIfSessionExpired();
    release();
    await signingOut;
    await settle();
    expect(sdk.deleted).toEqual([]);

    await signInAndUpload(page);
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("keeps an account published after another user's live session contradicted after an unavailable check", async () => {
    await captureOfflineThenLeave();
    await recordPendingDelete();
    isOnline = true;
    const page = await loadPage();
    await page.accountSession.init();
    const { logger } = await import("@nucleum/client/runtime/logging/logger");
    const warn = vi.spyOn(logger, "warn");
    authfn.session = userB;
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    page.account.set(cloudAccount);
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({
        at: "filefn.uploadReplay.start.accountMismatch"
      })
    );
    authfn.respond = async () => {
      throw new Error("authfn unavailable");
    };
    await page.accountSession.checkIfSessionExpired();
    await settle();
    authfn.respond = undefined;
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    await expectNothingSent();
  });

  it("keeps a file lookup's account contradicted by another user's live session after an unavailable check", async () => {
    await captureOfflineThenLeave();
    await recordPendingDelete();
    isOnline = true;
    const page = await loadPage();
    await page.accountSession.init();
    authfn.session = userB;
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    page.account.set({ ...cloudAccount, userId: "user-b" });
    await settle();
    page.account.set(cloudAccount);
    const files = await import("@nucleum/shared-state/files/filefn-client");
    await files.getFileFnClient();
    authfn.respond = async () => {
      throw new Error("authfn unavailable");
    };
    await page.accountSession.checkIfSessionExpired();
    await settle();
    authfn.respond = undefined;
    await files.getFileFnClient();
    await expectNothingSent();
  });

  it("sends nothing on reconnect after a cached-cloud result until the session is confirmed again", async () => {
    const { page } = await restoreOffline();
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    isOnline = false;
    await recordPendingDelete();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    const held = holdAuthFnResponses();
    expect(goOnlineStartsDrain()).toBe(false);
    await settle();
    try {
      expect(sdk.deleted).toEqual([PENDING_DELETE]);
    } finally {
      for (const answer of held) answer(null);
    }
  });

  it("sends a pending delete recorded after a cached-cloud result once when the held recheck confirms the account", async () => {
    const { page } = await restoreOffline();
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    isOnline = false;
    await recordPendingDelete();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    const held = holdAuthFnResponses();
    expect(goOnlineStartsDrain()).toBe(false);
    await vi.waitFor(() => expect(held.length).toBeGreaterThan(0));
    await settle();
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
    for (const answer of held) answer(liveSession);
    await vi.waitFor(() =>
      expect(sdk.deleted).toEqual([PENDING_DELETE, PENDING_DELETE])
    );
    await settle();
    expect(sdk.deleted).toHaveLength(2);
  });

  it("does not let an older foreground check restart the replay a newer one stopped", async () => {
    const { page } = await restoreOffline();
    isOnline = true;
    const held = holdAuthFnResponses();
    const older = page.accountSession.checkIfSessionExpired();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    const newer = page.accountSession.checkIfSessionExpired();
    await vi.waitFor(() => expect(held).toHaveLength(2));
    held[1](null);
    expect(await newer).toBe(true);
    await settle();
    held[0](liveSession);
    await older;
    await expectNothingSent();
  });

  it("returns true from two concurrent auth guards that resolve the live session and drains once", async () => {
    const { page, fileId } = await restoreOffline();
    isOnline = true;
    const held = holdAuthFnResponses();
    const first = page.sessionAccess.performLoginStatusCheck();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    const second = page.sessionAccess.performLoginStatusCheck();
    await vi.waitFor(() => expect(held).toHaveLength(2));
    held[1](liveSession);
    held[0](liveSession);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("resolves signed out when the region lookup fails after the signal aborted", async () => {
    await storeCloudSession();
    isOnline = true;
    authfn.session = liveSession;
    let fail: ((error: Error) => void) | undefined;
    authfn.region = () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      });
    const controller = new AbortController();
    const { resolveAuthSession } =
      await import("@nucleum/client/runtime/account/auth");
    const pending = resolveAuthSession({ signal: controller.signal });
    await vi.waitFor(() => expect(fail).toBeDefined());
    controller.abort();
    fail!(new Error("region lookup failed"));
    expect((await pending).status).toBe("signed-out");
  });

  async function liveThenOfflineWithPendingDelete() {
    const { page, fileId } = await restoreOffline();
    authfn.session = liveSession;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    isOnline = false;
    await recordPendingDelete();
    return { page, fileId };
  }

  /**
   * Runs `react` once, as soon as the session recheck listens for a
   * reconnect, before the files runtime could apply a deferred result.
   */
  function whenRecheckListens(react: () => void) {
    const add = window.addEventListener.bind(window);
    const fired = { value: false };
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: any, options?: any) => {
        add(type, listener, options);
        if (type === "online" && !fired.value) {
          fired.value = true;
          react();
        }
      }
    );
    return fired;
  }

  function goOnlineWhenRecheckListens() {
    return whenRecheckListens(() => queueMicrotask(() => goOnline()));
  }

  /**
   * Holds the stored-region read of the account state's bind (see the files
   * runtime's bindToStoredRegion) until `release` is called.
   */
  async function holdStoredRegionBind() {
    const { clientStorage: storage } =
      await import("@nucleum/persistence/client-storage");
    const get = storage.get.bind(storage);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const bind = { isHeld: false, release: () => release() };
    vi.spyOn(storage, "get").mockImplementation(((key: any) => {
      if (
        key === ClientStorageKey.REGION &&
        new Error().stack?.includes("bindToStoredRegion")
      ) {
        bind.isHeld = true;
        return gate.then(() => get(key));
      }
      return get(key);
    }) as any);
    return bind;
  }

  async function restoreRegionlessAccountWithHeldBind() {
    await captureOfflineThenLeave();
    await clientStorage.set(ClientStorageKey.USER_INFO, {
      ...userInfo,
      region: undefined
    });
    isOnline = false;
    const page = await loadPage();
    const bind = await holdStoredRegionBind();
    await page.accountSession.init();
    page.account.set({
      ...cloudAccount,
      userInfo: { ...userInfo, region: undefined }
    });
    await page.sessionAccess.performLoginStatusCheck();
    await vi.waitFor(() => expect(bind.isHeld).toBe(true));
    isOnline = true;
    authfn.session = userB;
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    bind.release();
    await settle();
    return page;
  }

  function failReconnectRecheck() {
    const held: (() => void)[] = [];
    authfn.respond = () =>
      new Promise((resolve) =>
        held.push(() =>
          resolve({
            ok: false,
            error: { code: "AUTHFN_SERVER_ERROR", retryable: false }
          })
        )
      );
    return held;
  }

  async function restoreWithRecheckFailingBehindRejectedCheck() {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const { page, fileId } = await restoreOffline();
    const held = failReconnectRecheck();
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    auth.failNext = true;
    await expect(page.accountSession.checkIfSessionExpired()).rejects.toThrow();
    held[0]();
    await settle();
    return { page, fileId };
  }

  it("ends the previous live approval before a reconnect during a cached-cloud result can send a pending delete", async () => {
    const { page } = await liveThenOfflineWithPendingDelete();
    const held = holdAuthFnResponses();
    const fired = goOnlineWhenRecheckListens();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    try {
      expect(fired.value).toBe(true);
      expect(sdk.deleted).toEqual([PENDING_DELETE]);
    } finally {
      for (const answer of held) answer(null);
    }
  });

  it("starts no drain from a reconnect at the moment a cached-cloud result's recheck listens", async () => {
    const { page } = await liveThenOfflineWithPendingDelete();
    const held = holdAuthFnResponses();
    const drains: boolean[] = [];
    whenRecheckListens(() => drains.push(goOnlineStartsDrain()));
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await settle();
    try {
      expect(drains).toEqual([false]);
      expect(sdk.deleted).toEqual([PENDING_DELETE]);
    } finally {
      for (const answer of held) answer(null);
    }
  });

  it("sends the pending delete once when the reconnect during a cached-cloud result confirms the account", async () => {
    const { page } = await liveThenOfflineWithPendingDelete();
    const held = holdAuthFnResponses();
    const fired = goOnlineWhenRecheckListens();
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await vi.waitFor(() => expect(held.length).toBeGreaterThan(0));
    await settle();
    expect(fired.value).toBe(true);
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
    for (const answer of held) answer(liveSession);
    await vi.waitFor(() =>
      expect(sdk.deleted).toEqual([PENDING_DELETE, PENDING_DELETE])
    );
    await settle();
    expect(sdk.deleted).toHaveLength(2);
  });

  it("creates no client from a cached account's pending stored-region bind after another user's live session", async () => {
    await restoreRegionlessAccountWithHeldBind();
    expect(sdk.baseUrls).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
  });

  it("creates the cached account's client and drains once when its live session confirms it after another user's", async () => {
    const page = await restoreRegionlessAccountWithHeldBind();
    await openData(page, "user-a");
    await recordPendingDelete(USEAST_FILES);
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    expect(sdk.baseUrls).toEqual([]);
    authfn.session = liveSession;
    expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
  });

  it("keeps the bounded retry when a newer session check fails before it applies", async () => {
    const { fileId } = await restoreWithRecheckFailingBehindRejectedCheck();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    authfn.respond = undefined;
    authfn.session = liveSession;
    await vi.advanceTimersByTimeAsync(300_000);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]), {
      timeout: 3_000
    });
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
  });

  it("drains through the bounded retry after an unavailable reconnect recheck", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const { fileId } = await restoreOffline();
    const held = failReconnectRecheck();
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    held[0]();
    await settle();
    authfn.respond = undefined;
    authfn.session = liveSession;
    await vi.advanceTimersByTimeAsync(300_000);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]), {
      timeout: 3_000
    });
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("cancels the bounded retry kept after a failed newer check on sign-out", async () => {
    const { page } = await restoreWithRecheckFailingBehindRejectedCheck();
    await page.accountSession.signOut({ isPreventRedirect: true });
    const resolved = auth.resolved;
    authfn.respond = undefined;
    authfn.session = liveSession;
    await vi.advanceTimersByTimeAsync(300_000);
    await settle();
    expect(auth.resolved).toBe(resolved);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  async function startCheckThenReconnect() {
    const { page, fileId } = await restoreOffline();
    const held = holdAuthFnResponses();
    isOnline = true;
    const older = page.accountSession.checkIfSessionExpired();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    goOnline();
    await vi.waitFor(() => expect(held).toHaveLength(2));
    return { older, held, fileId };
  }

  it("keeps a pending reconnect's live result when an older check's expired result returns first", async () => {
    const { older, held, fileId } = await startCheckThenReconnect();
    held[0](null);
    await older;
    await settle();
    held[1](liveSession);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    await settle();
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(sdk.deleted).toEqual([PENDING_DELETE]);
  });

  it("grants no replay from an older check's live result while a newer reconnect is pending", async () => {
    const { older, held } = await startCheckThenReconnect();
    held[0](liveSession);
    expect(await older).toBe(false);
    await settle();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    held[1](userB);
    await settle();
    await expectNothingSent();
  });

  it("applies an older check's live result at once when the newer reconnect failed without a result", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const { page, fileId } = await restoreOffline();
    const held = holdAuthFnResponses();
    isOnline = true;
    const older = page.accountSession.checkIfSessionExpired();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    const resolved = auth.resolved;
    auth.failNext = true;
    goOnline();
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    held[0](liveSession);
    expect(await older).toBe(false);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
    expect(held).toHaveLength(1);
  });

  it("applies an older auth guard's live result when a newer check failed before it returned", async () => {
    const { page, fileId } = await restoreOffline();
    const held = holdAuthFnResponses();
    isOnline = true;
    const older = page.sessionAccess.performLoginStatusCheck();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    auth.failNext = true;
    await expect(page.accountSession.checkIfSessionExpired()).rejects.toThrow();
    held[0](liveSession);
    expect(await older).toBe(true);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  /**
   * Restores user-a's stored session online on a new page whose files runtime
   * loads only once `loaded` is called, with the queued capture and a pending
   * delete, and returns the auth guard's live result held in that load.
   */
  async function restoreLiveWhileFilesLoad() {
    await captureOfflineThenLeave();
    await recordPendingDelete();
    await storeCloudSession();
    let loaded: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (loaded = resolve));
    vi.doMock(
      "@nucleum/shared-state/files/filefn-client",
      async (importOriginal) => {
        await gate;
        return importOriginal();
      }
    );
    const page = await loadPage();
    await page.accountSession.init();
    isOnline = true;
    authfn.session = liveSession;
    expect(await page.sessionAccess.performLoginStatusCheck()).toBe(true);
    return { page, loaded };
  }

  it("grants no replay from a result held in the files runtime load while a newer check is pending", async () => {
    const { page, loaded } = await restoreLiveWhileFilesLoad();
    try {
      const held = holdAuthFnResponses();
      const newer = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      loaded();
      await settle();
      expect(sdk.baseUrls).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      held[0](userB);
      expect(await newer).toBe(false);
      await expectNothingSent();
    } finally {
      vi.doUnmock("@nucleum/shared-state/files/filefn-client");
    }
  });

  it("lets the newest of the results waiting for the files runtime load decide the replay", async () => {
    const { page, loaded } = await restoreLiveWhileFilesLoad();
    try {
      const held = holdAuthFnResponses();
      const older = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      const newer = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(held).toHaveLength(2));
      held[0](liveSession);
      expect(await older).toBe(false);
      held[1](userB);
      expect(await newer).toBe(false);
      loaded();
      await settle();
      expect(sdk.baseUrls).toEqual([]);
      await expectNothingSent();
    } finally {
      vi.doUnmock("@nucleum/shared-state/files/filefn-client");
    }
  });

  it("applies a result held in the files runtime load once the newer check fails", async () => {
    const { page, loaded } = await restoreLiveWhileFilesLoad();
    try {
      auth.failNext = true;
      await expect(
        page.accountSession.checkIfSessionExpired()
      ).rejects.toThrow();
      loaded();
      await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
      expect(sdk.baseUrls).toEqual([USEAST_FILES]);
    } finally {
      vi.doUnmock("@nucleum/shared-state/files/filefn-client");
    }
  });

  it("applies an older check's result held for a newer check that then fails", async () => {
    const { page, fileId } = await restoreOffline();
    const held = holdAuthFnResponses();
    isOnline = true;
    const older = page.accountSession.checkIfSessionExpired();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    let fail: () => void = () => undefined;
    auth.failNextWhen = new Promise<void>((resolve) => (fail = resolve));
    const newer = page.accountSession.checkIfSessionExpired();
    held[0](liveSession);
    expect(await older).toBe(false);
    await settle();
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    fail();
    await expect(newer).rejects.toThrow();
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  it("keeps the bounded retry when a reconnect's own session resolution fails", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: true
    });
    const { fileId } = await restoreOffline();
    const resolved = auth.resolved;
    auth.failNext = true;
    goOnline();
    await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
    await settle();
    expect(sdk.started).toEqual([]);
    authfn.session = liveSession;
    await vi.advanceTimersByTimeAsync(300_000);
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]), {
      timeout: 3_000
    });
    expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
  });

  describe("authorization when the replay sends and superseded rechecks", () => {
    /**
     * Wraps a device storage directory so `hold.isListed` turns true once a
     * directory opened through it has listed all its entries.
     */
    function signalWhenListed<T extends object>(
      dir: T,
      hold: { isListed: boolean }
    ): T {
      return new Proxy(dir, {
        get(target, prop) {
          const value = Reflect.get(target, prop) as unknown;
          if (typeof value !== "function") return value;
          if (prop === "getDirectoryHandle") {
            return async (...args: unknown[]) =>
              signalWhenListed(
                (await value.apply(target, args)) as object,
                hold
              );
          }
          if (prop === "keys") {
            return async function* () {
              yield* value.call(target) as AsyncIterable<string>;
              hold.isListed = true;
            };
          }
          return value.bind(target);
        }
      });
    }

    /**
     * Holds the `nth` (1-based) device storage open made by a pending-delete
     * send pass (replayPendingDeletes), after its authority was checked;
     * `isListed` turns true once the released pass has listed its deletes,
     * right before it decides whether to send them.
     */
    function holdNthPendingDeleteSend(nth: number) {
      const open = navigator.storage.getDirectory.bind(navigator.storage);
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const hold = { isHeld: false, isListed: false, release: () => release() };
      let seen = 0;
      vi.spyOn(navigator.storage, "getDirectory").mockImplementation(() => {
        if (new Error().stack?.includes("replayPendingDeletes")) {
          seen += 1;
          if (seen === nth) {
            hold.isHeld = true;
            return gate.then(() => open()).then((root) =>
              signalWhenListed(root, hold)
            );
          }
        }
        return open();
      });
      return hold;
    }

    /**
     * Holds a region-less live session's drain at its euwest send pass, then
     * narrows the authorization with a live session at useast and releases it.
     */
    async function narrowAuthorizationDuringDrain() {
      const { page } = await restoreOffline();
      await recordPendingDelete(EUWEST_FILES);
      const hold = holdNthPendingDeleteSend(2);
      authfn.session = { ...liveSession, regionId: undefined };
      goOnline();
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      expect(sdk.deleted).toEqual([PENDING_DELETE]);
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([USEAST_FILES]);
      authfn.session = liveSession;
      expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
      hold.release();
      await vi.waitFor(() => expect(hold.isListed).toBe(true));
      await settle();
      return page;
    }

    it("sends no pending delete at an authority a live session stopped authorizing during the drain", async () => {
      await narrowAuthorizationDuringDrain();
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([USEAST_FILES]);
      expect(sdk.baseUrls).not.toContain(EUWEST_FILES);
    });

    it("sends the refused authority's pending delete once when a file operation later authorizes it", async () => {
      await narrowAuthorizationDuringDrain();
      const files = await import("@nucleum/shared-state/files/filefn-client");
      await files.getFileFnClient();
      await vi.waitFor(() =>
        expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([
          USEAST_FILES,
          EUWEST_FILES
        ])
      );
      await settle();
      expect(sdk.deleted).toEqual([PENDING_DELETE, PENDING_DELETE]);
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([
        USEAST_FILES,
        EUWEST_FILES
      ]);
    });

    async function restoreRegionlessHeld() {
      await captureOfflineThenLeave();
      await clientStorage.set(ClientStorageKey.USER_INFO, {
        ...userInfo,
        region: undefined
      });
      isOnline = false;
      const page = await loadPage();
      const bind = await holdStoredRegionBind();
      await page.accountSession.init();
      page.account.set({
        ...cloudAccount,
        userInfo: { ...userInfo, region: undefined }
      });
      await page.sessionAccess.performLoginStatusCheck();
      await vi.waitFor(() => expect(bind.isHeld).toBe(true));
      return { page, bind };
    }

    it("creates no client from a restore's pending stored-region bind after the session expired", async () => {
      const { page, bind } = await restoreRegionlessHeld();
      isOnline = true;
      authfn.session = null;
      expect(await page.accountSession.checkIfSessionExpired()).toBe(true);
      await settle();
      bind.release();
      await settle();
      expect(sdk.baseUrls).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    });

    it("completes a file operation's pending stored-region bind after the session expired", async () => {
      const { page, bind } = await restoreRegionlessHeld();
      const files = await import("@nucleum/shared-state/files/filefn-client");
      const client = files.getFileFnClient();
      isOnline = true;
      authfn.session = null;
      expect(await page.accountSession.checkIfSessionExpired()).toBe(true);
      bind.release();
      expect(await client).not.toBeNull();
      expect(sdk.baseUrls).toHaveLength(1);
    });

    /**
     * Contradicts user-a with user-b's live session, then publishes user-a in
     * the account state again and runs a file lookup.
     */
    async function republishContradictedUser() {
      const { page, fileId } = await restoreOffline();
      authfn.session = userB;
      goOnline();
      await vi.waitFor(() => expect(auth.resolved).toBeGreaterThan(1));
      await settle();
      const before = sdk.baseUrls.length;
      page.account.set({ ...cloudAccount });
      const files = await import("@nucleum/shared-state/files/filefn-client");
      await files.getFileFnClient();
      await settle();
      return { page, fileId, before };
    }

    it("constructs no client for a user another user's live session contradicted when the account state publishes it again", async () => {
      const { before } = await republishContradictedUser();
      expect(sdk.baseUrls).toHaveLength(before);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    });

    it("creates the contradicted user's client and drains once when a live session confirms it again", async () => {
      const { page, fileId, before } = await republishContradictedUser();
      authfn.session = liveSession;
      expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
      await settle();
      expect(sdk.baseUrls).toHaveLength(before + 1);
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([USEAST_FILES]);
    });

    it("applies a held live result once the reconnect replacing a canceled one fails, without the canceled request settling", async () => {
      const { page, fileId } = await restoreOffline();
      const held = holdAuthFnResponses();
      isOnline = true;
      const older = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      goOnline();
      await vi.waitFor(() => expect(held).toHaveLength(2));
      held[0](liveSession);
      expect(await older).toBe(false);
      await settle();
      expect(sdk.started).toEqual([]);
      const resolved = auth.resolved;
      auth.failNext = true;
      goOnline();
      await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(held).toHaveLength(2);
    });

    /**
     * Holds an older check's live result behind a reconnect whose request
     * never settles, then reconnects again with every response held.
     */
    async function supersedeHeldReconnect() {
      const { older, held, fileId } = await startCheckThenReconnect();
      held[0](liveSession);
      expect(await older).toBe(false);
      await settle();
      goOnline();
      await vi.waitFor(() => expect(held).toHaveLength(3));
      await settle();
      return { held, fileId };
    }

    it("lets the replacing reconnect decide before a result held for the canceled one applies", async () => {
      const { held, fileId } = await supersedeHeldReconnect();
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1);
      held[2](liveSession);
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
      await settle();
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([USEAST_FILES]);
    });

    it("changes nothing when the canceled reconnect's request settles late", async () => {
      const { held, fileId } = await supersedeHeldReconnect();
      held[2](liveSession);
      await vi.waitFor(() => expect(sdk.deleted).toEqual([PENDING_DELETE]));
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
      held[1](null);
      await settle();
      await recordPendingDelete();
      goOnline();
      await vi.waitFor(() =>
        expect(sdk.deleted).toEqual([PENDING_DELETE, PENDING_DELETE])
      );
      await settle();
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(sdk.deletedBy.map((i) => sdk.baseUrls[i])).toEqual([
        USEAST_FILES,
        USEAST_FILES
      ]);
    });

    /**
     * Cancels a reconnect whose request never settles with a second one
     * that fails, under fake timers, leaving the bounded retry armed.
     */
    async function failReplacingReconnect() {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout"],
        shouldAdvanceTime: true
      });
      const { page, fileId } = await restoreOffline();
      const held = holdAuthFnResponses();
      goOnline();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      const resolved = auth.resolved;
      auth.failNext = true;
      goOnline();
      await vi.waitFor(() => expect(auth.resolved).toBe(resolved + 1));
      await settle();
      expect(sdk.started).toEqual([]);
      authfn.respond = undefined;
      authfn.session = liveSession;
      return { page, fileId, resolved: auth.resolved };
    }

    it("retries once through the bounded delay after the reconnect replacing a canceled one fails", async () => {
      const { fileId, resolved } = await failReplacingReconnect();
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]), {
        timeout: 3_000
      });
      expect(auth.resolved).toBe(resolved + 1);
      await vi.advanceTimersByTimeAsync(300_000);
      await settle();
      expect(auth.resolved).toBe(resolved + 1);
      expect(sdk.uploads).toEqual([expect.objectContaining({ fileId })]);
      expect(sdk.deleted).toEqual([PENDING_DELETE]);
    });

    it("cancels the replay and the bounded retry on sign-out after the reconnect replacing a canceled one fails", async () => {
      const { page, resolved } = await failReplacingReconnect();
      await page.accountSession.signOut({ isPreventRedirect: true });
      await vi.advanceTimersByTimeAsync(300_000);
      await settle();
      expect(auth.resolved).toBe(resolved);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    });

    /**
     * Sends deletes through the real SDK against a fake network that answers
     * the first one at `baseUrl` for `fileId` with a 503 once `respond503` is
     * called, and every other one at once with a 204.
     */
    function failFirstDeleteWith503(baseUrl: string, fileId = PENDING_DELETE) {
      const realFetch = globalThis.fetch;
      const requests: string[] = [];
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => (release = resolve));
      const isTarget = (url: string) =>
        url.startsWith(baseUrl) && url.includes(fileId);
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        if (init?.method !== "DELETE") {
          return realFetch(input as RequestInfo, init);
        }
        const url = String(input instanceof Request ? input.url : input);
        requests.push(url);
        if (isTarget(url) && requests.filter(isTarget).length === 1) {
          await held;
          return new Response("busy", { status: 503, statusText: "Busy" });
        }
        return new Response(null, { status: 204 });
      });
      sdk.isRealDelete = true;
      return {
        sentTo: () => requests.filter(isTarget),
        settledAt: () => sdk.realDeletes.filter((d) => d.baseUrl === baseUrl),
        respond503: () => release()
      };
    }

    /**
     * Sends a region-less live session's euwest pending delete through the
     * real SDK, answers it with a 503 after a live session at useast narrowed
     * the authorization when `isNarrowed`, and waits until the SDK settles it.
     */
    async function retryEuwestDeleteAfter503(isNarrowed: boolean) {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout"],
        shouldAdvanceTime: true
      });
      const { page } = await restoreOffline();
      await recordPendingDelete(EUWEST_FILES);
      const network = failFirstDeleteWith503(EUWEST_FILES);
      authfn.session = { ...liveSession, regionId: undefined };
      goOnline();
      await vi.waitFor(() => expect(network.sentTo()).toHaveLength(1));
      if (isNarrowed) {
        authfn.session = liveSession;
        expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
      }
      network.respond503();
      await vi.waitFor(() => expect(network.settledAt()).toHaveLength(1), {
        timeout: 10_000
      });
      await settle();
      return network;
    }

    it("sends no SDK retry of a pending delete to an authority a live session stopped authorizing after a 503, and sends it once a file operation authorizes it", async () => {
      const network = await retryEuwestDeleteAfter503(true);
      expect(network.sentTo()).toHaveLength(1);
      expect(network.settledAt()[0].error).toMatchObject({
        name: "AbortError"
      });
      const euwestDeletes = [
        "filefn-pending-deletes-user-a",
        encodeURIComponent(EUWEST_FILES)
      ];
      expect(opfs.list(...euwestDeletes)).toEqual([PENDING_DELETE]);
      const files = await import("@nucleum/shared-state/files/filefn-client");
      await files.getFileFnClient();
      await vi.waitFor(() => expect(network.settledAt()).toHaveLength(2));
      await settle();
      expect(network.sentTo()).toHaveLength(2);
      expect(network.settledAt()[1]).toEqual({ baseUrl: EUWEST_FILES });
      expect(opfs.list(...euwestDeletes)).toEqual([]);
    });

    it("retries a pending delete after a 503 when the authorization is unchanged", async () => {
      const network = await retryEuwestDeleteAfter503(false);
      expect(network.sentTo()).toHaveLength(2);
      expect(network.settledAt()).toEqual([{ baseUrl: EUWEST_FILES }]);
    });

    it("sends no SDK retry of the bound client's pending delete after a 503 once a live session at another authority tears it down", async () => {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout"],
        shouldAdvanceTime: true
      });
      const { page } = await restoreOffline();
      const network = failFirstDeleteWith503(USEAST_FILES);
      authfn.session = liveSession;
      goOnline();
      await vi.waitFor(() => expect(network.sentTo()).toHaveLength(1));
      authfn.session = { ...liveSession, regionId: "euwest" };
      expect(await page.accountSession.checkIfSessionExpired()).toBe(false);
      network.respond503();
      await vi.waitFor(() => expect(network.settledAt()).toHaveLength(1), {
        timeout: 10_000
      });
      await settle();
      expect(network.sentTo()).toHaveLength(1);
      expect(network.settledAt()[0].error).toMatchObject({
        name: "AbortError"
      });
    });

    it("retries a file operation's delete through the bound client after a 503", async () => {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout"],
        shouldAdvanceTime: true
      });
      await restoreOffline();
      const network = failFirstDeleteWith503(USEAST_FILES, "foreground-file");
      const files = await import("@nucleum/shared-state/files/filefn-client");
      const client = await files.getFileFnClient();
      const deleted = client!.deleteFile("foreground-file");
      await vi.waitFor(() => expect(network.sentTo()).toHaveLength(1));
      network.respond503();
      await vi.waitFor(() => expect(network.sentTo()).toHaveLength(2), {
        timeout: 10_000
      });
      await deleted;
      expect(network.sentTo()).toHaveLength(2);
    });
  });

  describe("session resolutions canceled while they read or store the session", () => {
    const USEAST = "https://account-useast-dev.nucleum.app/files";

    async function restoreCachedOffline() {
      const fileId = await captureOfflineThenLeave();
      const files = await import("@nucleum/shared-state/files/filefn-client");
      await files.recordFileFnPendingDelete(
        { userId: "user-a", baseUrl: USEAST },
        "pending-delete-file"
      );
      await storeCloudSession();
      const page = await loadPage();
      await startSession(page, "user-a");
      await vi.waitFor(() => expect(sdk.baseUrls).toEqual([USEAST]));
      expect(sdk.started).toEqual([]);
      return { page, fileId };
    }

    /**
     * Holds the next stored-session read's USER_INFO value (read now) until
     * release, on every loaded client-storage instance (auth.probeStorage is
     * the one the auth module mock's original module loaded).
     */
    async function holdStoredSessionRead() {
      const { clientStorage: dynamicStorage } =
        await import("@nucleum/persistence/client-storage");
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const hold = { isHeld: false, release: () => release() };
      for (const storage of new Set([
        clientStorage,
        dynamicStorage,
        auth.probeStorage
      ])) {
        const get = storage.get.bind(storage);
        vi.spyOn(storage, "get").mockImplementation(((key: any) => {
          if (
            !hold.isHeld &&
            key === ClientStorageKey.USER_INFO &&
            new Error().stack?.includes("resolveStoredAuthSessionState")
          ) {
            hold.isHeld = true;
            const value = get(key);
            return gate.then(() => value);
          }
          return get(key);
        }) as any);
      }
      return hold;
    }

    it("P24: a cached-cloud check whose stored-session read spans sign-out reports expired and sends nothing", async () => {
      const { page } = await restoreCachedOffline();
      const hold = await holdStoredSessionRead();
      const checking = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      await page.accountSession.signOut({ isPreventRedirect: true });
      hold.release();
      const isExpired = await checking;
      goOnline();
      await vi.dynamicImportSettled();
      await vi.dynamicImportSettled();
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(isExpired).toBe(true);
    });

    it("P24-direct: resolveAuthSession aborted during the stored-session read resolves signed-out", async () => {
      await restoreCachedOffline();
      const hold = await holdStoredSessionRead();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      const controller = new AbortController();
      const pending = resolveAuthSession({ signal: controller.signal });
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      controller.abort();
      hold.release();
      expect((await pending).status).toBe("signed-out");
    });

    it("P24-control: an uncanceled cached restore check reports active", async () => {
      const { page } = await restoreCachedOffline();
      const hold = await holdStoredSessionRead();
      const checking = page.accountSession.checkIfSessionExpired();
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      hold.release();
      expect(await checking).toBe(false);
    });
    it("P24b: an offline-only resolution aborted during the stored-session read resolves signed-out", async () => {
      await clientStorage.set(
        ClientStorageKey.OFFLINE_SESSION_ID,
        "local-session"
      );
      isOnline = true;
      await loadPage();
      const hold = await holdStoredSessionRead();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      const controller = new AbortController();
      const pending = resolveAuthSession({ signal: controller.signal });
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      controller.abort();
      hold.release();
      expect((await pending).status).toBe("signed-out");
    });

    it("P25: a live resolution aborted while it stores the session resolves signed-out", async () => {
      await storeCloudSession();
      isOnline = true;
      authfn.session = liveSession;
      await loadPage();
      const storage = auth.probeStorage;
      const set = storage.set.bind(storage);
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      let isHeld = false;
      vi.spyOn(storage, "set").mockImplementation(((key: any, value: any) => {
        if (!isHeld && key === ClientStorageKey.USER) {
          isHeld = true;
          return gate.then(() => set(key, value));
        }
        return set(key, value);
      }) as any);
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      const controller = new AbortController();
      const pending = resolveAuthSession({ signal: controller.signal });
      await vi.waitFor(() => expect(isHeld).toBe(true));
      controller.abort();
      release();
      expect((await pending).status).toBe("signed-out");
    });

    /**
     * Holds the next call of `method` for `key` on the auth module's client
     * storage until release; the held call runs once released.
     */
    function holdAuthStorage(method: "set" | "remove", key: ClientStorageKey) {
      const storage = auth.probeStorage;
      const original = storage[method].bind(storage);
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const hold = { isHeld: false, release: () => release() };
      vi.spyOn(storage, method).mockImplementation(((...args: any[]) => {
        if (!hold.isHeld && args[0] === key) {
          hold.isHeld = true;
          return gate.then(() => original(...args));
        }
        return original(...args);
      }) as any);
      return hold;
    }

    it("resolves signed-out when aborted while it clears a session AuthFn reports missing", async () => {
      await storeCloudSession();
      isOnline = true;
      authfn.session = null;
      await loadPage();
      const hold = holdAuthStorage("remove", ClientStorageKey.USER);
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      const controller = new AbortController();
      const pending = resolveAuthSession({ signal: controller.signal });
      await vi.waitFor(() => expect(hold.isHeld).toBe(true));
      controller.abort();
      hold.release();
      expect((await pending).status).toBe("signed-out");
    });

    it("still reports a session AuthFn reports missing as expired when not aborted", async () => {
      await storeCloudSession();
      isOnline = true;
      authfn.session = null;
      await loadPage();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      const controller = new AbortController();
      expect(
        (await resolveAuthSession({ signal: controller.signal })).status
      ).toBe("expired");
    });

    it("still resolves an uncanceled cached-cloud restore as cached-cloud, with or without a signal", async () => {
      await restoreCachedOffline();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      expect((await resolveAuthSession()).status).toBe("cached-cloud");
      const controller = new AbortController();
      expect(
        (await resolveAuthSession({ signal: controller.signal })).status
      ).toBe("cached-cloud");
    });

    it("still resolves an uncanceled offline-only session as offline-only, with or without a signal", async () => {
      await clientStorage.set(
        ClientStorageKey.OFFLINE_SESSION_ID,
        "local-session"
      );
      isOnline = true;
      await loadPage();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      expect((await resolveAuthSession()).status).toBe("offline-only");
      const controller = new AbortController();
      expect(
        (await resolveAuthSession({ signal: controller.signal })).status
      ).toBe("offline-only");
    });

    it("still resolves an uncanceled live session as authenticated, with or without a signal", async () => {
      await storeCloudSession();
      isOnline = true;
      authfn.session = liveSession;
      await loadPage();
      const { resolveAuthSession } =
        await import("@nucleum/client/runtime/account/auth");
      expect((await resolveAuthSession()).status).toBe("authenticated");
      const controller = new AbortController();
      expect(
        (await resolveAuthSession({ signal: controller.signal })).status
      ).toBe("authenticated");
    });
  });
});
