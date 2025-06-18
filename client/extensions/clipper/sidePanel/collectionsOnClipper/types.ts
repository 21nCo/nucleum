import { CollectionType } from "$lib/client/components/collection/collection.type";

export interface CollectionData {
  id: string;
  label: string;
  avatar?: any;
  type: CollectionType;
  itemCount: number;
}

export interface CollectionItem {
  id: string;
  label: string;
  url?: string;
  metadata?: any;
} 