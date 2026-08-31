import { Resource } from "@21n/data/datafn/resource.enum";

export const mockResources = {
  node: {
    id: "test-node",
    type: Resource.node,
    data: {
      /* ... */
    }
  }
} as const;
