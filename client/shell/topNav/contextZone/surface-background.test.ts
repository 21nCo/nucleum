import { describe, expect, it } from "vitest";
import {
  isTransparentColor,
  resolveSurfaceBackground
} from "./surface-background";

describe("isTransparentColor", () => {
  it("treats transparent and zero alpha as transparent", () => {
    expect(isTransparentColor("transparent")).toBe(true);
    expect(isTransparentColor("rgba(0, 0, 0, 0)")).toBe(true);
    expect(isTransparentColor("rgb(0 0 0 / 0)")).toBe(true);
    expect(isTransparentColor(undefined)).toBe(true);
  });

  it("treats painted colors as opaque", () => {
    expect(isTransparentColor("rgb(255, 255, 255)")).toBe(false);
    expect(isTransparentColor("rgba(20, 20, 20, 0.9)")).toBe(false);
  });
});

describe("resolveSurfaceBackground", () => {
  it("returns the first painted background up the tree", () => {
    const outer = document.createElement("div");
    const middle = document.createElement("div");
    const inner = document.createElement("span");
    outer.append(middle);
    middle.append(inner);
    const colors = new Map<Element, string>([
      [outer, "rgb(1, 2, 3)"],
      [middle, "rgba(0, 0, 0, 0)"],
      [inner, "transparent"]
    ]);
    expect(
      resolveSurfaceBackground(inner, (element) => colors.get(element) ?? "")
    ).toBe("rgb(1, 2, 3)");
  });

  it("returns nothing when no ancestor paints a background", () => {
    const element = document.createElement("div");
    expect(
      resolveSurfaceBackground(element, () => "transparent")
    ).toBeUndefined();
    expect(resolveSurfaceBackground(null)).toBeUndefined();
  });
});
