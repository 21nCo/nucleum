import type { NodeType } from "@21n/products/memotron/node/node.type";
import type { CollectionType } from "@21n/components/collection/collection.type";
import type { TaskSubTypeForSwitcher } from "@21n/components/tasks/task.type";

export type SubType =
  | "all"
  | "recents"
  | "starred"
  | NodeType
  | CollectionType
  | "incomplete"
  | TaskSubTypeForSwitcher;
