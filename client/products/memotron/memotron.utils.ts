import {
  CollectionType,
  type ICollection
} from "$lib/client/products/memotron/collection/collection.type";
import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
import type { INode } from "$lib/client/products/memotron/node/node.type";

export function resolveResourceType(item: ICollection | INode) {
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
