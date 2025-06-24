import { describe, it, expect } from "vitest";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { relay } from ".";
import { FluxMethod } from "$lib/client/components/flux/flux.type";

/**
 * Integration test for DynamoDB provider selectMany method with mutation resource.
 * This test uses the actual DynamoDB implementation without mocking.
 */
describe("DynamoDB Provider - Relay Resource", () => {
  const resourceId = "goal:lpez0ylr97p5c";

  it("should query mutation resource using GSI1 index pattern", async () => {
    const result = await relay(
      {
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.mutation,
          params: { filters: { resourceId: resourceId } }
        }
      },
      global.testEnv.agent
    );
    console.log({ result });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should query accessLog resource", async () => {
    const result = await relay(
      {
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.accessLog,
          params: { filters: { resourceId: resourceId } }
        }
      },
      global.testEnv.agent
    );
    console.log({ result });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it.only("should query mutation resource with filters", async () => {
    const result = await relay(
      {
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.mutation,
          params: {
            filters: {
              action: ["create", "delete"],
              resource: ["node", "collection", "tz"],
              timestamp: {
                greaterThanOrEqual: 1750703400000,
                lessThanOrEqual: 1750789800000
              }
            }
          }
        }
      },
      global.testEnv.agent
    );
    console.log({ result });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
