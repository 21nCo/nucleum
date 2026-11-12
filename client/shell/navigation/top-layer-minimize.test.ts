/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const mocks = vi.hoisted(() => ({
  navigation: {
    exitFullScreen: vi.fn(),
    toggleSearchParam: vi.fn(),
    closeResource: vi.fn()
  }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: mocks.navigation
}));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: { count: writable(0), reset: vi.fn() }
}));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: { get: () => ({ path: undefined }), hide: vi.fn() }
}));

const { closeTopLayer, minimizeFullScreen } = await import("./top-layer");
const { isPageOpenedInFullScreen } = await import("./full-screen-origin");

function at(search: string) {
  window.history.replaceState(null, "", `/space/s1${search}`);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("isPageOpenedInFullScreen", () => {
  it("needs both the open page and the opened-in-full-screen flag", () => {
    const params = (value: string) => new URLSearchParams(value);
    expect(isPageOpenedInFullScreen(params("page=node:1&maxOpened=true"))).toBe(
      true
    );
    expect(isPageOpenedInFullScreen(params("page=node:1&max=true"))).toBe(
      false
    );
    expect(isPageOpenedInFullScreen(params("maxOpened=true"))).toBe(false);
  });
});

describe("minimizeFullScreen", () => {
  it("closes a page that was opened straight into full screen", () => {
    at("?page=node:1&max=true&maxOpened=true");
    minimizeFullScreen();
    expect(mocks.navigation.closeResource).toHaveBeenCalledWith({
      accessMode: "page",
      isHistoryBack: true
    });
    expect(mocks.navigation.exitFullScreen).not.toHaveBeenCalled();
  });

  it("only leaves full screen for a page that was already open", () => {
    at("?page=node:1&max=true");
    minimizeFullScreen();
    expect(mocks.navigation.exitFullScreen).toHaveBeenCalled();
    expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
  });

  it("is what Escape does on a page opened in full screen", () => {
    at("?page=node:1&max=true&maxOpened=true");
    expect(closeTopLayer()).toBe("full-screen");
    expect(mocks.navigation.closeResource).toHaveBeenCalled();
  });
});
