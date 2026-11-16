import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone,
  ContextZoneLayer,
  resolveContextZoneViews,
  stepCycleValue,
  type ContextZoneViews
} from "./context-zone";

const content = (() => {}) as never;
let release: (() => void)[] = [];

function registerViews(values: string[], active: string | undefined) {
  const select = vi.fn();
  const views: ContextZoneViews = { values, active, select };
  release.push(
    contextZone.register(BASE_CONTEXT_ZONE_PANE, { content, views })
  );
  return select;
}

afterEach(() => {
  release.forEach((unregister) => unregister());
  release = [];
});

describe("stepCycleValue", () => {
  it("steps forward and backward with wrapping", () => {
    expect(stepCycleValue(["a", "b", "c"], "c", 1)).toBe("a");
    expect(stepCycleValue(["a", "b", "c"], "a", -1)).toBe("c");
    expect(stepCycleValue(["a", "b", "c"], "b", -1)).toBe("a");
  });

  it("starts at an end when the current value is missing", () => {
    expect(stepCycleValue(["a", "b"], undefined, 1)).toBe("a");
    expect(stepCycleValue(["a", "b"], "x", -1)).toBe("b");
    expect(stepCycleValue([], "a", 1)).toBeUndefined();
  });
});

describe("contextZone views", () => {
  it("steps the shown entry's views", () => {
    const select = registerViews(["a", "b", "c"], "a");
    expect(contextZone.step(-1)).toBe(true);
    expect(select).toHaveBeenLastCalledWith("c");
    expect(contextZone.step(1)).toBe(true);
    expect(select).toHaveBeenLastCalledWith("b");
  });

  it("selects a view by position and ignores missing positions", () => {
    const select = registerViews(["a", "b"], "a");
    expect(contextZone.selectAt(1)).toBe(true);
    expect(select).toHaveBeenCalledWith("b");
    expect(contextZone.selectAt(5)).toBe(false);
  });

  it("does not reselect the active view", () => {
    const select = registerViews(["a", "b"], "b");
    expect(contextZone.selectAt(1)).toBe(true);
    expect(select).not.toHaveBeenCalled();
  });

  it("does nothing without views", () => {
    release.push(contextZone.register(BASE_CONTEXT_ZONE_PANE, { content }));
    expect(contextZone.step(1)).toBe(false);
    expect(contextZone.selectAt(0)).toBe(false);
  });
});

describe("contextZone side panel views", () => {
  it("falls back to a registered page switcher when the entry has none", () => {
    release.push(contextZone.register(BASE_CONTEXT_ZONE_PANE, { content }));
    const select = vi.fn();
    release.push(
      contextZone.registerViews(BASE_CONTEXT_ZONE_PANE, {
        views: { values: ["nodes", "tasks"], active: "nodes", select }
      })
    );
    expect(contextZone.step(1)).toBe(true);
    expect(select).toHaveBeenCalledWith("tasks");
  });

  it("prefers the shown entry's own views", () => {
    const entrySelect = registerViews(["a", "b"], "a");
    const sideSelect = vi.fn();
    release.push(
      contextZone.registerViews(BASE_CONTEXT_ZONE_PANE, {
        views: { values: ["x", "y"], active: "x", select: sideSelect }
      })
    );
    expect(contextZone.selectAt(1)).toBe(true);
    expect(entrySelect).toHaveBeenCalledWith("b");
    expect(sideSelect).not.toHaveBeenCalled();
  });

  it("stops using a page switcher once it unregisters", () => {
    const unregister = contextZone.registerViews(BASE_CONTEXT_ZONE_PANE, {
      views: { values: ["x", "y"], active: "x", select: vi.fn() }
    });
    unregister();
    expect(contextZone.step(1)).toBe(false);
  });
});

describe("contextZone page views on covered layers", () => {
  const besideBase = { id: "beside-base", layer: ContextZoneLayer.BESIDE_BASE };

  afterEach(() => contextZone.setVisibleLayers(undefined));

  function registerBesideBaseViews() {
    const select = vi.fn();
    release.push(
      contextZone.registerViews(besideBase, {
        views: { values: ["view", "chat"], active: "view", select }
      })
    );
    return select;
  }

  it("ignores page switchers on hidden layers when no pane is shown", () => {
    const views = { values: ["a"], active: "a", select: vi.fn() };
    const sources = [{ key: 1, pane: besideBase, source: { views } }];
    expect(
      resolveContextZoneViews(
        undefined,
        sources,
        undefined,
        new Set([ContextZoneLayer.OVERLAY])
      )
    ).toBeUndefined();
    expect(
      resolveContextZoneViews(
        undefined,
        sources,
        undefined,
        new Set([ContextZoneLayer.BASE, ContextZoneLayer.BESIDE_BASE])
      )
    ).toBe(views);
  });

  it("does not switch a page covered by a full-screen overlay", () => {
    const select = registerBesideBaseViews();
    contextZone.setVisibleLayers([ContextZoneLayer.OVERLAY]);
    expect(contextZone.resolveViews()).toBeUndefined();
    expect(contextZone.step(1)).toBe(false);
    expect(contextZone.selectAt(1)).toBe(false);
    expect(select).not.toHaveBeenCalled();
  });

  it("switches the page again once the overlay closes", () => {
    const select = registerBesideBaseViews();
    contextZone.setVisibleLayers([ContextZoneLayer.OVERLAY]);
    contextZone.setVisibleLayers([
      ContextZoneLayer.BASE,
      ContextZoneLayer.BESIDE_BASE
    ]);
    expect(contextZone.step(1)).toBe(true);
    expect(select).toHaveBeenLastCalledWith("chat");
    expect(contextZone.selectAt(1)).toBe(true);
  });
});
