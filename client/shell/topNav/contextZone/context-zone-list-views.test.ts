import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone,
  resolveContextZoneSubViewSource,
  type ContextZoneSubViewSource
} from "./context-zone";

const source = (
  key: number,
  options: Partial<ContextZoneSubViewSource> = {}
): ContextZoneSubViewSource => ({
  key,
  pane: BASE_CONTEXT_ZONE_PANE,
  source: { views: { values: ["a", "b"], active: "a", select: () => {} } },
  usedAt: 0,
  ...options
});

let release: (() => void)[] = [];

afterEach(() => {
  release.forEach((item) => item());
  release = [];
});

describe("resolveContextZoneSubViewSource by axis and modal", () => {
  it("keeps horizontal and vertical switchers apart", () => {
    const sources = [source(1), source(2, { axis: "vertical" })];
    expect(resolveContextZoneSubViewSource(sources, undefined)?.key).toBe(1);
    expect(
      resolveContextZoneSubViewSource(sources, undefined, { axis: "vertical" })
        ?.key
    ).toBe(2);
  });

  it("uses only switchers inside a modal while a modal is in front", () => {
    const sources = [
      source(1, { axis: "vertical" }),
      source(2, { axis: "vertical", isInModal: true })
    ];
    expect(
      resolveContextZoneSubViewSource(sources, undefined, {
        axis: "vertical",
        isModalOpen: true
      })?.key
    ).toBe(2);
    expect(
      resolveContextZoneSubViewSource(sources, undefined, { axis: "vertical" })
        ?.key
    ).toBe(1);
  });

  it("ignores modal switchers when no modal is in front", () => {
    expect(
      resolveContextZoneSubViewSource(
        [source(1, { axis: "vertical", isInModal: true })],
        undefined,
        { axis: "vertical" }
      )
    ).toBeUndefined();
  });
});

describe("contextZone.stepSub for vertical lists", () => {
  it("steps the vertical list and leaves horizontal switchers alone", () => {
    const horizontal = vi.fn();
    const vertical = vi.fn();
    const h = contextZone.registerSubViews(BASE_CONTEXT_ZONE_PANE, {
      views: { values: ["x", "y"], active: "x", select: horizontal }
    });
    const v = contextZone.registerSubViews(
      BASE_CONTEXT_ZONE_PANE,
      { views: { values: ["a", "b", "c"], active: "a", select: vertical } },
      { axis: "vertical" }
    );
    release.push(h.release, v.release);
    expect(contextZone.stepSub(-1, { axis: "vertical" })).toBe(true);
    expect(vertical).toHaveBeenCalledWith("c");
    expect(horizontal).not.toHaveBeenCalled();
  });
});
