import { describe, expect, it } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import { isLibrarySwitcherInTopBar } from "./library-switcher-placement";

describe("isLibrarySwitcherInTopBar", () => {
  it("keeps Nucleum's switcher in the left panel", () => {
    expect(isLibrarySwitcherInTopBar(Product.NUCLEUM, 2)).toBe(false);
  });

  it("moves up to three resource types to the top bar", () => {
    expect(isLibrarySwitcherInTopBar(Product.MEMOTRON, 3)).toBe(true);
    expect(isLibrarySwitcherInTopBar(Product.POINTRON, 1)).toBe(true);
  });

  it("keeps more than three resource types in the left panel", () => {
    expect(isLibrarySwitcherInTopBar(Product.POINTRON, 4)).toBe(false);
  });

  it("keeps an empty library out of the top bar", () => {
    expect(isLibrarySwitcherInTopBar(Product.MEMOTRON, 0)).toBe(false);
  });
});
