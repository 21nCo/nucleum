import { kvStores } from "@21n/components/flux/resourceStores/kv.store";
import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { resourceStores } from "@21n/components/flux/resourceStores/resource.store";

export function resolveResourceStore(resource: Resource) {
  const store = resourceStores.get(resource);
  if (store) return store;
  return kvStores.get(resource);
}
