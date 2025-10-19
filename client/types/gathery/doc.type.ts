import type { IStore } from "@21n/types/data.type";
import type { INodeThumb } from "@21n/products/memotron/node/node.type";

export type DocStore = IStore & {
  docs: INodeThumb[];
};

export type Doc = Node;
