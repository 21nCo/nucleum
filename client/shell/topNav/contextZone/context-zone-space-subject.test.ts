import { describe, expect, it } from "vitest";
import {
  resolveContextZoneSubject,
  resolveSpaceBaseBack
} from "./context-zone-subject";
import { ContextZoneLayer } from "./context-zone";

describe("resolveContextZoneSubject for spaces", () => {
  it("resolves a space base page to its root space", () => {
    expect(
      resolveContextZoneSubject(
        { id: "base", layer: ContextZoneLayer.BASE },
        new URL("https://local.nucleum.app/space/abc/def")
      )
    ).toEqual({ kind: "resource", id: "space:abc" });
  });
});

describe("resolveSpaceBaseBack", () => {
  const base = "https://local.nucleum.app";

  it("returns to the space when a page opened over it has no trail parent", () => {
    expect(
      resolveSpaceBaseBack(new URL(`${base}/space/abc?page=node:1`), undefined)
    ).toEqual({ id: "space:abc" });
  });

  it("returns to the root space from a focused sub space path", () => {
    expect(
      resolveSpaceBaseBack(
        new URL(`${base}/space/abc/def?page=node:1`),
        undefined
      )
    ).toEqual({ id: "space:abc" });
  });

  it("keeps the trail parent when there is one", () => {
    expect(
      resolveSpaceBaseBack(new URL(`${base}/space/abc?page=node:2`), {
        id: "node:1"
      })
    ).toEqual({ id: "node:1" });
  });

  it("offers no back when no page is open or the base is not a space", () => {
    expect(
      resolveSpaceBaseBack(new URL(`${base}/space/abc`), undefined)
    ).toBeUndefined();
    expect(
      resolveSpaceBaseBack(new URL(`${base}/calendar?page=node:1`), undefined)
    ).toBeUndefined();
  });
});
