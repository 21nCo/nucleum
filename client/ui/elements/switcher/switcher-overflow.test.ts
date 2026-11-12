import { describe, expect, it } from "vitest";
import { resolveSwitcherVisibleOptions } from "./switcher-overflow";

describe("switcher overflow", () => {
  const widths = [40, 120, 40, 40, 40];

  it("keeps every option when they all fit", () => {
    expect(
      resolveSwitcherVisibleOptions({
        widths,
        activeIndex: 1,
        available: 280,
        moreWidth: 40
      })
    ).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps options in order beside the More button", () => {
    expect(
      resolveSwitcherVisibleOptions({
        widths,
        activeIndex: 1,
        available: 240,
        moreWidth: 40
      })
    ).toEqual([0, 1, 2]);
  });

  it("always keeps the selected option, even at the end", () => {
    expect(
      resolveSwitcherVisibleOptions({
        widths: [40, 40, 40, 40, 120],
        activeIndex: 4,
        available: 240,
        moreWidth: 40
      })
    ).toEqual([0, 1, 4]);
  });

  it("keeps only the selected option when nothing else fits", () => {
    expect(
      resolveSwitcherVisibleOptions({
        widths,
        activeIndex: 1,
        available: 100,
        moreWidth: 40
      })
    ).toEqual([1]);
  });

  it("counts gaps and padding", () => {
    const input = {
      widths: [40, 40, 40, 40],
      activeIndex: 0,
      moreWidth: 40,
      gap: 4,
      padding: 8
    };
    expect(resolveSwitcherVisibleOptions({ ...input, available: 180 })).toEqual(
      [0, 1, 2, 3]
    );
    expect(resolveSwitcherVisibleOptions({ ...input, available: 179 })).toEqual(
      [0, 1]
    );
    expect(resolveSwitcherVisibleOptions({ ...input, available: 135 })).toEqual(
      [0]
    );
  });
});
