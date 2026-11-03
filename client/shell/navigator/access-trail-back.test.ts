import { describe, expect, it } from "vitest";
import {
  activateAccessTrailNode,
  createAccessTrails,
  extendAccessTrail,
  resolveAccessTrailBack,
  startAccessTrail
} from "./access-trail";

let keyCount = 0;
const opts = () => ({ key: `t${++keyCount}`, at: keyCount });

describe("resolveAccessTrailBack", () => {
  it("returns nothing without a trail or an open page", () => {
    const trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    expect(resolveAccessTrailBack(undefined, "node:a")).toBeUndefined();
    expect(resolveAccessTrailBack(trails.current, undefined)).toBeUndefined();
  });

  it("returns nothing for the page that started the trail", () => {
    const trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    expect(resolveAccessTrailBack(trails.current, "node:a")).toBeUndefined();
  });

  it("returns the node the open page was opened from", () => {
    const started = startAccessTrail(createAccessTrails(), "node:a", opts());
    const trails = extendAccessTrail(started, "node:b", opts());
    expect(resolveAccessTrailBack(trails.current, "node:b")).toEqual({
      index: 0,
      id: "node:a"
    });
  });

  it("returns nothing when the open page is not the active node", () => {
    const started = startAccessTrail(createAccessTrails(), "node:a", opts());
    const trails = extendAccessTrail(started, "node:b", opts());
    expect(resolveAccessTrailBack(trails.current, "node:c")).toBeUndefined();
  });

  it("follows the active node after going back in the trail", () => {
    const started = startAccessTrail(createAccessTrails(), "node:a", opts());
    const extended = extendAccessTrail(
      extendAccessTrail(started, "node:b", opts()),
      "node:c",
      opts()
    );
    const trails = activateAccessTrailNode(extended, 1, 99);
    expect(resolveAccessTrailBack(trails.current, "node:b")?.id).toBe("node:a");
  });
});
