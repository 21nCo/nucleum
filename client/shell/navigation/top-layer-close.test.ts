import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const mocks = vi.hoisted(() => ({
  navigation: {
    exitFullScreen: vi.fn(),
    toggleSearchParam: vi.fn(),
    closeResource: vi.fn()
  },
  bulkReset: vi.fn(),
  fullScreen: {
    path: undefined as string | undefined,
    hide: vi.fn()
  }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: mocks.navigation
}));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: { count: writable(0), reset: mocks.bulkReset }
}));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: {
    get: () => ({ path: mocks.fullScreen.path }),
    hide: mocks.fullScreen.hide
  }
}));

const { closeTopLayer, resolveCloseControlLabel } = await import("./top-layer");

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.fullScreen.path = undefined;
  visit("");
});

describe("closeTopLayer", () => {
  it("does nothing without an open layer", () => {
    expect(closeTopLayer()).toBeUndefined();
    expect(mocks.navigation.toggleSearchParam).not.toHaveBeenCalled();
    expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
  });

  it("clears the bulk selection", () => {
    visit("?page=node:a");
    expect(closeTopLayer({ bulkCount: 2 })).toBe("bulk");
    expect(mocks.bulkReset).toHaveBeenCalledTimes(1);
    expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
  });

  it("leaves full screen before closing the page", () => {
    visit("?page=node:a&max=true");
    expect(closeTopLayer()).toBe("full-screen");
    expect(mocks.navigation.exitFullScreen).toHaveBeenCalledTimes(1);
  });

  it("hides the full screen host of a maximized overlay", () => {
    mocks.fullScreen.path = "focus";
    visit("?overlay=focus&max=true");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.fullScreen.hide).toHaveBeenCalledTimes(1);
    expect(mocks.navigation.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("clears a maximized overlay without a full screen host", () => {
    visit("?overlay=focus&max=true");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.fullScreen.hide).not.toHaveBeenCalled();
    expect(mocks.navigation.toggleSearchParam).toHaveBeenCalledWith([
      "overlay",
      "max"
    ]);
  });

  it("hides the full screen host of an overlay whose page left full screen", () => {
    mocks.fullScreen.path = "focus";
    visit("?overlay=focus");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.fullScreen.hide).toHaveBeenCalledTimes(1);
    expect(mocks.navigation.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("clears an overlay and the panel by their parameters", () => {
    visit("?overlay=search&panel=navigator");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.navigation.toggleSearchParam).toHaveBeenLastCalledWith([
      "overlay"
    ]);
    visit("?panel=navigator");
    expect(closeTopLayer()).toBe("panel");
    expect(mocks.navigation.toggleSearchParam).toHaveBeenLastCalledWith([
      "panel"
    ]);
  });

  it("closes the navigator overlay drawn above an open page before the page", () => {
    visit("?page=node:a&overlay=navigator");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.navigation.toggleSearchParam).toHaveBeenLastCalledWith([
      "overlay"
    ]);
    expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
  });

  it("closes a page opened over another overlay before that overlay", () => {
    visit("?page=node:a&overlay=search");
    expect(closeTopLayer()).toBe("page");
  });

  it("closes the page and the split beside the base through closeResource", () => {
    visit("?page=node:a");
    expect(closeTopLayer()).toBe("page");
    expect(mocks.navigation.closeResource).toHaveBeenLastCalledWith({
      accessMode: "page",
      isHistoryBack: true
    });
    visit("?beside=node:b");
    expect(closeTopLayer()).toBe("beside-base");
    expect(mocks.navigation.closeResource).toHaveBeenLastCalledWith({
      accessMode: "beside",
      isHistoryBack: true
    });
  });
});

describe("resolveCloseControlLabel", () => {
  it("names the bulk selection the close control clears before the page", () => {
    const searchParams = new URLSearchParams("page=node:a");
    expect(resolveCloseControlLabel(searchParams, 2)).toBe("Clear selection");
    expect(resolveCloseControlLabel(searchParams, 0)).toBe("Close");
  });
});
