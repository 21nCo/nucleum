import type { NodeType } from "$lib/client/products/memotron/node/node.type";
import type { CollectionType } from "$lib/client/components/collection/collection.type";

export type SubType =
  | "all"
  | "recents"
  | "starred"
  | NodeType
  | CollectionType
  | "incomplete"
  | "bydate"
  | "bymonth"
  | "without-due-date";
