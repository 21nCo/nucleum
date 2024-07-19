import {
  CollectionType,
  type ICollection
} from "$lib/client/types/memotron/collection.type";
import { MemotronResourceType } from "$lib/client/types/memotron/common.type";
import type { INodeBase } from "$lib/client/types/memotron/node.type";

export function determineResourceType(item: ICollection | INodeBase) {
  if (item.id.startsWith("node:")) return MemotronResourceType.NODE;
  else if (item.id.startsWith("task:")) return MemotronResourceType.TASK;
  else if (item.id.startsWith("combination:"))
    return MemotronResourceType.COMBINATION;
  else if (item.id.startsWith("collection:")) {
    if (item.type === CollectionType.TYPED)
      return MemotronResourceType.TYPED_COLLECTION;
    else if (item.type === CollectionType.QUERY)
      return MemotronResourceType.QUERY_COLLECTION;
    else return MemotronResourceType.COLLECTION;
  } else return MemotronResourceType.NODE;
}
