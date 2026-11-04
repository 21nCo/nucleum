import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";

const mocks = vi.hoisted(() => ({
  fullScreen: { path: undefined as string | undefined, hide: vi.fn() }
}));

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  fullScreen: {
    get: () => ({ path: mocks.fullScreen.path }),
    hide: mocks.fullScreen.hide
  }
}));

const { navigation } = await import("./navigation");

let gotoPath: MockInstance<typeof navigation.gotoPath>;

function visit(search: string) {
  window.history.replaceState(null, "", `/calendar${search}`);
}

function lastUrl() {
  const path = gotoPath.mock.calls.at(-1)?.[0] as string;
  return new URL(path, window.location.origin);
}

beforeEach(() => {
  gotoPath = vi
    .spyOn(navigation, "gotoPath")
    .mockImplementation(async () => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  mocks.fullScreen.hide.mockClear();
  mocks.fullScreen.path = undefined;
  visit("");
});

describe("a page opened over a full screen overlay", () => {
  it("leaves the overlay in full screen when the page closes", () => {
    mocks.fullScreen.path = "focus";
    visit("?overlay=focus&max=true&page=node%3Aa&pageAt=1");
    navigation.closeResource({ id: "node:a", accessMode: AccessMode.PAGE });
    const url = lastUrl();
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("pageAt")).toBe(false);
    expect(url.searchParams.get("overlay")).toBe("focus");
    expect(url.searchParams.get("max")).toBe("true");
  });

  it("still leaves full screen with a page over an overlay that is not full screen", () => {
    visit("?overlay=search&max=true&page=node%3Aa");
    navigation.closeResource({ accessMode: AccessMode.PAGE });
    const url = lastUrl();
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("max")).toBe(false);
    expect(url.searchParams.get("overlay")).toBe("search");
  });

  it("hands the full screen overlay over to its player when the page leaves full screen", () => {
    mocks.fullScreen.path = "focus";
    visit("?overlay=focus&max=true&page=node%3Aa");
    navigation.exitFullScreen();
    expect(mocks.fullScreen.hide).toHaveBeenCalledTimes(1);
    expect(gotoPath).not.toHaveBeenCalled();
  });

  it("only drops max when the page leaves full screen on its own", () => {
    visit("?page=node%3Aa&max=true");
    navigation.exitFullScreen();
    expect(mocks.fullScreen.hide).not.toHaveBeenCalled();
    expect(lastUrl().searchParams.has("max")).toBe(false);
    expect(lastUrl().searchParams.get("page")).toBe("node:a");
  });
});
