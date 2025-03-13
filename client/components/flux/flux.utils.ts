import {
  PersistenceActionType,
  type IMutation,
  type IRecordId
} from "$lib/client/types/data.type";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";
import { RecordId } from "surrealdb";
import type { Resource } from "./resourceStores/resource.enum";

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
    if ("isArchived" in mutationChangedProperties) {
      return mutationChangedProperties.isArchived
        ? "🗃️ Archived"
        : "↵ Unarchived";
    }
    if ("trashInformation" in mutationChangedProperties) {
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
  }
  return {
    action
  };
}
