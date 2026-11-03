import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation: {} }));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: {}
}));

const { resolveTopLayer } = await import("./top-layer");

const params = (value: string) => new URLSearchParams(value);

describe("resolveTopLayer", () => {
  it("closes the overlay before the panel, bulk selection and page", () => {
    expect(
      resolveTopLayer(params("overlay=search&panel=navigator&page=node:1"), 2)
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

  it("skips the right panel for the top bar close button", () => {
    expect(
      resolveTopLayer(params("panel=navigator&page=node:1"), 0, {
        isIncludePanel: false
      })
    ).toBe("page");
  });
});
