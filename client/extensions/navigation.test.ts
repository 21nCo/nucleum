import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openAppPath,
  openLink,
  resolveAppPath
} from "@nucleum/extensions/navigation";

const mockedModules = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("@nucleum/client/runtime/logging/logger", () => mockedModules);

const sendToBackground = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("@plasmohq/messaging", () => ({
  sendToBackground: (...args: any[]) => sendToBackground(...args)
}));

describe("client/extensions/navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).chrome = {
      runtime: {
        id: "runtime-id",
        lastError: null,
        sendMessage: vi.fn()
      },
      tabs: {
        sendMessage: vi.fn((tabId, message, cb) => cb("tab-response")),
        create: vi.fn((options, cb) => cb({ id: 123, ...options }))
      },
      storage: {
        local: {
          get: vi.fn(async () => ({ tab: { id: 456 } }))
        }
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete (globalThis as any).chrome;
  });

  it("opens links in new tabs", async () => {
    const tab = await openLink("https://example.com");
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: "https://example.com" },
      expect.any(Function)
    );
    expect(tab).toMatchObject({ id: 123 });
  });

  it("rejects when chrome tab creation fails", async () => {
    chrome.tabs.create = vi.fn((options, cb) => {
      chrome.runtime.lastError = new Error("fail");
      cb(undefined as any);
    });

    await expect(openLink("https://example.com")).rejects.toThrow("fail");
  });

  it("resolves and opens app paths", async () => {
    const resolved = resolveAppPath("dashboard");
    expect(resolved).toBe("https://web.memotron.app/dashboard");

    await openAppPath("home");
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: "https://web.memotron.app/home" },
      expect.any(Function)
    );
  });
});
