import { afterEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

import view from "@21n/ui/environment/view.store";

const mocks = vi.hoisted(() => ({
  navigation: {
    exitFullScreen: vi.fn(),
    minimizeFullScreen: vi.fn(),
    toggleSearchParam: vi.fn(),
    // Closing the page drops it with its split and full screen, as
    // navigation.closeResource does for the page access mode.
    closeResource: vi.fn(() => {
      window.history.replaceState(null, "", "/");
    })
  },
  fullScreen: {
    path: undefined as string | undefined,
    hide: vi.fn()
  }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: mocks.navigation
}));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: { count: writable(0), reset: vi.fn() }
}));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: {
    get: () => ({ path: mocks.fullScreen.path }),
    hide: mocks.fullScreen.hide
  }
}));

const { closeTopLayer, resolveTopBarControl, resolveTopLayer } = await import(
  "./top-layer"
);

const SPLIT = "?page=node:a&besidePage=node:b";
const MAXIMIZED = "?page=node:a&max=true";
const OPENED_MAXIMIZED = "?page=node:b&max=true&maxOpened=true";

/** Opens the URL as a direct link. */
function openLink(search: string) {
  window.history.replaceState(null, "", `/space/s1${search}`);
}

/** Restores the URL with browser Back after a reset to home. */
async function restoreWithBack(search: string) {
  openLink(search);
  window.history.pushState(null, "", "/");
  const popped = new Promise((resolve) =>
    window.addEventListener("popstate", resolve, { once: true })
  );
  window.history.back();
  await popped;
  expect(window.location.search).toBe(search);
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.fullScreen.path = undefined;
  window.history.replaceState(null, "", "/");
  view.refresh(1024, 768);
});

describe.each([
  { name: "under the portrait floor", width: 989, height: 900 },
  { name: "in a real portrait window", width: 800, height: 1200 }
])("closeTopLayer $name", ({ width, height }) => {
  describe.each([
    { url: "a split beside the page", search: SPLIT },
    { url: "a maximized page", search: MAXIMIZED }
  ])("with $url", ({ search }) => {
    it.each([
      { via: "a direct link", open: async () => openLink(search) },
      { via: "browser Back", open: () => restoreWithBack(search) }
    ])("closes the visible page first after $via", async ({ open }) => {
      view.refresh(width, height);
      expect(view.get().isPortrait).toBe(true);
      await open();

      expect(closeTopLayer()).toBe("page");
      expect(mocks.navigation.closeResource).toHaveBeenCalledWith({
        accessMode: "page",
        isHistoryBack: true
      });
      expect(mocks.navigation.exitFullScreen).not.toHaveBeenCalled();
      expect(mocks.navigation.minimizeFullScreen).not.toHaveBeenCalled();
      expect(closeTopLayer()).toBeUndefined();
    });
  });

  it.each([
    { via: "a direct link", open: async () => openLink(OPENED_MAXIMIZED) },
    { via: "browser Back", open: () => restoreWithBack(OPENED_MAXIMIZED) }
  ])(
    "returns a page opened into full screen to its origin after $via",
    async ({ open }) => {
      view.refresh(width, height);
      await open();

      expect(closeTopLayer()).toBe("page");
      expect(mocks.navigation.minimizeFullScreen).toHaveBeenCalledTimes(1);
      expect(mocks.navigation.closeResource).not.toHaveBeenCalled();
      expect(mocks.navigation.exitFullScreen).not.toHaveBeenCalled();
    }
  );

  it("still closes a full screen overlay first", () => {
    view.refresh(width, height);
    mocks.fullScreen.path = "focus";
    openLink("?overlay=focus&max=true");
    expect(closeTopLayer()).toBe("overlay");
    expect(mocks.fullScreen.hide).toHaveBeenCalledTimes(1);
  });
});

describe("landscape above the portrait floor", () => {
  it("keeps the split and full screen as the top layers", () => {
    view.refresh(1000, 900);
    expect(view.get().isPortrait).toBe(false);
    expect(resolveTopLayer(new URLSearchParams(SPLIT), 0)).toBe("beside-page");
    expect(resolveTopLayer(new URLSearchParams(MAXIMIZED), 0)).toBe(
      "full-screen"
    );
    expect(resolveTopBarControl(new URLSearchParams(MAXIMIZED), 0)).toBe(
      "minimize"
    );
  });
});
