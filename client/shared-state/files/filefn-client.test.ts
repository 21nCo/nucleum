import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { resolveAccountCookiePrefix } from "@nucleum/client/runtime/account/network";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const createdConfigs = vi.hoisted(() => [] as Array<Record<string, any>>);

vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (
      config: Parameters<typeof actual.createFileFnClient>[0]
    ) => {
      createdConfigs.push(config);
      return actual.createFileFnClient(config);
    }
  };
});

const { getFileFnClient } = await import("./filefn-client");

const signedOut: UserAccount = {
  dataMode: UserDataMode.NONE,
  sessionType: UserSessionType.UNDETERMINED
};

function cloudAccount(userId: string, region?: string): UserAccount {
  return {
    dataMode: UserDataMode.CLOUD,
    sessionType: UserSessionType.RETURNING,
    userId,
    userInfo: {
      id: `user:${userId}`,
      email: `${userId}@example.test`,
      nickName: userId,
      joinDate: new Date(0),
      lastLogin: new Date(0),
      region
    }
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

const ACCOUNT_URL_TEMPLATE = "https://account-{region}-dev.nucleum.app";
let csrfCookie = "";
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("VITE_ACCOUNT_BASE_URL_TEMPLATE", ACCOUNT_URL_TEMPLATE);
  csrfCookie = `${resolveAccountCookiePrefix("insouth")}.csrf`;
  createdConfigs.length = 0;
  fetchMock = vi.fn(async () => jsonResponse({ fileId: "file-1" }));
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = `${csrfCookie}=csrf-token; path=/`;
});

afterEach(async () => {
  account.set(signedOut);
  document.cookie = `${csrfCookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  await clientStorage.remove(ClientStorageKey.REGION);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("FileFn client runtime", () => {
  it("creates one client per account on the regional authority with the AuthFn cookie and CSRF transport", async () => {
    account.set(cloudAccount("user-a", "useast"));

    const client = await getFileFnClient();
    expect(client).not.toBeNull();
    expect(await getFileFnClient()).toBe(client);
    expect(createdConfigs).toHaveLength(1);
    expect(createdConfigs[0]).toMatchObject({
      baseUrl: "https://account-useast-dev.nucleum.app/files",
      credentials: "include",
      offline: { enabled: true, opfsDir: "filefn-pending-uploads-user-a" }
    });

    await client!.getFile("file-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://account-useast-dev.nucleum.app/files/file-1`);
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("x-authfn-csrf")).toBe("csrf-token");
  });

  it("uses the stored account region when the session carries none", async () => {
    await clientStorage.set(ClientStorageKey.REGION, "euwest");
    account.set(cloudAccount("user-a"));

    await getFileFnClient();
    expect(createdConfigs[0].baseUrl).toBe(
      "https://account-euwest-dev.nucleum.app/files"
    );
  });

  it("returns no client for local-only and signed-out accounts", async () => {
    account.set({
      ...cloudAccount("user-a", "useast"),
      dataMode: UserDataMode.LOCAL
    });
    expect(await getFileFnClient()).toBeNull();
    account.set(signedOut);
    expect(await getFileFnClient()).toBeNull();
    expect(createdConfigs).toHaveLength(0);
  });

  it("recreates the client on a region switch and stops the previous one", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const previous = await getFileFnClient();

    account.set(cloudAccount("user-a", "euwest"));
    const next = await getFileFnClient();

    expect(next).not.toBe(previous);
    expect(createdConfigs).toHaveLength(2);
    expect(createdConfigs[1]).toMatchObject({
      baseUrl: "https://account-euwest-dev.nucleum.app/files",
      offline: { enabled: true, opfsDir: "filefn-pending-uploads-user-a" }
    });
    await expect(previous!.getFile("file-1")).rejects.toMatchObject({
      name: "AbortError"
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await next!.getFile("file-1");
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://account-euwest-dev.nucleum.app/files/file-1`
    );
  });

  it("tears the client down on sign-out, aborting in-flight requests", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const client = await getFileFnClient();
    let requestSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init.signal ?? undefined;
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason)
          );
        })
    );
    const inFlight = client!.getFile("file-1");
    await vi.waitFor(() => expect(requestSignal).toBeDefined());

    account.set(signedOut);

    await expect(inFlight).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(true);
    await expect(client!.getFile("file-2")).rejects.toMatchObject({
      name: "AbortError"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await getFileFnClient()).toBeNull();
  });

  it("gives the next signed-in account its own client and offline queue", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const first = await getFileFnClient();
    account.set(signedOut);
    account.set(cloudAccount("user-b", "useast"));

    const second = await getFileFnClient();
    expect(second).not.toBe(first);
    expect(createdConfigs.map((config) => config.offline.opfsDir)).toEqual([
      "filefn-pending-uploads-user-a",
      "filefn-pending-uploads-user-b"
    ]);
  });

  it("does not hand out a client whose account signed out during creation", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const pending = getFileFnClient();
    account.set(signedOut);

    expect(await pending).toBeNull();
  });
});
