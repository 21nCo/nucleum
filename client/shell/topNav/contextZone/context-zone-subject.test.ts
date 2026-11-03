import { describe, expect, it } from "vitest";
import { resolveContextZoneSubject } from "./context-zone-subject";
import { ContextZoneLayer, resolveContextZonePane } from "./context-zone";

const url = (value: string) => new URL(value, "https://local.nucleum.app");

describe("resolveContextZoneSubject", () => {
  it("returns nothing without a pane", () => {
    expect(resolveContextZoneSubject(undefined, url("/calendar"))).toBe(
      undefined
    );
  });

  it("resolves the base page path", () => {
    expect(
      resolveContextZoneSubject(
        { id: "base", layer: ContextZoneLayer.BASE },
        url("/library/node/all/?page=node:a")
      )
    ).toEqual({ kind: "path", path: "library/node/all" });
  });

  it("resolves the record open as a page", () => {
    expect(
      resolveContextZoneSubject(
        { id: "page", layer: ContextZoneLayer.PAGE },
        url("/calendar?page=node:a&beside=collection:b")
      )
    ).toEqual({ kind: "resource", id: "node:a", accessMode: "page" });
  });

  it("resolves the record open beside the base page", () => {
    expect(
      resolveContextZoneSubject(
        { id: "beside", layer: ContextZoneLayer.BESIDE_BASE },
        url("/calendar?beside=collection:b")
      )
    ).toEqual({ kind: "resource", id: "collection:b", accessMode: "beside" });
  });

  it("resolves a page action opened as a page and the overlay path", () => {
    expect(
      resolveContextZoneSubject(
        { id: "page", layer: ContextZoneLayer.PAGE },
        url("/home?page=calendar")
      )
    ).toEqual({ kind: "path", path: "calendar" });
    expect(
      resolveContextZoneSubject(
        { id: "overlay", layer: ContextZoneLayer.OVERLAY },
        url("/home?overlay=settings")
      )
    ).toEqual({ kind: "path", path: "settings" });
  });

  it("returns nothing when the pane's parameter is missing", () => {
    expect(
      resolveContextZoneSubject(
        { id: "page", layer: ContextZoneLayer.PAGE },
        url("/home")
      )
    ).toBeUndefined();
  });
});

describe("resolveContextZonePane", () => {
  const base = { id: "base", layer: ContextZoneLayer.BASE };
  const page = { id: "page", layer: ContextZoneLayer.PAGE };
  const mounted = [
    { key: 1, pane: base },
    { key: 2, pane: page }
  ];

  it("prefers the pane of the shown entry", () => {
    expect(resolveContextZonePane({ pane: base }, mounted, "page")).toBe(base);
  });

  it("falls back to the pane the user worked in last", () => {
    expect(resolveContextZonePane(undefined, mounted, "base")).toBe(base);
  });

  it("falls back to the topmost visible pane", () => {
    expect(resolveContextZonePane(undefined, mounted, undefined)).toBe(page);
    expect(
      resolveContextZonePane(
        undefined,
        mounted,
        "page",
        new Set([ContextZoneLayer.BASE])
      )
    ).toBe(base);
  });
});
