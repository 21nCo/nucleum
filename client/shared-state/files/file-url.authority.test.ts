import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

// Runs the real FileFn client runtime, so the cache sees the owner the
// account's current authority binds, not a stub of it.
const { clearFileUrlCache, resolveFileUrl } =
  await import("@nucleum/shared-state/files/file-url");

const ACCOUNT_URL_TEMPLATE = "https://account-{region}-dev.nucleum.app";

const signedOut: UserAccount = {
  dataMode: UserDataMode.NONE,
  sessionType: UserSessionType.UNDETERMINED
};

/** A cloud account whose session carries no region. */
function cloudAccountWithoutRegion(userId: string): UserAccount {
  return {
    dataMode: UserDataMode.CLOUD,
    sessionType: UserSessionType.RETURNING,
    userId,
    userInfo: {
      id: `user:${userId}`,
      email: `${userId}@example.test`,
      nickName: userId,
      joinDate: new Date(0),
      lastLogin: new Date(0)
    }
  };
}

/**
 * Answers each render request with a URL of the authority it reached, after
 * the optional gate opens.
 */
function serveRenders(gate?: Promise<void>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    await gate;
    const url = new URL(input instanceof Request ? input.url : String(input));
    const fileId = url.pathname.split("/").at(-2);
    const intent = url.searchParams.get("intent");
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          fileId,
          versionId: "v1",
          intent,
          state: "ready",
          mimeType: "image/png",
          name: "photo.png",
          size: 10,
          source: {
            mode: "original",
            url: `https://${url.host}/r2/${fileId}?X-Amz-Expires=900`
          }
        },
        requestId: "req-1"
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/**
 * Microtasks after the final confirmation's stored region read at which that
 * confirmation has passed and the lookup has not returned yet.
 */
const AFTER_CONFIRMATION_MICROTASKS = 3;

function afterMicrotasks(count: number, run: () => void) {
  if (count === 0) run();
  else queueMicrotask(() => afterMicrotasks(count - 1, run));
}

/**
 * Applies an account change once the given stored region read, counted from
 * now, has resolved and the final confirmation of a lookup has passed.
 */
function changeAccountAfterConfirmation(read: number, next: UserAccount) {
  const get = clientStorage.get.bind(clientStorage);
  let reads = 0;
  vi.spyOn(clientStorage, "get").mockImplementation((key) => {
    reads += 1;
    const value = get(key);
    if (reads === read) {
      void value.then(() =>
        afterMicrotasks(AFTER_CONFIRMATION_MICROTASKS, () => account.set(next))
      );
    }
    return value;
  });
}

const accountChanges: [string, UserAccount][] = [
  ["an account switch", cloudAccountWithoutRegion("user-b")],
  ["a sign-out", signedOut]
];

describe("resolveFileUrl across FileFn authorities", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ACCOUNT_BASE_URL_TEMPLATE", ACCOUNT_URL_TEMPLATE);
    clearFileUrlCache();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    account.set(signedOut);
    await clientStorage.remove(ClientStorageKey.REGION);
    clearFileUrlCache();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does not serve a URL of the previous authority after the stored region changes", async () => {
    const fetchMock = serveRenders();
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    account.set(cloudAccountWithoutRegion("user-a"));
    const before = await resolveFileUrl("file-1", "full");
    expect(before).toBe(
      "https://account-useast-dev.nucleum.app/r2/file-1?X-Amz-Expires=900"
    );

    await clientStorage.set(ClientStorageKey.REGION, "euwest");
    const after = await resolveFileUrl("file-1", "full");

    expect(after).toBe(
      "https://account-euwest-dev.nucleum.app/r2/file-1?X-Amz-Expires=900"
    );
    expect(
      fetchMock.mock.calls.map(([input]) => new URL(String(input)).host)
    ).toEqual([
      "account-useast-dev.nucleum.app",
      "account-euwest-dev.nucleum.app"
    ]);
  });

  it("does not return a URL of the previous authority when the stored region changes during the lookup", async () => {
    let openGate: () => void = () => {};
    const fetchMock = serveRenders(
      new Promise<void>((resolve) => {
        openGate = resolve;
      })
    );
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    account.set(cloudAccountWithoutRegion("user-a"));

    const lookup = resolveFileUrl("file-1", "full");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await clientStorage.set(ClientStorageKey.REGION, "euwest");
    openGate();

    expect(await lookup).toBeUndefined();
    expect(new URL(String(fetchMock.mock.calls[0][0])).host).toBe(
      "account-useast-dev.nucleum.app"
    );
  });

  it.each(accountChanges)(
    "returns no fresh URL after %s that follows the final confirmation",
    async (_, next) => {
      let openGate: () => void = () => {};
      const fetchMock = serveRenders(
        new Promise<void>((resolve) => {
          openGate = resolve;
        })
      );
      await clientStorage.set(ClientStorageKey.REGION, "useast");
      account.set(cloudAccountWithoutRegion("user-a"));

      const lookup = resolveFileUrl("file-1", "full");
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      changeAccountAfterConfirmation(1, next);
      openGate();

      expect(await lookup).toBeUndefined();
    }
  );

  it.each(accountChanges)(
    "returns no cached URL after %s that follows the final confirmation",
    async (_, next) => {
      const fetchMock = serveRenders();
      await clientStorage.set(ClientStorageKey.REGION, "useast");
      account.set(cloudAccountWithoutRegion("user-a"));
      await resolveFileUrl("file-1", "full");

      changeAccountAfterConfirmation(2, next);

      expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("still serves a repeated lookup from the cache while the authority stays", async () => {
    const fetchMock = serveRenders();
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    account.set(cloudAccountWithoutRegion("user-a"));

    const first = await resolveFileUrl("file-1", "thumbnail");
    const second = await resolveFileUrl("file-1", "thumbnail");

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
