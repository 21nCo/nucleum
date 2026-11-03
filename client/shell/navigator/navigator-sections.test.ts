import { describe, expect, it } from "vitest";
import { resolveFrequentContext } from "./navigator-sections";

describe("resolveFrequentContext", () => {
  it("uses the open record when it has from-here history", () => {
    expect(resolveFrequentContext("node:a", 3, undefined)).toBe("node:a");
  });

  it("shows the generic list without a page or from-here history", () => {
    expect(resolveFrequentContext(undefined, 3, undefined)).toBeUndefined();
    expect(resolveFrequentContext("node:a", 0, undefined)).toBeUndefined();
  });

  it("shows the generic list after the user clears the context", () => {
    expect(resolveFrequentContext("node:a", 3, "node:a")).toBeUndefined();
    expect(resolveFrequentContext("node:b", 3, "node:a")).toBe("node:b");
  });
});
