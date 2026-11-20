import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import view from "@21n/ui/environment/view.store";

const gotoPath = vi.hoisted(() => vi.fn());
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath }
}));

import { createBrowserLayout } from "./browser-layout";

function resizeTo(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height
  });
  window.dispatchEvent(new Event("resize"));
}

describe("browser layout resize", () => {
  let uninstall: () => void;

  function mountAt(width: number, height: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: width
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: height
    });
    view.refresh(width, height);
    const layout = createBrowserLayout();
    layout.initialize({ os: undefined } as never);
    uninstall = layout.install();
  }

  beforeEach(() => gotoPath.mockClear());
  afterEach(() => {
    uninstall();
    view.refresh(1280, 800);
  });

  it("goes home once when a width-only resize crosses the portrait floor", () => {
    mountAt(1000, 900);
    resizeTo(989, 900);
    expect(view.get().isPortrait).toBe(true);
    expect(gotoPath).toHaveBeenCalledTimes(1);
    expect(gotoPath).toHaveBeenCalledWith("/");

    gotoPath.mockClear();
    resizeTo(1000, 900);
    expect(view.get().isPortrait).toBe(false);
    expect(gotoPath).toHaveBeenCalledTimes(1);
    expect(gotoPath).toHaveBeenCalledWith("/");
  });

  it("stays put on resizes that keep the landscape layout above the floor", () => {
    mountAt(1000, 900);
    resizeTo(1200, 800);
    expect(gotoPath).not.toHaveBeenCalled();
  });

  it("stays put on resizes that keep the portrait layout", () => {
    mountAt(900, 700);
    resizeTo(800, 700);
    expect(view.get().isPortrait).toBe(true);
    expect(gotoPath).not.toHaveBeenCalled();
  });

  it("goes home exactly once on a real orientation flip", () => {
    mountAt(1200, 800);
    resizeTo(800, 1200);
    expect(gotoPath).toHaveBeenCalledTimes(1);
    expect(gotoPath).toHaveBeenCalledWith("/");

    gotoPath.mockClear();
    resizeTo(1200, 800);
    expect(gotoPath).toHaveBeenCalledTimes(1);
  });
});
