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

describe("accessTrail while stored trails load", () => {
  it("keeps the trail key recorded before the load finishes", async () => {
    accessTrail.start("node:a");
    accessTrail.extend("node:b");
    accessTrail.extend("node:a");
    const before = accessTrail.position();
    load.resolve(null);
    await load.promise;
    await Promise.resolve();
    expect(accessTrail.position()).toEqual(before);
  });
});
