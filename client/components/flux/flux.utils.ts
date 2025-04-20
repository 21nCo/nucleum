import {
  PersistenceActionType,
  RemovalProperty,
  type IMutation,
  type IRecordId
} from "$lib/client/types/data.type";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";
import { RecordId } from "surrealdb";
import { Resource } from "./resourceStores/resource.enum";
import { NodeType } from "$lib/client/products/memotron/node/node.type";

export function generateResourceId(
  itemType: Resource,
  params?: {
    prefix?: string;
    id?: string;
    isAsString?: boolean;
  }
): IRecordId {
  const id = params?.id ?? generateRandomIdv2();
  if (!params?.isAsString) {
    return new RecordId(
      itemType,
      (params?.prefix ? params?.prefix + "_" : "") + id
    );
  }
  return `${itemType}:${params?.prefix ? params.prefix + "_" : ""}${id}`;
}

export function resolveMutationAction(mutation: IMutation): string {
  const mutationAction = mutation.params.action;
  const mutationChangedProperties = mutation.params.record;
  if (mutationAction === PersistenceActionType.MERGE) {
    if (RemovalProperty.IS_ARCHIVED in mutationChangedProperties) {
      return mutationChangedProperties.isArchived
        ? "🗃️ Archived"
        : "↵ Unarchived";
    }
    if (RemovalProperty.TRASH_INFORMATION in mutationChangedProperties) {
      return mutationChangedProperties.trashInformation &&
        mutationChangedProperties.trashInformation !== "$NONE"
        ? "⌫ Deleted"
        : "↵ Restored";
    }
    if ("isLocked" in mutationChangedProperties) {
      return mutationChangedProperties.isLocked ? "🔒 Locked" : "🔑 Unlocked";
    }
  } else if (mutationAction === PersistenceActionType.INSERT) {
    return "Created";
  } else if (mutationAction === PersistenceActionType.DELETE) {
    return "🗑️ Deleted";
  }
  return "📝 Edited";
}

export function resolveMutationLabel(mutation: IMutation): {
  action: string;
  resourceLabel?: string;
} {
  const action = resolveMutationAction(mutation);
  if (Array.isArray(mutation.resourceId) && mutation.resourceId.length === 1) {
    return {
      action: `${action} ${mutation.resource}`,
      resourceLabel: mutation.params.records?.[0]?.label ?? "Unknown"
    };
  } else if (
    Array.isArray(mutation.resourceId) &&
    mutation.resourceId.length > 1 &&
    mutation.resource === Resource.node
  ) {
    const nodularMd = mutation.params.records.filter(
      (x) => x.contentType === NodeType.NODULAR_MARKDOWN
    );
    return {
      action: `${action} ${mutation.resource}`,
      resourceLabel: nodularMd.length > 0 ? nodularMd[0].label : "Untitled"
    };
  }
  return {
    action
  };
}
