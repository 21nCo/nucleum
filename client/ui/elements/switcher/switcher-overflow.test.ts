import { describe, expect, it } from "vitest";
import {
  resolveSwitcherOverflow,
  resolveSwitcherRow,
  resolveSwitcherVisibleOptions
} from "./switcher-overflow";

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

  it("keeps narrow options that follow a wide one that does not fit", () => {
    expect(
      resolveSwitcherVisibleOptions({
        widths: [120, 20, 20, 50],
        activeIndex: 3,
        available: 130,
        moreWidth: 30
      })
    ).toEqual([1, 2, 3]);
  });

  describe("selected option without its label", () => {
    const input = {
      widths: [40, 40, 100],
      activeIndex: 2,
      moreWidth: 30,
      activeCompactWidth: 30
    };

    it("keeps the label while the selected option and More fit", () => {
      expect(resolveSwitcherOverflow({ ...input, available: 140 })).toEqual({
        visible: [2],
        isActiveCompact: false
      });
    });

    it("fits the other options beside the compact selected option", () => {
      expect(resolveSwitcherOverflow({ ...input, available: 100 })).toEqual({
        visible: [0, 2],
        isActiveCompact: true
      });
    });

    it("keeps every option when they fit beside the compact one", () => {
      expect(resolveSwitcherOverflow({ ...input, available: 120 })).toEqual({
        visible: [0, 1, 2],
        isActiveCompact: true
      });
    });

    it("keeps the label of an option with no compact width", () => {
      expect(
        resolveSwitcherOverflow({
          ...input,
          activeCompactWidth: undefined,
          available: 100
        })
      ).toEqual({ visible: [2], isActiveCompact: false });
    });
  });
});

describe("switcher row with trailing controls", () => {
  const input = {
    widths: [20, 40, 100],
    activeIndex: 2,
    moreWidth: 30,
    activeCompactWidth: 30,
    trailingWidth: 40
  };

  it("keeps every option and the trailing controls when they all fit", () => {
    expect(resolveSwitcherRow({ ...input, available: 200 })).toEqual({
      visible: [0, 1, 2],
      isActiveCompact: false,
      isTrailingInMenu: false
    });
  });

  it("fits the options in the room the trailing controls leave", () => {
    expect(resolveSwitcherRow({ ...input, available: 190 })).toEqual({
      visible: [0, 2],
      isActiveCompact: false,
      isTrailingInMenu: false
    });
  });

  it("keeps the trailing controls while the smallest form fits beside them", () => {
    expect(resolveSwitcherRow({ ...input, available: 100 })).toEqual({
      visible: [2],
      isActiveCompact: true,
      isTrailingInMenu: false
    });
  });

  it("moves the trailing controls into More only when the smallest form does not fit", () => {
    expect(resolveSwitcherRow({ ...input, available: 99 })).toEqual({
      visible: [2],
      isActiveCompact: true,
      isTrailingInMenu: true
    });
  });

  it("keeps the smallest form while the trailing controls are in More, though another option would fit", () => {
    expect(resolveSwitcherRow({ ...input, available: 90 })).toEqual({
      visible: [2],
      isActiveCompact: true,
      isTrailingInMenu: true
    });
  });

  it("brings the trailing controls back before any hidden option as room returns", () => {
    let wasTrailingShown = false;
    for (let available = 0; available <= 200; available++) {
      const row = resolveSwitcherRow({ ...input, available });
      if (row.visible.length > 1) {
        expect(row.isTrailingInMenu, `at ${available}px`).toBe(false);
      }
      if (!row.isTrailingInMenu && !wasTrailingShown) {
        wasTrailingShown = true;
        expect(row.visible, `trailing controls return at ${available}px`).toEqual([2]);
      }
      if (wasTrailingShown) {
        expect(row.isTrailingInMenu, `at ${available}px`).toBe(false);
      }
    }
    expect(wasTrailingShown).toBe(true);
  });

  it("keeps the label of a selected option with no compact width", () => {
    expect(
      resolveSwitcherRow({
        ...input,
        activeCompactWidth: undefined,
        available: 160
      })
    ).toEqual({ visible: [2], isActiveCompact: false, isTrailingInMenu: true });
  });

  it("keeps the trailing controls when every option fits without More", () => {
    expect(
      resolveSwitcherRow({
        widths: [50],
        activeIndex: 0,
        moreWidth: 66,
        trailingWidth: 48,
        available: 100
      })
    ).toEqual({ visible: [0], isActiveCompact: false, isTrailingInMenu: false });
  });

  it("never moves anything into More without trailing controls", () => {
    const { trailingWidth: _trailingWidth, ...options } = input;
    expect(resolveSwitcherRow({ ...options, available: 10 })).toEqual({
      ...resolveSwitcherOverflow({ ...options, available: 10 }),
      isTrailingInMenu: false
    });
  });
});
