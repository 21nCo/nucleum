import { describe, expect, it } from "vitest";
import {
  createPendingLoad,
  loadAccessTrailStore
} from "./access-trail-store.test.setup";

const load = createPendingLoad();
const accessTrail = await loadAccessTrailStore({
  get: () => load.promise,
  set: async () => ({ ok: true })
});
import { resolveAccessTrailParent } from "./access-trail";

function activeNode() {
  const trail = accessTrail.get().current;
  return trail?.nodes[trail.active];
}

describe("accessTrail adopting the stored trail", () => {
  it("keeps positions recorded before the load pointing at their nodes", async () => {
    accessTrail.sync("node:b");
    accessTrail.extend("node:a");
    const recorded = accessTrail.position();
    load.resolve({
      version: 1,
      current: {
        key: "stored",
        nodes: [
          { id: "node:c", key: "c", parent: -1 },
          { id: "node:a", key: "a", parent: 0 },
          { id: "node:b", key: "b", parent: 1 }
        ],
        active: 2
      },
      recent: []
    });
    await load.promise;
    await Promise.resolve();

    expect(accessTrail.get().current?.key).toBe("stored");
    expect(accessTrail.resolve(recorded)?.trail).toBe("stored");
    accessTrail.sync("node:b");
    expect(activeNode()?.key).toBe("b");
    accessTrail.sync("node:a", recorded);
    const trail = accessTrail.get().current!;
    expect(activeNode()?.key).not.toBe("a");
    expect(activeNode()?.key).toBe(recorded?.node);
    expect(trail.nodes[resolveAccessTrailParent(trail)!].key).toBe("b");
  });
});
