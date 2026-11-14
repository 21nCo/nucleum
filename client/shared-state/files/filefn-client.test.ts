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

type FakeEntry = FakeDirectory | FakeFile;

/** In-memory OPFS directory with the subset of the API the offline queue uses. */
class FakeDirectory {
  readonly kind = "directory";
  readonly entries = new Map<string, FakeEntry>();
  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let entry = this.entries.get(name);
    if (!entry && options?.create) {
      entry = new FakeDirectory(name);
      this.entries.set(name, entry);
    }
    if (!(entry instanceof FakeDirectory)) {
      throw new DOMException(name, "NotFoundError");
    }
    return entry;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    let entry = this.entries.get(name);
    if (!entry && options?.create) {
      entry = new FakeFile(name);
      this.entries.set(name, entry);
    }
    if (!(entry instanceof FakeFile)) {
      throw new DOMException(name, "NotFoundError");
    }
    return entry;
  }

  async removeEntry(name: string) {
    if (!this.entries.delete(name)) {
      throw new DOMException(name, "NotFoundError");
    }
  }

  async *values() {
    yield* this.entries.values();
  }
}

class FakeFile {
  readonly kind = "file";
  content: string | ArrayBuffer = "";
  constructor(readonly name: string) {}

  async createWritable() {
    let written: string | ArrayBuffer = "";
    return {
      write: async (data: string | ArrayBuffer) => {
        written = data;
      },
      close: async () => {
        this.content = written;
      }
    };
  }

  async getFile() {
    const content = this.content;
    return {
      text: async () =>
        typeof content === "string"
          ? content
          : new TextDecoder().decode(content),
      arrayBuffer: async () =>
        typeof content === "string"
          ? new TextEncoder().encode(content).buffer
          : content
    };
  }
}

let opfsRoot: FakeDirectory;

/** Returns the upload sessions fully staged in an account's offline queue. */
function stagedSessions(userId: string) {
  const queue = opfsRoot.entries.get(`filefn-pending-uploads-${userId}`);
  if (!(queue instanceof FakeDirectory)) return [];
  return [...queue.entries.values()]
    .filter(
      (entry): entry is FakeDirectory =>
        entry instanceof FakeDirectory && entry.entries.has("metadata.json")
    )
    .map((entry) => entry.name);
}

function goOffline() {
  opfsRoot = new FakeDirectory("");
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: { getDirectory: async () => opfsRoot }
  });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: () => "blob:staged",
      revokeObjectURL: () => undefined
    })
  );
}

/** Returns a text file that can be read, which jsdom's File cannot. */
function textFile(name: string) {
  return Object.assign(new File(["hello"], name, { type: "text/plain" }), {
    arrayBuffer: async () => new TextEncoder().encode("hello").buffer
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
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "storage");
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

  it("fences every method of a torn-down client that used its offline queue and keeps the staged upload for the account", async () => {
    goOffline();
    account.set(cloudAccount("user-a", "useast"));
    const client = await getFileFnClient();
    const staged = client!.uploadFile({
      policy: "attachment",
      file: textFile("staged.txt")
    });
    await vi.waitFor(() => expect(stagedSessions("user-a")).toHaveLength(1));
    const done = staged.done();

    account.set(signedOut);

    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    staged.abort();
    const late = client!.uploadFile({
      policy: "attachment",
      file: textFile("late.txt")
    });
    await expect(late.done()).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      client!.getPendingLocalDescriptor(staged.fileId)
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      client!.resolveRenderable({
        fileId: staged.fileId,
        intent: "full",
        preferLocal: true
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(client!.deleteFile(staged.fileId)).rejects.toMatchObject({
      name: "AbortError"
    });
    expect(stagedSessions("user-a")).toEqual([staged.uploadSessionId]);
    expect(fetchMock).not.toHaveBeenCalled();

    account.set(cloudAccount("user-a", "useast"));
    const next = await getFileFnClient();
    await expect(
      next!.getPendingLocalDescriptor(staged.fileId)
    ).resolves.toMatchObject({
      fileId: staged.fileId,
      uploadSessionId: staged.uploadSessionId,
      state: "pending-local"
    });
  });

  it("settles done() with an AbortError when the client is torn down during offline staging", async () => {
    goOffline();
    account.set(cloudAccount("user-a", "useast"));
    const client = await getFileFnClient();
    let releaseStaging!: () => void;
    const stagingHeld = new Promise<void>((resolve) => {
      releaseStaging = resolve;
    });
    let stagingStarted = false;
    const handle = client!.uploadFile({
      policy: "attachment",
      file: textFile("staging.txt"),
      preprocessors: [
        {
          name: "hold-staging",
          matches: async () => {
            stagingStarted = true;
            await stagingHeld;
            return false;
          },
          process: async (context) => ({ file: context.file })
        }
      ]
    });
    const done = handle.done();
    await vi.waitFor(() => expect(stagingStarted).toBe(true));

    account.set(cloudAccount("user-a", "euwest"));

    await expect(done).rejects.toMatchObject({ name: "AbortError" });
    releaseStaging();
    await vi.waitFor(() =>
      expect(stagedSessions("user-a")).toEqual([handle.uploadSessionId])
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not hand out a client whose account signed out during creation", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const pending = getFileFnClient();
    account.set(signedOut);

    expect(await pending).toBeNull();
  });
});
