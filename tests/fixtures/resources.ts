import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export const mockResources = {
  node: {
    id: "test-node",
    type: Resource.node,
    data: {
      /* ... */
    }
  }
} as const;
