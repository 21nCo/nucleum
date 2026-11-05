import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation: {} }));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: {}
}));

const { isOverlayOnTop, resolveTopLayer } = await import("./top-layer");

const params = (value: string) => new URLSearchParams(value);

describe("resolveTopLayer", () => {
  it("closes the overlay before the panel, bulk selection and base splits", () => {
    expect(
      resolveTopLayer(params("overlay=search&panel=navigator&beside=node:2"), 2)
    ).toBe("overlay");
    expect(resolveTopLayer(params("panel=navigator&page=node:1"), 2)).toBe(
      "panel"
    );
    expect(resolveTopLayer(params("page=node:1"), 2)).toBe("bulk");
    expect(resolveTopLayer(params("page=node:1&besidePage=node:2"), 0)).toBe(
      "beside-page"
    );
    expect(resolveTopLayer(params("page=node:1"), 0)).toBe("page");
    expect(resolveTopLayer(params("beside=node:2"), 0)).toBe("beside-base");
    expect(resolveTopLayer(params(""), 0)).toBeUndefined();
  });

  it("closes a page opened from an overlay before that overlay", () => {
    expect(resolveTopLayer(params("overlay=focus&page=node:1"), 0)).toBe(
      "page"
    );
    expect(
      resolveTopLayer(params("overlay=focus&page=node:1&max=true"), 0)
    ).toBe("full-screen");
    expect(
      resolveTopLayer(params("overlay=focus&page=node:1&besidePage=node:2"), 0)
    ).toBe("beside-page");
    expect(
      resolveTopLayer(params("overlay=focus&panel=navigator&page=node:1"), 0)
    ).toBe("panel");
    expect(
      resolveTopLayer(params("overlay=focus&beside=node:2&page=node:1"), 0, {
        isIncludeFullScreen: false
      })
    ).toBe("page");
    expect(resolveTopLayer(params("overlay=focus&beside=node:2"), 0)).toBe(
      "overlay"
    );
  });

  it("skips the right panel for the top bar close button", () => {
    expect(
      resolveTopLayer(params("panel=navigator&page=node:1"), 0, {
        isIncludePanel: false
      })
    ).toBe("page");
  });
});

describe("resolveTopLayer with a full screen page", () => {
  it("leaves full screen before closing the page and after its split", () => {
    expect(resolveTopLayer(params("page=node:1&max=true"), 0)).toBe(
      "full-screen"
    );
    expect(
      resolveTopLayer(params("page=node:1&max=true&besidePage=node:2"), 0)
    ).toBe("beside-page");
    expect(resolveTopLayer(params("page=node:1&max=true"), 1)).toBe("bulk");
  });

  it("lets the top bar close button close a full screen page", () => {
    expect(
      resolveTopLayer(params("page=node:1&max=true"), 0, {
        isIncludeFullScreen: false
      })
    ).toBe("page");
  });

  it("ignores a stale full screen flag without a page", () => {
    expect(resolveTopLayer(params("max=true"), 0)).toBeUndefined();
  });
});

describe("isOverlayOnTop", () => {
  it("puts an overlay on top only with no page or when it is drawn above the page", () => {
    expect(isOverlayOnTop("search", undefined)).toBe(true);
    expect(isOverlayOnTop("search", "node:1")).toBe(false);
    expect(isOverlayOnTop("navigator", "node:1")).toBe(true);
    expect(isOverlayOnTop(undefined, undefined)).toBe(false);
  });
});
