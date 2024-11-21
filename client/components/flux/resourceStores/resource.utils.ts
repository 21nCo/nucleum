import { Resource } from "./resource.enum";
import type { ResourceActionType } from "./resource.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { RecordId } from "surrealdb";
import { logger } from "../../debug/logger.client";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}_${action}`;
}

export function determineResourceType(id: IRecordId): Resource {
  if (typeof id !== "string") return id.tb as Resource;
  const parts = id.split(":");
  if (parts.length > 1) return parts[0] as Resource;
  return Resource.unknown;
}

/**
 * Checks if the given items are the same resource.
 * @param item1 - The first item to compare. Can be a string or a {@link IRecordId} or an object with an id which is {@link IRecordId}
 * @param item2 - The second item to compare. Can be a string or a {@link IRecordId} or an object with an id which is {@link IRecordId}
 * @returns True if the items are the same resource, false otherwise.
 */
export function isSameResource(
  item1: IRecordId | { id: IRecordId },
  item2: IRecordId | { id: IRecordId }
) {
  try {
    if (typeof item1 === "string" && typeof item2 === "string") {
      return item1 === item2;
    } else if (typeof item1 !== "string" && typeof item2 !== "string") {
      if ("tb" in item1 && "tb" in item2) {
        return item1.tb === item2.tb && item1.id === item2.id;
      } else if ("tb" in item1) {
        return item1.toString() === item2.id.toString();
      } else if ("tb" in item2) {
        return item1.id.toString() === item2.toString();
      } else if (item1.id && item2.id) {
        return item1.id.toString() === item2.id.toString();
      }
    } else if (typeof item1 === "string" && typeof item2 !== "string") {
      if ("tb" in item2) return item2.toString() === item1;
      return item2.id.toString() === item1;
    } else if (typeof item2 === "string" && typeof item1 !== "string") {
      if ("tb" in item1) return item1.toString() === item2;
      return item1.id.toString() === item2;
    }
    return false;
  } catch (e) {
    logger.error({ at: "isSameResource", item1, item2, error: e });
    return false;
  }
}

/**
 * Checks if the given item is present in the list of resources.
 * @param toCheck - The resource to check for.
 * @returns A function that takes an item and returns true if it is the same resource as the given id.
 */
export function resourceInList(toCheck: IRecordId | { id: IRecordId }) {
  if (!toCheck) return () => false;
  return (item: { id: IRecordId } | IRecordId) => {
    return isSameResource(item, toCheck);
  };
}

export const removeDuplicatesFilter = (
  item: any,
  index: number,
  self: any[]
) => {
  return self.findIndex((t) => isSameResource(t, item)) === index;
};

export function stringToRecordId(id: string): IRecordId {
  const parts = id.split(":");
  return new RecordId(parts[0], parts[1]);
}

export function isNoneResource(id: IRecordId | string | undefined) {
  if (!id) return false;
  return id.toString()?.split(":")?.pop() === "none";
}

export function isRecordId(id: any) {
  return (
    (typeof id === "string" && id.includes(":")) ||
    (typeof id === "object" && "tb" in id)
  );
}
