import { describe, expect, it } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import { isLibrarySwitcherInTopBar } from "./library-switcher-placement";

const wide = { isContextZoneHosted: true, isConstrainedWidth: false };

describe("isLibrarySwitcherInTopBar", () => {
  it("keeps Nucleum's switcher in the left panel", () => {
    expect(isLibrarySwitcherInTopBar(Product.NUCLEUM, 2, wide)).toBe(false);
  });

  it("moves up to three resource types to the top bar", () => {
    expect(isLibrarySwitcherInTopBar(Product.MEMOTRON, 3, wide)).toBe(true);
    expect(isLibrarySwitcherInTopBar(Product.POINTRON, 1, wide)).toBe(true);
  });

  it("keeps more than three resource types in the left panel", () => {
    expect(isLibrarySwitcherInTopBar(Product.POINTRON, 4, wide)).toBe(false);
  });

  it("keeps an empty library out of the top bar", () => {
    expect(isLibrarySwitcherInTopBar(Product.MEMOTRON, 0, wide)).toBe(false);
  });

  it("keeps the switcher in the left panel at constrained widths", () => {
    expect(
      isLibrarySwitcherInTopBar(Product.MEMOTRON, 2, {
        isContextZoneHosted: true,
        isConstrainedWidth: true
      })
    ).toBe(false);
  });

  it("keeps the switcher in the left panel without a top bar", () => {
    expect(
      isLibrarySwitcherInTopBar(Product.MEMOTRON, 2, {
        isContextZoneHosted: false,
        isConstrainedWidth: false
      })
    ).toBe(false);
  });
});
