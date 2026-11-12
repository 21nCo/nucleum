import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone,
  resolveContextZoneSubViewSource,
  type ContextZoneSubViewRegistration
} from "./context-zone";

let registrations: ContextZoneSubViewRegistration[] = [];

function registerSub(values: string[], active: string, paneId = "base") {
  const select = vi.fn();
  const registration = contextZone.registerSubViews(
    { id: paneId, layer: 0 },
    { views: { values, active, select } }
  );
  registrations.push(registration);
  return { select, registration };
}

afterEach(() => {
  registrations.forEach((registration) => registration.release());
  registrations = [];
});

describe("resolveContextZoneSubViewSource", () => {
  const views = { values: ["a"], active: "a", select: () => undefined };
  const source = (key: number, usedAt: number, paneId = "base") => ({
    key,
    usedAt,
    pane: { id: paneId, layer: 0 },
    source: { views }
  });

  it("prefers the most recently used switcher, then the newest", () => {
    expect(
      resolveContextZoneSubViewSource([source(1, 2), source(2, 1)], undefined)
        ?.key
    ).toBe(1);
    expect(
      resolveContextZoneSubViewSource([source(1, 0), source(2, 0)], undefined)
        ?.key
    ).toBe(2);
  });

  it("only considers switchers of the shown pane", () => {
    expect(
      resolveContextZoneSubViewSource(
        [source(1, 5, "other"), source(2, 0)],
        BASE_CONTEXT_ZONE_PANE
      )?.key
    ).toBe(2);
    expect(
      resolveContextZoneSubViewSource(
        [source(1, 0, "other")],
        BASE_CONTEXT_ZONE_PANE
      )
    ).toBeUndefined();
  });
});

describe("contextZone sub views", () => {
  it("steps the newest switcher with wrapping", () => {
    registerSub(["x", "y"], "x");
    const { select } = registerSub(["day", "week", "month"], "day");
    expect(contextZone.stepSub(-1)).toBe(true);
    expect(select).toHaveBeenLastCalledWith("month");
  });

  it("follows the switcher the user touched last", () => {
    const first = registerSub(["graph", "timeline"], "graph");
    registerSub(["day", "week"], "day");
    first.registration.touch();
    expect(contextZone.stepSub(1)).toBe(true);
    expect(first.select).toHaveBeenCalledWith("timeline");
  });

  it("does nothing without sub switchers or after release", () => {
    expect(contextZone.stepSub(1)).toBe(false);
    const { registration } = registerSub(["a", "b"], "a");
    registration.release();
    expect(contextZone.stepSub(1)).toBe(false);
  });
});
