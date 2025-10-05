import { kvStores } from "./kv.store";
import type { Resource } from "./resource.enum";
import { resourceStores } from "./resource.store";

export function resolveResourceStore(resource: Resource) {
  const store = resourceStores.get(resource);
  if (store) return store;
  return kvStores.get(resource);
}
