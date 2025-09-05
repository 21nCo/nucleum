import type { Resource } from "./resource.enum";
import type { ResourceStore } from "./resource.store";
import { productData } from "$lib/client/products/product.resolver";

export function resolveResourceStore(resource: Resource) {
  return [
    ...productData.stores.cacheableStores,
    ...productData.stores.remoteOnlyStores
  ].find((store) => store.id === resource) as ResourceStore<any>;
}
