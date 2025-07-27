import type { IStore } from "$lib/client/types/data.type";
import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";

export type DocStore = IStore & {
  docs: INodeThumb[];
};

export type Doc = Node;
