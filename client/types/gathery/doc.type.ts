import type { IStore } from "$lib/client/types/data.type";
import type { INodeThumbnail } from "$lib/client/products/memotron/node/node.type";

export type DocStore = IStore & {
  docs: INodeThumbnail[];
};

export type Doc = Node;
