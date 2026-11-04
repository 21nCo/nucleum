import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/datafn/datafn.store", () => ({ datafn: {} }));

const { isNodeTitleInContextZone } = await import("./node-title-placement");

const wide = { isPortrait: false, isConstrainedWidth: false };

describe("isNodeTitleInContextZone", () => {
  it("moves the title to the zone for a page or split with a top bar", () => {
    expect(isNodeTitleInContextZone(true, wide, "page")).toBe(true);
    expect(isNodeTitleInContextZone(true, wide, "beside")).toBe(true);
  });

  it("keeps the title in the page otherwise", () => {
    expect(isNodeTitleInContextZone(false, wide, "page")).toBe(false);
    expect(
      isNodeTitleInContextZone(
        true,
        { isPortrait: true, isConstrainedWidth: false },
        "page"
      )
    ).toBe(false);
    expect(
      isNodeTitleInContextZone(
        true,
        { isPortrait: false, isConstrainedWidth: true },
        "page"
      )
    ).toBe(false);
    expect(isNodeTitleInContextZone(true, wide, undefined)).toBe(false);
    expect(isNodeTitleInContextZone(true, wide, "sheet")).toBe(false);
  });
});
