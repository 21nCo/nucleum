import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import {
  resolveToken,
  resolveCurrentUserId,
  isTokenExpired
} from "@nucleum/client/runtime/account/session-token";

const mocks = vi.hoisted(() => {
  return {
    gotoMock: vi.fn(),
    isExtensionEnvironmentMock: vi.fn(),
    retrieveLocallyMock: vi.fn(),
    clientStorageMock: {
      get: vi.fn(),
      set: vi.fn(),
      clearAll: vi.fn()
    },
    postDataToParentMock: vi.fn(),
    loggerLogMock: vi.fn(),
    parseMock: vi.fn(),
    authSignOutMock: vi.fn()
  };
});

const {
  gotoMock,
  isExtensionEnvironmentMock,
  retrieveLocallyMock,
  clientStorageMock,
  postDataToParentMock,
  loggerLogMock,
  parseMock,
  authSignOutMock
} = mocks;

vi.mock("@nucleum/client/runtime/navigation/navigation-request", () => ({
  goto: mocks.gotoMock,
  isExtensionEnvironment: mocks.isExtensionEnvironmentMock
}));

vi.mock("@21n/shared-utils/browser-environment", () => ({
  goto: mocks.gotoMock,
  isExtensionEnvironment: mocks.isExtensionEnvironmentMock
}));

vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: mocks.clientStorageMock,
  retrieveLocally: mocks.retrieveLocallyMock
}));

vi.mock("@nucleum/client/runtime/embed/embed.utils", () => ({
  postDataToParent: mocks.postDataToParentMock
}));

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: {
    log: mocks.loggerLogMock,
    error: vi.fn()
  }
}));

vi.mock("@21n/shared-utils/json.utils", () => ({
  parse: mocks.parseMock
}));

vi.mock("@nucleum/client/runtime/account/auth", () => ({
  authClient: async () => ({
    signOut: mocks.authSignOutMock
  })
}));

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    })
  } as Storage;
}

let originalChrome: any;

let originalLocalStorage: Storage | undefined;

let originalWindow: Window | undefined;

let mockLocalStorage: Storage;

beforeEach(() => {
  originalChrome = (globalThis as any).chrome;
  originalLocalStorage = (globalThis as any).localStorage;
  originalWindow = (globalThis as any).window;
  mockLocalStorage = createStorage();
  (globalThis as any).localStorage = mockLocalStorage;
  (globalThis as any).window = { localStorage: mockLocalStorage };
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalChrome) {
    (globalThis as any).chrome = originalChrome;
  } else {
    delete (globalThis as any).chrome;
  }

  if (originalLocalStorage) {
    (globalThis as any).localStorage = originalLocalStorage;
  } else {
    delete (globalThis as any).localStorage;
  }

  if (originalWindow) {
    (globalThis as any).window = originalWindow;
  } else {
    delete (globalThis as any).window;
  }
});

describe("client/runtime/account/session-token", () => {
  it("resolves token in extension environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    clientStorageMock.get.mockResolvedValue("abc");

    const token = await resolveToken();

    expect(token).toBe("abc");
    expect(clientStorageMock.get).toHaveBeenCalledWith(
      ClientStorageKey.AUTHFN_TOKEN
    );
  });

  it("rejects when extension storage errors", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    clientStorageMock.get.mockRejectedValue(new Error("boom"));

    await expect(resolveToken()).rejects.toThrow("boom");
  });

  it("does not resolve AuthFn token from local storage in normal web environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    retrieveLocallyMock.mockReturnValue({ id: "space-1" });
    mockLocalStorage.setItem(ClientStorageKey.AUTHFN_TOKEN, "token-value");

    const token = await resolveToken();

    expect(token).toBeNull();
    expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith(
      ClientStorageKey.AUTHFN_TOKEN
    );
  });

  it("resolves AuthFn token from local storage in native embed builds", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    import.meta.env.VITE_NATIVE_EMBED = "true";
    mockLocalStorage.setItem(ClientStorageKey.AUTHFN_TOKEN, "token-value");

    const token = await resolveToken();

    expect(token).toBe("token-value");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      ClientStorageKey.AUTHFN_TOKEN
    );
    delete import.meta.env.VITE_NATIVE_EMBED;
  });

  it("returns null when no AuthFn token exists", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    retrieveLocallyMock.mockReturnValue(null);
    mockLocalStorage.setItem("stoken", "fallback-token");

    const token = await resolveToken();

    expect(token).toBeNull();
    expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith(
      ClientStorageKey.AUTHFN_TOKEN
    );
  });

  it("resolves current user id in extension environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    parseMock.mockReturnValue({ id: "user-123" });
    clientStorageMock.get.mockResolvedValue("{}");

    const result = await resolveCurrentUserId();

    expect(result).toBe("user-123");
    expect(clientStorageMock.get).toHaveBeenCalledWith(
      ClientStorageKey.USER_INFO
    );
    expect(parseMock).toHaveBeenCalledWith("{}");
  });

  it("returns null when extension storage lacks user info", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    clientStorageMock.get.mockResolvedValue(null);

    const result = await resolveCurrentUserId();

    expect(result).toBeNull();
  });

  it("resolves current user id from local storage in web environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    mockLocalStorage.setItem("userInfo", '{"id":"user-456"}');
    parseMock.mockReturnValue({ id: "user-456" });

    const result = await resolveCurrentUserId();

    expect(result).toBe("user-456");
    expect(parseMock).toHaveBeenCalledWith('{"id":"user-456"}');
  });

  it("treats opaque AuthFn tokens as present or absent", () => {
    expect(isTokenExpired("token")).toBe(false);
    expect(isTokenExpired("")).toBe(true);
  });
});
