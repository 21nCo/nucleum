import { describe, expect, it } from "vitest";
import { resolveContextZoneSubject } from "./context-zone-subject";
import {
  ContextZoneLayer,
  resolveContextZonePane,
  resolveContextZonePaneEntry
} from "./context-zone";

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
  const beside = { id: "beside", layer: ContextZoneLayer.BESIDE_BASE };
  const page = { id: "page", layer: ContextZoneLayer.PAGE };
  const mounted = [
    { key: 1, pane: base },
    { key: 2, pane: beside }
  ];
  const baseVisible = new Set([
    ContextZoneLayer.BASE,
    ContextZoneLayer.BESIDE_BASE
  ]);

  it("follows the pane the user worked in last even without its own entry", () => {
    const registered = [{ key: 3, pane: beside }];
    expect(
      resolveContextZonePane(registered, mounted, "base", baseVisible)
    ).toBe(base);
  });

  it("falls back to the pane of the entry the zone would show", () => {
    const registered = [{ key: 3, pane: base }];
    expect(
      resolveContextZonePane(registered, mounted, undefined, baseVisible)
    ).toBe(base);
  });

  it("falls back to the newest pane of the topmost visible layer", () => {
    expect(resolveContextZonePane([], mounted, undefined, baseVisible)).toBe(
      beside
    );
  });

  it("ignores an active pane on a hidden layer", () => {
    const covered = [...mounted, { key: 4, pane: page }];
    expect(
      resolveContextZonePane(
        [],
        covered,
        "base",
        new Set([ContextZoneLayer.PAGE])
      )
    ).toBe(page);
  });
});

describe("resolveContextZonePaneEntry", () => {
  const base = { id: "base", layer: ContextZoneLayer.BASE };
  const beside = { id: "beside", layer: ContextZoneLayer.BESIDE_BASE };

  it("shows no entry for a pane that registered none", () => {
    const registered = [{ key: 1, pane: beside }];
    expect(
      resolveContextZonePaneEntry(registered, base, "base")
    ).toBeUndefined();
  });

  it("shows the newest entry of the pane", () => {
    const registered = [
      { key: 1, pane: base },
      { key: 2, pane: beside },
      { key: 3, pane: base }
    ];
    expect(resolveContextZonePaneEntry(registered, base, "base")?.key).toBe(3);
  });

  it("falls back to the usual entry without a pane", () => {
    const registered = [{ key: 1, pane: beside }];
    expect(
      resolveContextZonePaneEntry(registered, undefined, undefined)?.key
    ).toBe(1);
  });
});
