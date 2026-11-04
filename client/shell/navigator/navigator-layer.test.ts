import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => undefined, setState: () => undefined }
}));

const { resolveNavigatorLayer, resolveNavigatorOverlayCloseParams } =
  await import("./navigator-layer");

function url(search: string) {
  return new URL(`https://app.test/home${search}`);
}

describe("resolveNavigatorLayer", () => {
  it("finds the navigator in the right panel or the overlay", () => {
    expect(resolveNavigatorLayer(url("?panel=navigator"))).toBe("panel");
    expect(resolveNavigatorLayer(url("?overlay=navigator"))).toBe("overlay");
  });

  it("is undefined when another action holds those layers", () => {
    expect(
      resolveNavigatorLayer(url("?panel=capture&overlay=search"))
    ).toBeUndefined();
  });

  it("closes only a navigator overlay for an open beside it", () => {
    expect(
      resolveNavigatorOverlayCloseParams(url("?overlay=navigator"))
    ).toEqual({ overlay: null });
    expect(
      resolveNavigatorOverlayCloseParams(url("?panel=navigator"))
    ).toBeUndefined();
    expect(
      resolveNavigatorOverlayCloseParams(url("?overlay=search"))
    ).toBeUndefined();
  });
});
