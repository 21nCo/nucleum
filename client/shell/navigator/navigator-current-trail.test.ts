import { describe, expect, it } from "vitest";
import { resolveCurrentTrailBandLabel } from "./navigator-sections";

describe("resolveCurrentTrailBandLabel", () => {
  it("counts the nodes of the current trail", () => {
    const trail = {
      key: "t",
      nodes: [
        { id: "node:a", key: "a", parent: -1 },
        { id: "node:b", key: "b", parent: 0 }
      ],
      active: 1,
      startedAt: 0,
      updatedAt: 0
    };
    expect(resolveCurrentTrailBandLabel(trail)).toBe("Current trail · 2");
  });
});
