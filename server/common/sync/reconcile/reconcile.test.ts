import { describe, it, expect, beforeEach } from "vitest";
import { reconcile } from ".";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

describe("reconcile", () => {
  beforeEach(async () => {
    await global.testEnv.cleanup();
  });

  it("should handle node resource reconciliation successfully", async () => {
    const result = await reconcile(
      {
        resources: [Resource.node],
        isExtension: false
      },
      global.testEnv.agent
    );
    expect(result).toBeUndefined();
  });

  it("should handle empty resources array", async () => {
    const result = await reconcile(
      {
        resources: [],
        isExtension: false
      },
      global.testEnv.agent
    );

    expect(result).toBeUndefined();
  });

  it("should handle unknown resource types", async () => {
    const result = await reconcile(
      {
        resources: ["unknown_resource" as Resource],
        isExtension: false
      },
      global.testEnv.agent
    );

    expect(result).toBeUndefined();
  });

  it("should return error object when database operation fails", async () => {
    // Create an invalid state that would cause a database error
    global.testEnv.agent.db = "nonexistent_db";

    const result = await reconcile(
      {
        resources: [Resource.node],
        isExtension: false
      },
      global.testEnv.agent
    );

    expect(result).toEqual({ error: "Sync failed" });
  });
});
