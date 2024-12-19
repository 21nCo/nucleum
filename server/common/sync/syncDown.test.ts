import { describe, it, expect } from "vitest";
import { syncDown } from "./sync";
import { syncDown as syncDownV3 } from "./syncV3";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ISyncDownBody } from "$lib/shared/types/sync.type";

describe("syncDown", () => {
  it("should sync down records for given resources", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: Date.now(),
      resources: [Resource.node],
      dapId: "test-dap-123"
    };

    const result = await syncDown(body, global.testEnv.agent);

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
    expect(result).toHaveProperty("error");
  });
});

describe("syncDownV3", () => {
  it("should sync down records for given resources", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: Date.now() - 1000 * 60 * 60 * 24,
      resources: [Resource.node],
      dapId: "test-dap-123"
    };

    const result = await syncDownV3(body, global.testEnv.agent);
    expect(result).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    const body: ISyncDownBody = {
      lastSyncDown: Date.now(),
      resources: [], // Empty resources array should trigger error
      dapId: "test-dap-123"
    };

    const result = await syncDownV3(body, global.testEnv.agent);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("error");
  });
});
