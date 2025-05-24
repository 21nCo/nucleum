import { localCacheableStores, remoteOnlyStores } from "$local/localStoresMap";
import type { Resource } from "./resource.enum";
import type { ResourceStore } from "./resource.store";

export function resolveResourceStore(resource: Resource) {
  return [...localCacheableStores, ...remoteOnlyStores].find(
    (store) => store.id === resource
  ) as ResourceStore<any>;
}
