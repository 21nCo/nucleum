import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { signout } from "@nucleum/client/runtime/account/session-cleanup";

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

describe("client/runtime/account/session-cleanup", () => {
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
    expect(gotoMock).not.toHaveBeenCalled();
  });

  it("preserves dap when requested without choosing navigation", async () => {
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

    await signout({ isPreventDapIdClear: true });

    expect(gotoMock).not.toHaveBeenCalled();
    expect(clientStorageMock.set).toHaveBeenCalledWith(
      ClientStorageKey.DAP_ID,
      "dap"
    );
  });
});
