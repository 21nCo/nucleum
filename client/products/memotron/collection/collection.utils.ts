import { CollectionType } from "./collection.type";

export function resolveCollectionTypeIcon(type: CollectionType) {
  switch (type) {
    case CollectionType.UNTYPED:
      return "ph:brackets-round";
    case CollectionType.TYPED:
      return "ph:cube";
    case CollectionType.QUERY:
      return "ph:database";
  }
}

export function resolveCollectionTypeLabel(type: CollectionType) {
  switch (type) {
    case CollectionType.UNTYPED:
      return "Simple";
    case CollectionType.TYPED:
      return "Typed";
    case CollectionType.QUERY:
      return "Query";
  }
}
