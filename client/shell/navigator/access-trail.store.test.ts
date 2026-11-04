import { describe, expect, it, vi } from "vitest";

const load = await vi.hoisted(async () =>
  (await import("./access-trail-store.test.setup")).createPendingLoad()
);

vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./access-trail-store.test.setup")).datafnStoreWithKv({
    get: () => load.promise,
    set: async () => ({ ok: true })
  })
);

vi.mock("@nucleum/client/runtime/logging/logger", async () =>
  (await import("./access-trail-store.test.setup")).loggerStub()
);

import { accessTrail } from "./access-trail.store";

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
