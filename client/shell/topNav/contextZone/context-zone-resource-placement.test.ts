import { describe, expect, it } from "vitest";
import { isResourceInContextZone } from "./context-zone";

const wide = { isPortrait: false, isConstrainedWidth: false };

describe("isResourceInContextZone", () => {
  it("moves a page or split into the zone when a top bar hosts it", () => {
    expect(isResourceInContextZone(true, wide, "page")).toBe(true);
    expect(isResourceInContextZone(true, wide, "beside")).toBe(true);
  });

  it("keeps the resource in its page otherwise", () => {
    expect(isResourceInContextZone(false, wide, "page")).toBe(false);
    expect(
      isResourceInContextZone(
        true,
        { isPortrait: true, isConstrainedWidth: false },
        "page"
      )
    ).toBe(false);
    expect(
      isResourceInContextZone(
        true,
        { isPortrait: false, isConstrainedWidth: true },
        "page"
      )
    ).toBe(false);
    expect(isResourceInContextZone(true, wide, undefined)).toBe(false);
    expect(isResourceInContextZone(true, wide, "sheet")).toBe(false);
  });
});
