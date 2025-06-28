import { CollectionType } from "$lib/client/components/collection/collection.type";
import type { NodeType } from "$lib/client/products/memotron/node/node.type";

export interface CollectionData {
  id: string;
  label: string;
  avatar?: any;
  type: CollectionType;
  itemCount: number;
  lastModified?: Date;
}

export interface CollectionItem {
  id: string;
  label: string;
  url?: string;
  metadata?: any;
  contentType: NodeType;
  parent?: string;
  body?: any;
} 