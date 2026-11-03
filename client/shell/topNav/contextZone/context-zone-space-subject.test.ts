import { describe, expect, it } from "vitest";
import { resolveContextZoneSubject } from "./context-zone-subject";
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
