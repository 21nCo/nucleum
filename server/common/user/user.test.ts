import { describe, it, expect, beforeAll } from "vitest";
import { performQueryOnBehalfOfUser } from "./user";
import {
  resolveCloneDownPaginateQuery,
  resolveCloneDownQuery,
  resolveSyncDownQuery
} from "../sync/sync.utils";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
describe("performQueryOnBehalfOfUser", () => {
  it("should execute a query on behalf of an agent", async () => {
    const testQuery = "array::first(SELECT count() FROM node group all);";

    const result = await performQueryOnBehalfOfUser(
      testQuery,
      global.testEnv.agent
    );
    console.log({ result: result[0] });
    expect(result).toBeDefined();
    expect(result[0].result.count).toBeDefined();
  });

  it("should throw an error if the query is invalid", async () => {
    const testQuery = "invalid query";

    const result = await performQueryOnBehalfOfUser(
      testQuery,
      global.testEnv.agent
    );
    console.log({ result });
    expect(result).toBeDefined();
    expect(result.code).toBe(400);
  });

  it("clone down query", async () => {
    const resources = [Resource.node, Resource.collection];
    const limit = 10;
    const cloneDownQuery = resolveCloneDownQuery(resources, {
      isExtension: false,
      limit
    });
    const result = await performQueryOnBehalfOfUser(
      cloneDownQuery,
      global.testEnv.agent
    );
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBe(resources.length);
    result.forEach((item) => {
      expect(Array.isArray(item.result)).toBe(true);
      expect(item.result.length).toBeLessThanOrEqual(limit);
    });
  });

  it("clone down paginate query", async () => {
    const limit = 10;
    const cloneDownQuery = resolveCloneDownPaginateQuery(Resource.node, {
      isExtension: false,
      limit,
      offset: 10
    });
    const result = await performQueryOnBehalfOfUser(
      cloneDownQuery,
      global.testEnv.agent
    );
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("sync down query", async () => {
    const resources = [Resource.node, Resource.collection];
    const limit = 50;
    const syncDownQuery = resolveSyncDownQuery(0, resources, "dapId", limit);
    const result = await performQueryOnBehalfOfUser(
      syncDownQuery,
      global.testEnv.agent
    );
    expect(result[0]).toBeDefined();
    if (result[0].result.length > 0) {
      expect(result[0].result.length).toBeLessThanOrEqual(limit);
    } else {
      expect(typeof result[0].result).toBe("number");
      expect(result[0].result).toBeGreaterThan(limit);
    }
  });
});
