/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const mocks = vi.hoisted(() => ({
  fullScreenPath: undefined as string | undefined,
  navigation: {
    exitFullScreen: vi.fn(),
    minimizeFullScreen: vi.fn()
  }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: mocks.navigation
}));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: { count: writable(0), reset: vi.fn() }
}));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: { get: () => ({ path: mocks.fullScreenPath }), hide: vi.fn() }
}));

const { closeTopLayer, minimizeFullScreen } = await import("./top-layer");
const { isPageFullScreenOwner, isPageOpenedInFullScreen } = await import(
  "./full-screen-origin"
);

function at(search: string) {
  window.history.replaceState(null, "", `/space/s1${search}`);
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.fullScreenPath = undefined;
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
    expect(mocks.navigation.minimizeFullScreen).toHaveBeenCalledTimes(1);
    expect(mocks.navigation.exitFullScreen).not.toHaveBeenCalled();
  });

  it("only leaves full screen for a page that was already open", () => {
    at("?page=node:1&max=true");
    minimizeFullScreen();
    expect(mocks.navigation.exitFullScreen).toHaveBeenCalled();
    expect(mocks.navigation.minimizeFullScreen).not.toHaveBeenCalled();
  });

  it("is what Escape does on a page opened in full screen", () => {
    at("?page=node:1&max=true&maxOpened=true");
    expect(closeTopLayer()).toBe("full-screen");
    expect(mocks.navigation.minimizeFullScreen).toHaveBeenCalledTimes(1);
  });
});

describe("a page over a full screen overlay", () => {
  const params = (value: string) => new URLSearchParams(value);

  it("does not own full screen, so the top bar keeps Close", () => {
    expect(isPageFullScreenOwner(params("page=node:1&max=true"))).toBe(true);
    expect(
      isPageFullScreenOwner(
        params("overlay=focus&max=true&page=node:1"),
        "focus"
      )
    ).toBe(false);
    expect(
      isPageFullScreenOwner(
        params("overlay=search&max=true&page=node:1"),
        "focus"
      )
    ).toBe(true);
    expect(isPageFullScreenOwner(params("overlay=focus&max=true"))).toBe(
      false
    );
  });

  it("is never minimized by history, even when flagged", () => {
    mocks.fullScreenPath = "focus";
    at("?overlay=focus&max=true&page=node:1&maxOpened=true");
    expect(
      isPageOpenedInFullScreen(new URLSearchParams(window.location.search))
    ).toBe(false);
    minimizeFullScreen();
    expect(mocks.navigation.minimizeFullScreen).not.toHaveBeenCalled();
    expect(mocks.navigation.exitFullScreen).toHaveBeenCalledTimes(1);
  });
});
