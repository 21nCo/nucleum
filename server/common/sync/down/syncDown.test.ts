import { describe, it, expect } from "vitest";
import { syncDown } from "./index";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ISyncDownBody } from "$lib/shared/types/sync.type";

describe("syncDown", () => {
  it("should sync down records for given resources", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: Date.now() - 1000 * 60 * 60 * 24,
      resources: [Resource.node, Resource.link],
      dapId: "test-dap-123"
    };

    const result = await syncDown(body, global.testEnv.agent);
    console.log({ result: JSON.stringify(result) });
    expect(result).toBeDefined();
  });

  it.only("should sync down records for given resources - specific case", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: 1749725839610,
      resources: [Resource.goal],
      dapId: "mbkj0kl02uahds1xus2a4new"
    };

    const result = await syncDown(body, global.testEnv.agent);
    console.log({ result: JSON.stringify(result) });
    expect(result).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: Date.now(),
      resources: [], // Empty resources array should trigger error
      dapId: "test-dap-123"
    };

    const result = await syncDown(body, global.testEnv.agent);
    expect(result).toBeDefined();
    console.log({ result });
    expect(result).toHaveProperty("error");
  });
});
