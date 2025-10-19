import { CollectionType } from "@21n/components/collection/collection.type";
import type { NodeType } from "@21n/products/memotron/node/node.type";

export interface CollectionData {
  id: string;
  label: string;
  avatar?: string | null;
  type: CollectionType;
  itemCount: number;
  lastModified?: Date;
}

export interface CollectionItem {
  id: string;
  label: string;
  url?: string;
  metadata?: unknown;
  contentType: NodeType;
  parent?: string;
  body?: unknown;
}
