import type { ICacheableStore } from "$lib/client/types/data.type";
import type { INodeThumbnail } from "$lib/client/types/memotron/node.type";

export type DocStore = ICacheableStore & {
  docs: INodeThumbnail[];
};

export type Doc = Node;
