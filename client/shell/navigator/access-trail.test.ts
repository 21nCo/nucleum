import { describe, expect, it } from "vitest";
import {
  ACCESS_TRAIL_RECENT_LIMIT,
  createAccessTrails,
  endAccessTrail,
  extendAccessTrail,
  flattenAccessTrail,
  normalizeAccessTrails,
  resolveAccessTrailParent,
  resumeAccessTrail,
  startAccessTrail,
  syncAccessTrailPage,
  type AccessTrails
} from "./access-trail";

let keyCount = 0;
const opts = () => ({ key: `t${++keyCount}`, at: keyCount });

function activeId(trails: AccessTrails) {
  return trails.current?.nodes[trails.current.active]?.id;
}

describe("access trail", () => {
  it("extends the current trail and branches after going back", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    trails = extendAccessTrail(trails, "node:b", opts());
    trails = extendAccessTrail(trails, "node:c", opts());
    trails = syncAccessTrailPage(trails, "node:b", opts());
    expect(activeId(trails)).toBe("node:b");
    trails = extendAccessTrail(trails, "node:d", opts());
    expect(
      flattenAccessTrail(trails.current!).map((row) => [row.id, row.depth])
    ).toEqual([
      ["node:a", 0],
      ["node:b", 1],
      ["node:c", 2],
      ["node:d", 2]
    ]);
  });

  it("reuses a child followed twice instead of duplicating it", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    trails = extendAccessTrail(trails, "node:b", opts());
    trails = syncAccessTrailPage(trails, "node:a", opts());
    trails = extendAccessTrail(trails, "node:b", opts());
    expect(trails.current?.nodes).toHaveLength(2);
    expect(activeId(trails)).toBe("node:b");
  });

  it("resolves the parent used by back", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    expect(resolveAccessTrailParent(trails.current)).toBeUndefined();
    trails = extendAccessTrail(trails, "node:b", opts());
    expect(resolveAccessTrailParent(trails.current)).toBe(0);
  });

  it("archives the trail when the page closes or a fresh trail starts", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    trails = extendAccessTrail(trails, "node:a2", opts());
    trails = syncAccessTrailPage(trails, undefined, opts());
    expect(trails.current).toBeUndefined();
    expect(trails.recent.map((trail) => trail.nodes[0].id)).toEqual(["node:a"]);
    trails = startAccessTrail(trails, "node:b", opts());
    trails = extendAccessTrail(trails, "node:b2", opts());
    trails = startAccessTrail(trails, "node:c", opts());
    expect(trails.recent.map((trail) => trail.nodes[0].id)).toEqual([
      "node:b",
      "node:a"
    ]);
  });

  it("does not keep a trail with a single resource as a recent trail", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    trails = syncAccessTrailPage(trails, undefined, opts());
    expect(trails.current).toBeUndefined();
    expect(trails.recent).toEqual([]);
  });

  it("moves a matching recent trail to the top instead of duplicating it", () => {
    const visit = (from: AccessTrails, ids: string[]) => {
      let next = startAccessTrail(from, ids[0], opts());
      ids.slice(1).forEach((id) => {
        next = extendAccessTrail(next, id, opts());
      });
      return endAccessTrail(next);
    };
    let trails = visit(createAccessTrails(), ["node:a", "node:b"]);
    trails = visit(trails, ["node:x", "node:y"]);
    trails = visit(trails, ["node:a", "node:b"]);
    expect(trails.recent.map((trail) => trail.nodes.map((n) => n.id))).toEqual([
      ["node:a", "node:b"],
      ["node:x", "node:y"]
    ]);
    trails = visit(trails, ["node:b", "node:a"]);
    expect(trails.recent).toHaveLength(3);
  });

  it("drops single and duplicate recent trails from stored data", () => {
    const stored = normalizeAccessTrails({
      version: 1,
      recent: [
        {
          key: "1",
          nodes: [
            { id: "node:a", parent: -1 },
            { id: "node:b", parent: 0 }
          ]
        },
        { key: "2", nodes: [{ id: "node:a", parent: -1 }] },
        {
          key: "3",
          nodes: [
            { id: "node:a", parent: -1 },
            { id: "node:b", parent: 0 }
          ]
        }
      ]
    });
    expect(stored.recent.map((trail) => trail.key)).toEqual(["1"]);
  });

  it("starts a trail for a page outside the current one", () => {
    let trails = startAccessTrail(createAccessTrails(), "node:a", opts());
    trails = extendAccessTrail(trails, "node:b", opts());
    trails = syncAccessTrailPage(trails, "node:z", opts());
    expect(activeId(trails)).toBe("node:z");
    expect(trails.recent[0].nodes[0].id).toBe("node:a");
  });

  it("keeps a limited number of recent trails and resumes one", () => {
    let trails = createAccessTrails();
    for (let i = 0; i < ACCESS_TRAIL_RECENT_LIMIT + 3; i++) {
      trails = startAccessTrail(trails, `node:${i}`, opts());
      trails = extendAccessTrail(trails, `node:${i}-child`, opts());
    }
    trails = endAccessTrail(trails);
    expect(trails.recent).toHaveLength(ACCESS_TRAIL_RECENT_LIMIT);
    const key = trails.recent[2].key;
    trails = resumeAccessTrail(trails, key, 99);
    expect(trails.current?.key).toBe(key);
    expect(trails.recent.some((trail) => trail.key === key)).toBe(false);
  });

  it("discards malformed stored trails", () => {
    expect(normalizeAccessTrails({ version: 2 })).toEqual(createAccessTrails());
    const stored = normalizeAccessTrails({
      version: 1,
      current: { key: "k", nodes: [{ id: "node:a", parent: -1 }], active: 4 },
      recent: [{ key: "x", nodes: [{ id: "node:a", parent: 3 }] }, null]
    });
    expect(stored.current?.active).toBe(0);
    expect(stored.recent).toEqual([]);
  });
});
