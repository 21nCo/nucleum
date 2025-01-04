import { describe, it, expect, vi } from "vitest";
import { cloneDown } from "./index";
import { performQueryOnBehalfOfUser } from "../../user/user";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

vi.mock("../../user/user", () => ({
  performQueryOnBehalfOfUser: vi.fn()
}));

describe("cloneDown", () => {
  it("should return error if no resources provided", async () => {
    const result = await cloneDown(
      { resources: [], isExtension: false },
      global.testEnv.agent
    );
    expect(result).toEqual({ error: "No resources found" });
  });

  it("should construct correct query for non-extension resources", async () => {
    const resources = [Resource.node, Resource.collection];
    const expectedQuery =
      "select *, meta::id(id) as id from node LIMIT 400;select *, meta::id(id) as id from collection LIMIT 400;";

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce([
      { success: true }
    ]);

    await cloneDown(
      { resources, isExtension: false, limit: 400 },
      global.testEnv.agent
    );

    expect(performQueryOnBehalfOfUser).toHaveBeenCalledWith(
      expectedQuery,
      global.testEnv.agent
    );
  });

  it("should construct correct query with limits for extension resources", async () => {
    const resources = [Resource.node, Resource.collection];
    const expectedQuery =
      "select * from node LIMIT 400;select * from collection LIMIT 400;";

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce([
      { success: true }
    ]);

    await cloneDown(
      { resources, isExtension: true, limit: 400 },
      global.testEnv.agent
    );

    expect(performQueryOnBehalfOfUser).toHaveBeenCalledWith(
      expectedQuery,
      global.testEnv.agent
    );
  });

  it("should return error on query failure", async () => {
    const resources = [Resource.node];
    vi.mocked(performQueryOnBehalfOfUser).mockRejectedValueOnce(
      new Error("Query failed")
    );

    const result = await cloneDown(
      { resources, isExtension: false },
      global.testEnv.agent
    );

    expect(result).toEqual({ error: "Sync failed" });
  });

  it("should return query response on success", async () => {
    const resources = [Resource.node];
    const mockResponse = [{ id: 1, name: "Test Account" }];

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce(mockResponse);

    const result = await cloneDown(
      { resources, isExtension: false },
      global.testEnv.agent
    );

    expect(result).toEqual(mockResponse);
  });
});
