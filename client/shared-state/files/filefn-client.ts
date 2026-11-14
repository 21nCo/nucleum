import {
  createFileFnClient,
  generateFileId,
  type FileFnClient,
  type UploadHandle,
  type UploadResult
} from "@filefn/client";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { createNucleumAuthFnTransportAuth } from "@nucleum/client/runtime/account/auth";
import { resolveAccountBaseUrl } from "@nucleum/client/runtime/account/network";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const FILEFN_OFFLINE_DIR_PREFIX = "filefn-pending-uploads";

/** Signed-in cloud account that owns a FileFn client. */
export type FileFnAccountScope = {
  userId: string;
  region: string | null;
};

type FileFnClientEntry = {
  key: string;
  controller: AbortController;
  client: Promise<FileFnClient>;
};

let currentEntry: FileFnClientEntry | null = null;
let isBoundToAccount = false;

/**
 * Returns the cloud account a FileFn client belongs to, or null for a
 * signed-out, undetermined or local-only account.
 */
export function resolveFileFnAccountScope(
  value: UserAccount | null | undefined
): FileFnAccountScope | null {
  if (value?.dataMode !== UserDataMode.CLOUD) return null;
  const userId =
    value.userId?.trim() || value.userInfo?.id?.replace(/^user:/, "").trim();
  if (!userId) return null;
  return {
    userId,
    region: value.userInfo?.region?.trim() || null
  };
}

/** Returns the FileFn routes under the account authority for a region. */
export function resolveFileFnBaseUrl(region: string): string {
  return `${resolveAccountBaseUrl(region).replace(/\/$/, "")}/files`;
}

/**
 * Returns the OPFS directory of an account's offline upload queue, so staged
 * uploads are only replayed by a client of the account that staged them.
 */
export function resolveFileFnOfflineDir(userId: string): string {
  return `${FILEFN_OFFLINE_DIR_PREFIX}-${encodeURIComponent(userId)}`;
}

/**
 * Returns the FileFn client of the signed-in cloud account, or null when no
 * cloud account is signed in. The first call binds the client to the account
 * state: a region switch recreates it and sign-out tears it down.
 *
 * Teardown aborts the client's in-flight requests, rejects every later call
 * with an AbortError before it does any work, and rejects the pending `done()`
 * of every upload handle the client returned. Uploads already staged, or being
 * staged, in the account's offline queue stay there for the account's next
 * client to replay; a handle's `abort()` after teardown does not delete them.
 *
 * Known limit: @filefn/client 0.2.0 has no dispose, so once a client has used
 * its offline queue, its OfflineSync keeps a window `online` listener after
 * teardown. That sync can only reach the torn-down transport, which rejects
 * with an AbortError that spends no offline retry. Removing the listener needs
 * an SDK dispose (TIDY-553).
 */
export async function getFileFnClient(): Promise<FileFnClient | null> {
  if (!isBoundToAccount) {
    isBoundToAccount = true;
    account.subscribe(syncFileFnClient);
  }
  syncFileFnClient(account.get());
  const entry = currentEntry;
  if (!entry) return null;
  const client = await entry.client;
  return currentEntry === entry ? client : getFileFnClient();
}

function syncFileFnClient(value: UserAccount | null | undefined) {
  const scope = resolveFileFnAccountScope(value);
  const key = scope ? `${scope.userId}:${scope.region ?? ""}` : null;
  if (currentEntry && currentEntry.key === key) return;
  tearDownFileFnClient();
  if (!scope || !key) return;
  const controller = new AbortController();
  const entry: FileFnClientEntry = {
    key,
    controller,
    client: createAccountFileFnClient(scope, controller.signal)
  };
  entry.client.catch((error) => {
    logger.error({ at: "filefn.client.create", error });
    if (currentEntry === entry) currentEntry = null;
  });
  currentEntry = entry;
}

function tearDownFileFnClient() {
  const entry = currentEntry;
  currentEntry = null;
  entry?.controller.abort(createTeardownError());
}

async function createAccountFileFnClient(
  scope: FileFnAccountScope,
  teardown: AbortSignal
): Promise<FileFnClient> {
  const region =
    scope.region ??
    (await clientStorage.get(ClientStorageKey.REGION)) ??
    "insouth";
  const transport = await createNucleumAuthFnTransportAuth();
  const client = createFileFnClient({
    baseUrl: resolveFileFnBaseUrl(region),
    credentials: (await transport.getCredentials?.()) ?? "include",
    fetch: createTeardownFetch(teardown),
    getAuthHeaders: async () => {
      teardown.throwIfAborted();
      return Object.fromEntries(
        new Headers((await transport.getRequestHeaders?.()) ?? undefined)
      );
    },
    offline: {
      enabled: true,
      opfsDir: resolveFileFnOfflineDir(scope.userId)
    }
  });
  return guardFileFnClient(client, teardown);
}

