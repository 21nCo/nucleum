import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  CollectionType,
  type ICollection
} from "$lib/client/products/memotron/collection/collection.type";
import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
import type {
  INode,
  NodeType
} from "$lib/client/products/memotron/node/node.type";

import { copyToClipboard } from "$lib/client/utils/utils";
import { enumToCamelCase } from "$lib/shared/utils/text.utils";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";

export function resolveResourceType(item: ICollection | INode) {
  if (typeof item.id !== "string") return item.id.tb as MemotronResourceType;
  if (item.id.startsWith("node:")) return MemotronResourceType.NODE;
  else if (item.id.startsWith("task:")) return MemotronResourceType.TASK;
  else if (item.id.startsWith("combination:"))
    return MemotronResourceType.COMBINATION;
  else if (item.id.startsWith("collection:") && "type" in item) {
    if (item.type === CollectionType.TYPED)
      return MemotronResourceType.TYPED_COLLECTION;
    else if (item.type === CollectionType.QUERY)
      return MemotronResourceType.QUERY_COLLECTION;
    else return MemotronResourceType.COLLECTION;
  } else return MemotronResourceType.NODE;
}

function resolveLinkForResource(resource: string) {
  return (
    "http://" +
    (import.meta.env?.VITE_HOST ?? window.location.host) +
    "/?focus=" +
    resource
  );
}

export function copyResourceLinkToClipboard(id: string) {
  const link = resolveLinkForResource(id);
  copyToClipboard(link);
}

/**
 * Generates a node id using the externalId and type.
 * @param externalId
 * @param type NodeType
 * @returns
 */
export function generateSyncedResourceId(externalId: string, type: NodeType) {
  return generateResourceId(Resource.node, {
    prefix: enumToCamelCase(type),
    id: externalId
  });
}
