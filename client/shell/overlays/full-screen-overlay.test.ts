import { describe, expect, it } from "vitest";
import { resolveFullScreenOverlayPath } from "./full-screen-overlay";

describe("resolveFullScreenOverlayPath", () => {
  it("returns the overlay only while full screen is on", () => {
    expect(
      resolveFullScreenOverlayPath(
        new URLSearchParams("overlay=focus&max=true")
      )
    ).toBe("focus");
    expect(
      resolveFullScreenOverlayPath(new URLSearchParams("overlay=focus"))
    ).toBeUndefined();
    expect(
      resolveFullScreenOverlayPath(
        new URLSearchParams("page=node%3Aa&max=true")
      )
    ).toBeUndefined();
  });
});
