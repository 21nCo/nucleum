import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation: {} }));
vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: {}
}));

const { resolveTopLayer } = await import("./top-layer");

const params = (value: string) => new URLSearchParams(value);

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
