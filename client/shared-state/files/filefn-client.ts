import { createFileFnClient, type FileFnClient } from "@filefn/client";
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
  entry?.controller.abort(
    new DOMException("The FileFn client was torn down", "AbortError")
  );
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
  return createFileFnClient({
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
