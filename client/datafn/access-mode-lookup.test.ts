import { afterEach, describe, expect, it } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { determineResourceAccessMode } from "@nucleum/datafn/resource.utils";

afterEach(() => window.history.replaceState({}, "", "/"));

describe("determineResourceAccessMode", () => {
  it("prefers the split mode when a resource is open beside the base and as the page", () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?page=node%3Aone&beside=node%3Aone"
    );
    expect(determineResourceAccessMode("node:one")).toBe(
      AccessMode.BESIDE_BASE
    );
  });

  it("returns undefined for a resource rendered in place", () => {
    window.history.replaceState(
      {},
      "",
      "/collection_browse?selected=node%3Aone"
    );
    expect(determineResourceAccessMode("node:one")).toBeUndefined();
  });
});
