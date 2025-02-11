import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export function isCustomPane(resource: Resource) {
  return [Resource.relation].includes(resource);
}
