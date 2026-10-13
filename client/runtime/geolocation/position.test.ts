import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGeoLocation } from "@nucleum/client/runtime/geolocation/position";

const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;

const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;

const mockedModules = vi.hoisted(() => ({
  logger: {
    log: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("@nucleum/client/runtime/logging/logger", () => mockedModules);

vi.mock("@21n/shared-utils/obj.utils", () => ({
  deepCopy: (value: any) => value
}));

describe("client/runtime/geolocation/position", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      value: 800,
      configurable: true
    });
    Object.defineProperty(window, "innerHeight", {
      value: 600,
      configurable: true
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true
    });
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true
    });
    Object.defineProperty(navigator, "languages", {
      value: ["en-US"],
      configurable: true
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      value: 8,
      configurable: true
    });
    Object.defineProperty(navigator, "deviceMemory", {
      value: 8,
      configurable: true
    });
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true
    });
    Object.defineProperty(navigator, "plugins", {
      value: { length: 1 },
      configurable: true
    });
    Object.defineProperty(navigator, "mimeTypes", {
      value: { length: 1 },
      configurable: true
    });
    Object.defineProperty(navigator, "bluetooth", {
      value: {},
      configurable: true
    });
    Object.defineProperty(navigator, "userAgentData", {
      value: {
        getHighEntropyValues: vi.fn(async () => ({
          platform: "macOS",
          model: ""
        }))
      },
      configurable: true
    });
    (globalThis as any).screen = {
      colorDepth: 24,
      pixelDepth: 24,
      width: 1920,
      height: 1080
    };
    (globalThis as any).sessionStorage = {};
    (globalThis as any).localStorage = {};
    (globalThis as any).indexedDB = {};
    (globalThis as any).openDatabase = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
    delete (globalThis as any).browser;
    delete (globalThis as any).__plasmo;
    if (originalCanvasGetContext) {
      HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
    } else {
      delete (HTMLCanvasElement.prototype as any).getContext;
    }
    if (originalCanvasToDataURL) {
      HTMLCanvasElement.prototype.toDataURL = originalCanvasToDataURL;
    } else {
      delete (HTMLCanvasElement.prototype as any).toDataURL;
    }
  });

  it("rejects geolocation when the browser callback does not settle", async () => {
    vi.useFakeTimers();
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true
    });

    const result = expect(getGeoLocation()).rejects.toThrow(
      "Geolocation request timed out."
    );
    await vi.advanceTimersByTimeAsync(3000);
    await result;
    vi.useRealTimers();
  });

  it("resolves geolocation with caching", async () => {
    const getCurrentPosition = vi.fn((success: any) =>
      success({ coords: { latitude: 0, longitude: 0 } })
    );
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true
    });

    const first = await getGeoLocation();
    const second = await getGeoLocation();
    expect(first).toEqual(second);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
