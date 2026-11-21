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
  deletedBy: [] as number[]
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
        },
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

/**
 * The session AuthFn returns for the stored credentials (null: none), or the
 * response `respond` returns instead when set.
 */
const authfn = vi.hoisted(() => ({
  session: null as unknown,
  respond: undefined as (() => Promise<unknown>) | undefined
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
        resolveRegion: async () => undefined
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
  return { ...actual, datafn, datafnRuntime };
});

// Navigation and the native shell's sign-out cleanup are outside this test.
/** How many resolutions of the stored session have returned. */
const auth = vi.hoisted(() => ({ resolved: 0 }));
vi.mock("@nucleum/client/runtime/account/auth", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@nucleum/client/runtime/account/auth")
    >();
  return {
    ...actual,
    resolveAuthSession: async (
      ...args: Parameters<typeof actual.resolveAuthSession>
    ) => {
      try {
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
  authfn.session = null;
  authfn.respond = undefined;
  auth.resolved = 0;
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
});
