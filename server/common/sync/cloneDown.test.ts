import { describe, it, expect, vi, beforeEach } from "vitest";
import { cloneDown, cloneDownPaginate } from "./sync";
import { performQueryOnBehalfOfUser } from "../user/user";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ICloneDownPaginateBody } from "$lib/shared/types/sync.type";

vi.mock("../user/user", () => ({
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
      "select *, meta::id(id) as id from node LIMIT 1000;select *, meta::id(id) as id from collection LIMIT 1000;";

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce([
      { success: true }
    ]);

    await cloneDown({ resources, isExtension: false }, global.testEnv.agent);

    expect(performQueryOnBehalfOfUser).toHaveBeenCalledWith(
      expectedQuery,
      global.testEnv.agent
    );
  });

  it("should construct correct query with limits for extension resources", async () => {
    const resources = [Resource.node, Resource.collection];
    const expectedQuery =
      "select * from node LIMIT 1000;select * from collection LIMIT 1000;";

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce([
      { success: true }
    ]);

    await cloneDown({ resources, isExtension: true }, global.testEnv.agent);

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

describe("cloneDownPaginate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should construct correct query with limit and offset", async () => {
    const resource = Resource.node;
    const body: ICloneDownPaginateBody = {
      resource,
      offset: 100,
      limit: 50,
      isExtension: false
    };
    const expectedQuery =
      "select *, meta::id(id) as id from node LIMIT 50 START 100;";

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce([
      { success: true }
    ]);

    const result = await cloneDownPaginate(body, global.testEnv.agent);
    expect(performQueryOnBehalfOfUser).toHaveBeenCalledWith(
      expectedQuery,
      global.testEnv.agent
    );
    expect(result).toEqual([{ success: true }]);
  });

  it("should return error on query failure", async () => {
    const resource = Resource.node;
    vi.mocked(performQueryOnBehalfOfUser).mockRejectedValueOnce(
      new Error("Query failed")
    );

    const result = await cloneDownPaginate(
      { resource, offset: 0, limit: 10, isExtension: false },
      global.testEnv.agent
    );

    expect(result).toEqual({ error: "Sync failed" });
  });

  it("should return query response on success", async () => {
    const resource = Resource.node;
    const mockResponse = [{ id: 1, name: "Test Account" }];

    vi.mocked(performQueryOnBehalfOfUser).mockResolvedValueOnce(mockResponse);

    const result = await cloneDownPaginate(
      { resource, offset: 0, limit: 10, isExtension: false },
      global.testEnv.agent
    );

    expect(result).toEqual(mockResponse);
  });
});
