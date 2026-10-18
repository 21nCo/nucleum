import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBucketNameandKey,
  isUrlExpired
} from "@nucleum/client/runtime/files/signed-url";

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

describe("client/runtime/files/signed-url", () => {
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
});
