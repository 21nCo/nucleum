import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientStorageKey } from "@21n/persistence/persistence.type";

import {
  getBucketNameandKey,
  isUrlExpired,
  resolveToken,
  resolveCurrentUserId,
  signout,
  isTokenExpired
} from "./account.utils";

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
    jwtDecodeMock: vi.fn()
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
  jwtDecodeMock
} = mocks;

vi.mock("@21n/utils/browser.utils", () => ({
  goto: mocks.gotoMock,
  isExtensionEnvironment: mocks.isExtensionEnvironmentMock
}));

vi.mock("@21n/persistence/persistence.utils", () => ({
  clientStorage: mocks.clientStorageMock,
  retrieveLocally: mocks.retrieveLocallyMock
}));

vi.mock("@21n/utils/embed.utils", () => ({
  postDataToParent: mocks.postDataToParentMock
}));

vi.mock("@21n/components/debug/logger.client", () => ({
  logger: {
    log: mocks.loggerLogMock,
    error: vi.fn()
  }
}));

vi.mock("@21n/shared-utils/json.utils", () => ({
  parse: mocks.parseMock
}));

vi.mock("jwt-decode", () => ({
  default: mocks.jwtDecodeMock
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
let mockLocalStorage: Storage;

beforeEach(() => {
  originalChrome = (globalThis as any).chrome;
  originalLocalStorage = (globalThis as any).localStorage;
  mockLocalStorage = createStorage();
  (globalThis as any).localStorage = mockLocalStorage;
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
});

describe("client/utils/account.utils", () => {
  it("derives bucket name and key segments", () => {
    const url = "https://example.com/bucket/user/dir/file.txt?token=123";
    expect(getBucketNameandKey(url)).toBe("bucket/user/dir/file.txt");
  });

  it("detects expired signed urls", () => {
    const formatAmzDate = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");

    const now = new Date();
    const baseDate = new Date(now.getTime() - 10 * 60 * 1000);
    const amzDate = formatAmzDate(baseDate);
    const expired = new URLSearchParams({
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "100"
    }).toString();
    const fresh = new URLSearchParams({
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "7200"
    }).toString();

    expect(isUrlExpired(expired)).toBe(true);
    expect(isUrlExpired(fresh)).toBe(false);
  });

  it("resolves token in extension environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    clientStorageMock.get.mockResolvedValue("abc");

    const token = await resolveToken();

    expect(token).toBe("abc");
    expect(clientStorageMock.get).toHaveBeenCalledWith(ClientStorageKey.STOKEN);
  });

  it("rejects when extension storage errors", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    clientStorageMock.get.mockRejectedValue(new Error("boom"));

    await expect(resolveToken()).rejects.toThrow("boom");
  });

  it("resolves token from local storage when in web environment with space", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    retrieveLocallyMock.mockReturnValue({ id: "space-1" });
    mockLocalStorage.setItem(`token-space-1`, "token-value");

    const token = await resolveToken();

    expect(token).toBe("token-value");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("token-space-1");
  });

  it("resolves fallback token when no space present", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    retrieveLocallyMock.mockReturnValue(null);
    mockLocalStorage.setItem("stoken", "fallback-token");

    const token = await resolveToken();

    expect(token).toBe("fallback-token");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("stoken");
  });

  it("resolves current user id in extension environment", async () => {
    isExtensionEnvironmentMock.mockReturnValue(true);
    parseMock.mockReturnValue({ id: "user-123" });
    clientStorageMock.get.mockResolvedValue("{}");

    const result = await resolveCurrentUserId();

    expect(result).toBe("user-123");
    expect(clientStorageMock.get).toHaveBeenCalledWith(ClientStorageKey.USER_INFO);
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
    mockLocalStorage.setItem("userInfo", "{\"id\":\"user-456\"}");
    parseMock.mockReturnValue({ id: "user-456" });

    const result = await resolveCurrentUserId();

    expect(result).toBe("user-456");
    expect(parseMock).toHaveBeenCalledWith("{\"id\":\"user-456\"}");
  });

  it("signs out user and preserves persisted values", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    clientStorageMock.get.mockImplementation(async (key: ClientStorageKey) => {
      switch (key) {
        case ClientStorageKey.ENV:
          return "env";
        case ClientStorageKey.APP_DATA:
          return "app-data";
        case ClientStorageKey.PRODUCT:
          return "product";
        case ClientStorageKey.DAP_ID:
          return "dap";
        default:
          return null;
      }
    });
    clientStorageMock.clearAll.mockResolvedValue(null);
    clientStorageMock.set.mockResolvedValue(undefined);

    await signout();

    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ at: "signout" })
    );
    expect(postDataToParentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isLoggedIn: false })
    );
    expect(clientStorageMock.clearAll).toHaveBeenCalledTimes(1);
    expect(clientStorageMock.set).toHaveBeenCalledWith(
      ClientStorageKey.ENV,
      "env"
    );
    expect(clientStorageMock.set).toHaveBeenCalledWith(
      ClientStorageKey.PRODUCT,
      "product"
    );
    expect(clientStorageMock.set).toHaveBeenCalledWith(
      ClientStorageKey.APP_DATA,
      "app-data"
    );
    expect(clientStorageMock.set).not.toHaveBeenCalledWith(
      ClientStorageKey.DAP_ID,
      expect.anything()
    );
    expect(gotoMock).toHaveBeenCalledWith("/signup?msg=signedout");
  });

  it("skips redirect and preserves dap when requested", async () => {
    isExtensionEnvironmentMock.mockReturnValue(false);
    clientStorageMock.get.mockImplementation(async (key: ClientStorageKey) => {
      switch (key) {
        case ClientStorageKey.ENV:
          return "env";
        case ClientStorageKey.APP_DATA:
          return "app-data";
        case ClientStorageKey.PRODUCT:
          return "product";
        case ClientStorageKey.DAP_ID:
          return "dap";
        default:
          return null;
      }
    });
    clientStorageMock.clearAll.mockResolvedValue(null);
    clientStorageMock.set.mockResolvedValue(undefined);

    await signout({ isPreventRedirect: true, isPreventDapIdClear: true });

    expect(gotoMock).not.toHaveBeenCalled();
    expect(clientStorageMock.set).toHaveBeenCalledWith(
      ClientStorageKey.DAP_ID,
      "dap"
    );
  });

  it("determines token expiry status", () => {
    const nowSeconds = 1700000000;
    vi.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
    jwtDecodeMock.mockReturnValue({ exp: nowSeconds + 60 });
    expect(isTokenExpired("token")).toBe(false);

    jwtDecodeMock.mockReturnValue({ exp: nowSeconds - 60 });
    expect(isTokenExpired("token")).toBe(true);
  });
});
