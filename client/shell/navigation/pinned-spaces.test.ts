import { describe, expect, it, vi } from "vitest";
import { orderPinnedSpaces } from "./pinned-spaces";

vi.mock("@nucleum/datafn/datafn.store", () => ({ datafn: {} }));

describe("orderPinnedSpaces", () => {
  it("keeps the pinned order and drops missing spaces", () => {
    const spaces = [
      { id: "space:b", label: "B" },
      { id: "space:a", label: "A" }
    ];
    expect(
      orderPinnedSpaces(["space:a", "space:gone", "space:b"], spaces)
    ).toEqual([
      { id: "space:a", label: "A" },
      { id: "space:b", label: "B" }
    ]);
  });

  it("returns nothing before the records load", () => {
    expect(orderPinnedSpaces(["space:a"], undefined)).toEqual([]);
  });
});
