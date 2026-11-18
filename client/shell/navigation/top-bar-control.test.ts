/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const mocks = vi.hoisted(() => ({
  fullScreenPath: undefined as string | undefined,
  bulkCount: undefined as unknown as { set: (value: number) => void },
  navigation: {
    exitFullScreen: vi.fn(),
    minimizeFullScreen: vi.fn(),
    toggleSearchParam: vi.fn(),
    closeResource: vi.fn()
  },
  bulkReset: vi.fn(),
  fullScreenHide: vi.fn()
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: mocks.navigation
}));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => {
  const count = writable(0);
  mocks.bulkCount = count;
  return { bulkEditStore: { count, reset: mocks.bulkReset } };
});
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: {
    get: () => ({ path: mocks.fullScreenPath }),
    hide: mocks.fullScreenHide
  }
}));

const { closeTopBarLayer, resolveTopBarControl } = await import("./top-layer");

function at(search: string) {
  window.history.replaceState(null, "", `/space/s1${search}`);
}

function control(bulkCount = 0) {
  return resolveTopBarControl(
    new URLSearchParams(window.location.search),
    bulkCount,
    mocks.fullScreenPath
  );
}

function expectPageStaysMaximized() {
  expect(mocks.navigation.minimizeFullScreen).not.toHaveBeenCalled();
  expect(mocks.navigation.exitFullScreen).not.toHaveBeenCalled();
  expect(mocks.fullScreenHide).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.fullScreenPath = undefined;
  mocks.bulkCount.set(0);
  at("");
});

const maximizedPages = [
  ["opened straight into full screen", "&max=true&maxOpened=true"],
  ["maximized after it opened", "&max=true"]
] as const;

describe.each(maximizedPages)("top bar control over a page %s", (_, max) => {
  it("closes the navigator overlay drawn above the page first", () => {
    at(`?page=node:a${max}&overlay=navigator`);
    expect(control()).toBe("close");
    expect(closeTopBarLayer()).toBe("overlay");
    expect(mocks.navigation.toggleSearchParam).toHaveBeenCalledWith([
      "overlay"
    ]);
    expectPageStaysMaximized();
  });

  it("closes the page beside it first", () => {
    at(`?page=node:a${max}&besidePage=node:b`);
    expect(control()).toBe("close");
    expect(closeTopBarLayer()).toBe("beside-page");
    expect(mocks.navigation.closeResource).toHaveBeenCalledWith({
      accessMode: "besidePage",
      isHistoryBack: true
    });
    expectPageStaysMaximized();
  });

  it("clears a bulk selection first", () => {
    at(`?page=node:a${max}`);
    mocks.bulkCount.set(2);
    expect(control(2)).toBe("clear-selection");
    expect(closeTopBarLayer()).toBe("bulk");
    expect(mocks.bulkReset).toHaveBeenCalledTimes(1);
    expectPageStaysMaximized();
  });

  it("minimizes the page once it is the topmost layer", () => {
    at(`?page=node:a${max}`);
    expect(control()).toBe("minimize");
    expect(closeTopBarLayer()).toBe("full-screen");
    if (max.includes("maxOpened"))
      expect(mocks.navigation.minimizeFullScreen).toHaveBeenCalledTimes(1);
    else expect(mocks.navigation.exitFullScreen).toHaveBeenCalledTimes(1);
    expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
  });
});

describe("top bar control over a full screen overlay", () => {
  it("closes only the page and keeps the overlay in full screen", () => {
    mocks.fullScreenPath = "focus";
    at("?overlay=focus&max=true&page=node:a&maxOpened=true");
    expect(control()).toBe("close");
    expect(closeTopBarLayer()).toBe("page");
    expect(mocks.navigation.closeResource).toHaveBeenCalledWith({
      accessMode: "page",
      isHistoryBack: true
    });
    expectPageStaysMaximized();
  });
});
