import { describe, expect, it } from "vitest";
import {
  ContextZoneLayer,
  isContextZoneAccessMode,
  nextCycleValue,
  resolveContextZoneEntry,
  type ContextZoneEntry
} from "./context-zone";

const content = (() => undefined) as unknown as ContextZoneEntry["content"];

function entry(key: number, id: string, layer: number): ContextZoneEntry {
  return { key, pane: { id, layer }, content };
}

describe("resolveContextZoneEntry", () => {
  it("shows nothing without registrations", () => {
    expect(resolveContextZoneEntry([], "base")).toBeUndefined();
  });

  it("follows the pane the user worked in last", () => {
    const base = entry(1, "base", ContextZoneLayer.BASE);
    const split = entry(2, "beside", ContextZoneLayer.BESIDE_BASE);
    expect(resolveContextZoneEntry([base, split], "base")).toBe(base);
    expect(resolveContextZoneEntry([base, split], "beside")).toBe(split);
  });

  it("falls back to the newest entry of the topmost layer", () => {
    const base = entry(1, "base", ContextZoneLayer.BASE);
    const page = entry(2, "page", ContextZoneLayer.PAGE);
    const newerPage = entry(3, "page", ContextZoneLayer.PAGE);
    expect(resolveContextZoneEntry([base, page, newerPage], undefined)).toBe(
      newerPage
    );
    expect(resolveContextZoneEntry([base, page], "overlay")).toBe(page);
  });
});

describe("resolveContextZoneEntry with covered layers", () => {
  it("ignores entries of layers the user cannot see", () => {
    const base = entry(1, "base", ContextZoneLayer.BASE);
    const visible = new Set<number>([
      ContextZoneLayer.PAGE,
      ContextZoneLayer.BESIDE_PAGE
    ]);
    expect(resolveContextZoneEntry([base], "base", visible)).toBeUndefined();
    const page = entry(2, "page", ContextZoneLayer.PAGE);
    expect(resolveContextZoneEntry([base, page], "base", visible)).toBe(page);
  });
});

describe("nextCycleValue", () => {
  it("wraps around and starts at the first value when nothing is selected", () => {
    expect(nextCycleValue(["a", "b", "c"], "b")).toBe("c");
    expect(nextCycleValue(["a", "b", "c"], "c")).toBe("a");
    expect(nextCycleValue(["a", "b"], undefined)).toBe("a");
    expect(nextCycleValue([], "a")).toBeUndefined();
  });
});

describe("isContextZoneAccessMode", () => {
  it("accepts page and split modes only", () => {
    expect(isContextZoneAccessMode("page")).toBe(true);
    expect(isContextZoneAccessMode("beside")).toBe(true);
    expect(isContextZoneAccessMode("besidePage")).toBe(true);
    expect(isContextZoneAccessMode("panel")).toBe(false);
    expect(isContextZoneAccessMode(undefined)).toBe(false);
  });
});
