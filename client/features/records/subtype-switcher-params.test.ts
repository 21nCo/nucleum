import { describe, expect, it, vi } from "vitest";
import { routeSubTypeSwitcherParams } from "./subtype-switcher-params";

describe("routeSubTypeSwitcherParams", () => {
  it("sends the type to the subtype handler and toggles the rest", () => {
    const onSubType = vi.fn();
    const toggle = vi.fn();
    routeSubTypeSwitcherParams(
      { type: "pdf", starred: null },
      onSubType,
      toggle
    );
    expect(onSubType).toHaveBeenCalledWith("pdf");
    expect(toggle).toHaveBeenCalledWith({ starred: null });
  });

  it("does not toggle when only the type changes", () => {
    const onSubType = vi.fn();
    const toggle = vi.fn();
    routeSubTypeSwitcherParams({ type: "all" }, onSubType, toggle);
    expect(onSubType).toHaveBeenCalledWith("all");
    expect(toggle).not.toHaveBeenCalled();
  });

  it("toggles changes without a type unchanged", () => {
    const onSubType = vi.fn();
    const toggle = vi.fn();
    routeSubTypeSwitcherParams(["starred"], onSubType, toggle);
    routeSubTypeSwitcherParams({ archived: true }, onSubType, toggle);
    expect(toggle).toHaveBeenNthCalledWith(1, ["starred"]);
    expect(toggle).toHaveBeenNthCalledWith(2, { archived: true });
    expect(onSubType).not.toHaveBeenCalled();
  });

  it("ignores a cleared type", () => {
    const onSubType = vi.fn();
    const toggle = vi.fn();
    routeSubTypeSwitcherParams({ type: null }, onSubType, toggle);
    expect(onSubType).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });
});
