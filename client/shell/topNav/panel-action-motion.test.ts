import { describe, expect, it } from "vitest";
import { resolveFlipKeyframes } from "./panel-action-motion";

describe("resolveFlipKeyframes", () => {
  it("returns nothing when the box did not move or resize", () => {
    expect(
      resolveFlipKeyframes({ left: 10, width: 40 }, { left: 10.2, width: 40 })
    ).toBeUndefined();
  });

  it("starts from the previous offset and width and ends at rest", () => {
    expect(
      resolveFlipKeyframes({ left: 900, width: 52 }, { left: 800, width: 300 })
    ).toEqual([
      { transform: "translateX(100px)", width: "52px", minWidth: "52px" },
      { transform: "translateX(0)", width: "300px", minWidth: "300px" }
    ]);
  });
});
