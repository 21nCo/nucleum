import { afterEach, describe, expect, it } from "vitest";
import view, { PORTRAIT_WIDTH_FLOOR } from "@21n/ui/environment/view.store";

describe("view store portrait switch", () => {
  afterEach(() => view.refresh(1280, 800));

  it("puts the floor at 990px", () => {
    expect(PORTRAIT_WIDTH_FLOOR).toBe(990);
  });

  it.each([
    [881, 600],
    [900, 900],
    [925, 700],
    [950, 900],
    [989, 400]
  ])("uses the portrait layout for a %ix%i landscape window", (w, h) => {
    view.refresh(w, h);
    expect(view.get().isPortrait).toBe(true);
  });

  it.each([
    [990, 600],
    [1000, 900],
    [1280, 800]
  ])("keeps the landscape layout for a %ix%i window", (w, h) => {
    view.refresh(w, h);
    expect(view.get().isPortrait).toBe(false);
  });

  it("still uses the portrait layout for a wide window taller than it is wide", () => {
    view.refresh(1200, 1400);
    expect(view.get().isPortrait).toBe(true);
  });
});
