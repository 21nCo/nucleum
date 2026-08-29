import { Resource } from "$lib/client/data/datafn/resource.enum";

export const mockResources = {
  node: {
    id: "test-node",
    type: Resource.node,
    data: {
      /* ... */
    }
  }
} as const;
