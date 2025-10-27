import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientStorageKey } from "@21n/persistence/persistence.type";

import * as networkUtils from "./network.utils";

const moduleMocks = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    log: vi.fn()
  },
  account: {
    resolveToken: vi.fn(),
    signout: vi.fn()
  },
  browser: {
    dispatchCustomEvent: vi.fn(),
    generateFingerprint: vi.fn(),
    isContentScript: vi.fn(),
    isExtensionEnvironment: vi.fn()
  },
  time: {
    detectTimeZone: vi.fn()
  },
  extension: {
    relayToBackgroundScript: vi.fn(),
    relayToContentScript: vi.fn(),
    relayToSidePanel: vi.fn()
  },
  storage: {
    get: vi.fn()
  }
}));

vi.mock("@21n/components/debug/logger.client", () => ({ logger: moduleMocks.logger }));
vi.mock("@21n/utils/account.utils", () => moduleMocks.account);
vi.mock("@21n/utils/browser.utils", () => moduleMocks.browser);
vi.mock("@21n/persistence/persistence.utils", () => ({ clientStorage: moduleMocks.storage }));
vi.mock("@21n/utils/time.utils", () => moduleMocks.time);
vi.mock("@21n/utils/extension.utils", () => moduleMocks.extension);
vi.mock("@21n/shared-utils/json.utils", async () => {
  const actual = await vi.importActual<any>("@21n/shared-utils/json.utils");
  return actual;
});

const {
  determineIfOffline,
  performApiCall,
  performHttpNetworkOperation,
  performStaticDataOperation,
  resolveRegionalApiUrl
} = networkUtils;

describe("client/utils/network.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moduleMocks.browser.isExtensionEnvironment.mockReturnValue(false);
    moduleMocks.browser.isContentScript.mockReturnValue(false);
    moduleMocks.browser.generateFingerprint.mockResolvedValue("fingerprint");
    moduleMocks.account.resolveToken.mockResolvedValue("token");
    moduleMocks.time.detectTimeZone.mockReturnValue("UTC");
    moduleMocks.storage.get.mockResolvedValue(null);
    (globalThis as any).fetch = vi.fn();
    Object.assign(import.meta.env, {
      VITE_API_URL: "https://api.memotron.test",
      VITE_FILE_API_URL: "https://files.memotron.test",
      VITE_API_US_URL: "https://us.memotron.test",
      VITE_API_EU_URL: "https://eu.memotron.test",
      VITE_API_AS_URL: "https://as.memotron.test",
      VITE_STATIC_URL: "https://static.memotron.test"
    });
    Object.assign(process.env, {
      PLASMO_PUBLIC_API_US_URL: "https://us.plasmo.test",
      PLASMO_PUBLIC_API_EU_URL: "https://eu.plasmo.test",
      PLASMO_PUBLIC_API_AS_URL: "https://as.plasmo.test",
      PLASMO_PUBLIC_API_URL: "https://plasmo.api.test",
      PLASMO_PUBLIC_FILE_API_URL: "https://plasmo.files.test"
    });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://app.memotron.test",
        href: "https://app.memotron.test/path?query=1",
        host: "app.memotron.test",
        reload: vi.fn()
      },
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, "referrer", {
      value: "https://referrer.test",
      configurable: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves regional API urls based on timezone", () => {
    const offsetSpy = vi
      .spyOn(Date.prototype, "getTimezoneOffset")
      .mockReturnValue(300);
    expect(resolveRegionalApiUrl()).toBe("https://us.memotron.test");

    offsetSpy.mockReturnValue(0);
    expect(resolveRegionalApiUrl()).toBe("https://eu.memotron.test");

    offsetSpy.mockReturnValue(-600);
    expect(resolveRegionalApiUrl()).toBe("https://as.memotron.test");

    offsetSpy.mockRestore();
  });

  it("delegates extension API calls to background script", async () => {
    moduleMocks.browser.isExtensionEnvironment.mockReturnValue(true);
    moduleMocks.browser.isContentScript.mockReturnValue(true);
    moduleMocks.extension.relayToBackgroundScript.mockResolvedValue({ ok: true });

    const result = await performApiCall("endpoint", "POST", { value: 1 });

    expect(moduleMocks.extension.relayToBackgroundScript).toHaveBeenCalledWith({
      event: expect.any(String),
      data: expect.objectContaining({ endpoint: "endpoint", body: { value: 1 } })
    });
    expect(result).toEqual({ ok: true });
  });

  it("performs direct http call with enriched context", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn(),
      json: vi.fn()
    });

    const response = await performApiCall("tasks", "POST", { foo: "bar" });

    expect(response?.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.memotron.test/tasks",
      expect.objectContaining({
        method: "POST"
      })
    );
    const [, requestInit] = (fetch as any).mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(requestInit.body as string);
    expect(payload.context).toMatchObject({
      deviceFingerprint: "fingerprint",
      origin: "https://app.memotron.test"
    });
  });

  it("skips static data fetch when offline", async () => {
    moduleMocks.storage.get.mockResolvedValueOnce("true");
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const result = await performStaticDataOperation("file.json");
    expect(result).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("fetches static data when online", async () => {
    moduleMocks.storage.get.mockResolvedValueOnce(null);
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    (fetch as any).mockResolvedValue("ok");
    const result = await performStaticDataOperation("file.json");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/static\.memotron\.test\/file\.json\?v=\d+$/
      )
    );
    expect(result).toBe("ok");
  });

  it("performs http network operation successfully", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn(),
      json: vi.fn()
    });

    const response = await performHttpNetworkOperation({
      url: "https://api.memotron.test/tasks",
      method: "POST",
      headers: {},
      body: "{}"
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.memotron.test/tasks",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );
  });

  it("logs out extension when token missing", async () => {
    moduleMocks.browser.isExtensionEnvironment.mockReturnValue(true);
    moduleMocks.account.resolveToken.mockResolvedValueOnce(null);
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("unauthorized")
    });

    await expect(
      performHttpNetworkOperation({
        url: "https://api.memotron.test/private",
        method: "GET",
        headers: {},
        body: undefined
      })
    ).rejects.toThrow("API call failed with status: 401");

    expect(moduleMocks.extension.relayToSidePanel).toHaveBeenCalled();
    expect(moduleMocks.extension.relayToContentScript).toHaveBeenCalled();
    expect(moduleMocks.account.signout).not.toHaveBeenCalled();
  });

  it("signs out web users on unauthorized response", async () => {
    moduleMocks.browser.isExtensionEnvironment.mockReturnValue(false);
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("unauthorized")
    });

    await expect(
      performHttpNetworkOperation({
        url: "https://api.memotron.test/private",
        method: "GET",
        headers: {},
        body: undefined
      })
    ).rejects.toThrow("API call failed with status: 401");

    expect(moduleMocks.account.signout).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("dispatches alerts for network errors", async () => {
    (fetch as any).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      performHttpNetworkOperation({
        url: "https://api.memotron.test/private",
        method: "GET",
        headers: {},
        body: undefined
      })
    ).rejects.toThrow("Network error. Please check your internet connection.");

    expect(moduleMocks.browser.dispatchCustomEvent).toHaveBeenCalled();
  });

  it("determines offline status from storage and navigator", async () => {
    moduleMocks.storage.get.mockResolvedValueOnce("true");
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const result = await determineIfOffline();
    expect(moduleMocks.storage.get).toHaveBeenCalledWith(ClientStorageKey.OFFLINE_MODE);
    expect(result).toBe(true);
  });
});
