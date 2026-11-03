import { describe, expect, it } from "vitest";
import {
  isTwoLineIdentity,
  resolveIdentityTypeLine
} from "./context-zone-subject";

describe("resolveIdentityTypeLine", () => {
  it("joins the type and the location", () => {
    expect(resolveIdentityTypeLine("node", "Library")).toBe("Node · Library");
  });

  it("shows only the type without a location", () => {
    expect(resolveIdentityTypeLine("space", undefined)).toBe("Space");
  });
});

describe("isTwoLineIdentity", () => {
  it("uses two lines in wide windows without a split", () => {
    expect(isTwoLineIdentity(1512, false)).toBe(true);
  });

  it("uses one line in split view or narrow windows", () => {
    expect(isTwoLineIdentity(1512, true)).toBe(false);
    expect(isTwoLineIdentity(1280, false)).toBe(false);
  });
});