function createTeardownError() {
  return new DOMException("The FileFn client was torn down", "AbortError");
}

/**
 * Settles with the promise, or rejects with the teardown reason once the
 * client is torn down, whichever comes first.
 */
function untilTornDown<T>(promise: Promise<T>, teardown: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const onTeardown = () => reject(teardown.reason as unknown);
    if (teardown.aborted) onTeardown();
    else teardown.addEventListener("abort", onTeardown, { once: true });
    promise.then(resolve, reject).finally(() => {
      teardown.removeEventListener("abort", onTeardown);
    });
  });
}

/**
 * Fences a handle by the client teardown: `done()` rejects at teardown, and
 * `abort()` after teardown leaves an offline-staged upload in the queue.
 */
function guardUploadHandle<T extends UploadHandle>(
  handle: T,
  teardown: AbortSignal
): T {
  let done: Promise<UploadResult> | undefined;
  return {
    get uploadSessionId() {
      return handle.uploadSessionId;
    },
    get uploadSessionToken() {
      return handle.uploadSessionToken;
    },
    get fileId() {
      return handle.fileId;
    },
    onProgress: (callback) => handle.onProgress(callback),
    abort: () => {
      if (!teardown.aborted) handle.abort();
    },
    done: () => {
      done ??= teardown.aborted
        ? Promise.reject(teardown.reason as unknown)
        : untilTornDown(handle.done(), teardown);
      return done;
    }
  } as T;
}

function createTornDownHandle(fileId?: string): UploadHandle {
  return {
    uploadSessionId: "",
    fileId,
    onProgress: () => undefined,
    abort: () => undefined,
    done: () => Promise.reject(createTeardownError())
  };
}

/**
 * Wraps a FileFn client so that after teardown no method reaches the network,
 * the offline queue or its staged bytes.
 */
function guardFileFnClient(
  client: FileFnClient,
  teardown: AbortSignal
): FileFnClient {
  const guard = <T>(run: () => Promise<T>) => {
    if (teardown.aborted) return Promise.reject(teardown.reason as unknown);
    return untilTornDown(run(), teardown);
  };
  return {
    uploadFile: (input) => {
      if (teardown.aborted) {
        return {
          ...createTornDownHandle(),
          fileId: input.fileId ?? generateFileId()
        };
      }
      return guardUploadHandle(client.uploadFile(input), teardown);
    },
    resumeUpload: (uploadSessionId, file, options) => {
      if (teardown.aborted) {
        return createTornDownHandle(options?.fileId);
      }
      return guardUploadHandle(
        client.resumeUpload(uploadSessionId, file, options),
        teardown
      );
    },
    getFile: (fileId) => guard(() => client.getFile(fileId)),
    listArtifacts: (fileId) => guard(() => client.listArtifacts(fileId)),
    downloadUrl: (fileId, options) =>
      guard(() => client.downloadUrl(fileId, options)),
    downloadArtifact: (fileId, artifactId) =>
      guard(() => client.downloadArtifact(fileId, artifactId)),
    resolveRenderable: (input) => guard(() => client.resolveRenderable(input)),
    deleteFile: (fileId) => guard(() => client.deleteFile(fileId)),
    getPendingLocalDescriptor: (fileId) =>
      guard(() => client.getPendingLocalDescriptor(fileId))
  };
}

/**
 * Sends requests through the global fetch until the client is torn down, then
 * aborts in-flight requests and rejects new ones with an AbortError, which the
 * offline queue keeps staged without spending a retry.
 */
function createTeardownFetch(teardown: AbortSignal): typeof fetch {
  return async (input, init) => {
    teardown.throwIfAborted();
    const linked = new AbortController();
    const sources = [teardown, init?.signal].filter(
      (signal): signal is AbortSignal => Boolean(signal)
    );
    const detach = sources.map((signal) => {
      const forward = () => linked.abort(signal.reason);
      if (signal.aborted) forward();
      signal.addEventListener("abort", forward, { once: true });
      return () => signal.removeEventListener("abort", forward);
    });
    try {
      return await globalThis.fetch(input, { ...init, signal: linked.signal });
    } finally {
      for (const remove of detach) remove();
    }
  };
}
