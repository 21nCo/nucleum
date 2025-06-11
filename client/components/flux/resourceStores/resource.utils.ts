import { Resource } from "./resource.enum";
import type { ResourceAccessPoint, ResourceActionType } from "./resource.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { RecordId } from "surrealdb";
import { logger } from "../../debug/logger.client";
import { properCase } from "$lib/shared/utils/text.utils";
import type { IResourceSwitchItem } from "$lib/client/types/select.type";
import { Product } from "$lib/client/types/product.type";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}_${action}`;
}

export function resourceCacheComponentKey(resource: Resource) {
  return `${resource}-cache`;
}

export function resourceCacheKey(resource: Resource, key: string) {
  return `${resource}-${key}`;
}

export function resolveProductResources(
  product: Product,
  context: "search" | "cache" | "library" | undefined = undefined
) {
  switch (product) {
    case Product.POINTRON:
      return [Resource.goal, Resource.task, Resource.collection];
    case Product.MEMOTRON:
      if (context === "search") return [Resource.node, Resource.collection];
      else return [Resource.node, Resource.collection, Resource.relation];
    case Product.NUCLEUS:
      if (context === "search")
        return [
          Resource.node,
          Resource.goal,
          Resource.task,
          Resource.collection,
          Resource.combination
        ];
      else
        return [
          Resource.node,
          Resource.goal,
          Resource.task,
          Resource.collection,
          Resource.combination,
          Resource.relation
        ];
  }
}

export function determineResourceType(id: IRecordId): Resource {
  if (!id) return Resource.unknown;
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
    if (!item1 || !item2) return false;
    if (typeof item1 === "string" && typeof item2 === "string") {
      return item1 === item2;
    } else if (typeof item1 !== "string" && typeof item2 !== "string") {
      if ("tb" in item1 && "tb" in item2) {
        return item1.tb === item2.tb && item1.id === item2.id;
      } else if ("tb" in item1) {
        return item1.toString() === item2.id?.toString();
      } else if ("tb" in item2) {
        return item1.id?.toString() === item2.toString();
      } else if (item1.id && item2.id) {
        return item1.id.toString() === item2.id.toString();
      }
    } else if (typeof item1 === "string" && typeof item2 !== "string") {
      if ("tb" in item2) return item2.toString() === item1;
      return item2.id?.toString() === item1;
    } else if (typeof item2 === "string" && typeof item1 !== "string") {
      if ("tb" in item1) return item1.toString() === item2;
      return item1.id?.toString() === item2;
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

export function isRecordId(id: any, resource?: Resource) {
  if (resource) {
    let tb = "";
    if (typeof id === "string") tb = id.split(":")[0];
    else if (typeof id === "object" && "tb" in id) tb = id.tb;
    return tb === resource;
  }
  return (
    id &&
    ((typeof id === "string" && id.includes(":")) ||
      (typeof id === "object" && "tb" in id))
  );
}

/**
 * Shifts a resource in an array to a new position.
 * @param array - The array to shift the resource in.
 * @param fromId - The id of the resource to shift.
 * @param toId - The id of the resource to shift to.
 * @param isPlaceAfter - Whether to place the resource after the target resource.
 * @returns The new array with the resource shifted.
 */
export function shiftResourceInArray(
  array: any[],
  fromId: string,
  toId: string,
  isPlaceAfter: boolean = false
) {
  const fromIndex = array.findIndex(resourceInList(fromId));
  const toIndex = array.findIndex(resourceInList(toId));
  if (fromIndex === -1 || toIndex === -1) return array;
  const newArray = [...array];
  if (isPlaceAfter) {
    if (fromIndex < toIndex) {
      newArray.splice(toIndex, 0, newArray.splice(fromIndex, 1)[0]);
    } else {
      newArray.splice(toIndex + 1, 0, newArray.splice(fromIndex, 1)[0]);
    }
  } else {
    newArray.splice(toIndex, 0, newArray.splice(fromIndex, 1)[0]);
  }
  return newArray;
}

/**
 * Extracts the resource id from an HTML element id. Typically of the format
 * `elementType-resourceId-accessPoint-accessPointId`.
 * Example: "thumbnail-node:a3828733ae7b24e43483eb0d154cbccd-collection-collection:fef39f69d2f29949e93897a37e024f09"
 * @param id - The element id to extract the resource id from.
 * @returns The resource id or null if it cannot be extracted.
 */
export function extractResourceIdFromElementId(id: string) {
  const parts = id.split("-");
  if (parts.length > 1) return parts[1];
  return null;
}

export function resourceIdToElementId(
  elementType: string,
  resourceId: IRecordId,
  accessPoint: ResourceAccessPoint | undefined = undefined,
  accessPointId: IRecordId | undefined = undefined
) {
  return `${elementType}-${resourceId}-${accessPoint ?? "none"}-${accessPointId ?? "none"}`;
}

export function resolveResourceIcon(resource: Resource) {
  switch (resource) {
    case Resource.collection:
      return "ph:brackets-round-light";
    case Resource.node:
      return "ph:hexagon-light";
    case Resource.relation:
      return "ph:link-simple-horizontal-light";
    case Resource.goal:
      return "ph:target-light";
    case Resource.task:
      // return "ph:check-circle-light";
      return "ph:check-square-light";
    // return "ph:circle-light";
    case Resource.todo:
      // return "ph:check-circle-light";
      return "ph:check-square-offset-light";
    case Resource.combination:
      return "ph:bounding-box-light";
    case Resource.event:
      return "ph:calendar-light";
    case Resource.habit:
      return "ph:caret-circle-up-light";
    case Resource.quest:
      return "ph:question-light";
    case Resource.session:
      return "ph:clock-light";
    case Resource.thing:
      return "ph:bicycle-light";
    case Resource.feed:
      return "ph:rss-light";
    case Resource.source:
      return "ph:globe-light";
    case Resource.account:
      return "ph:bank-light";
    case Resource.transaction:
      return "ph:arrows-left-right-light";
    case Resource.fellow:
      return "ph:user-light";
    case Resource.place:
      return "ph:map-pin-light";
    case Resource.input:
      return "ph:arrow-down-left-light";
    default:
      return "ph:question-fill";
  }
}

export const availableResources = [
  Resource.collection,
  Resource.combination,
  Resource.node,
  Resource.relation,
  Resource.goal,
  Resource.task
];

export const betaResources = [Resource.combination];

export function resolveResourceSwitcher(): IResourceSwitchItem[] {
  const resources = [
    Resource.event,
    Resource.collection,
    Resource.combination,
    Resource.goal,
    Resource.task,
    Resource.habit,
    Resource.quest,
    Resource.session,
    Resource.node,
    Resource.relation,
    Resource.thing,
    Resource.feed,
    Resource.source,
    Resource.account,
    Resource.transaction,
    Resource.fellow,
    Resource.place,
    Resource.input
  ];

  return resources.map((resource) => ({
    label: properCase(resource) + "s",
    value: resource,
    icon: resolveResourceIcon(resource),
    isDisabled: !availableResources.includes(resource),
    badge: !availableResources.includes(resource)
      ? "Planned"
      : betaResources.includes(resource)
        ? "New"
        : undefined
  }));
}

export function isShowStatusBanner(resource: any) {
  if (!resource) return false;
  return (
    resource.isArchived ||
    resource.trashInformation ||
    resource.isParentInactive ||
    resource.isLocked ||
    resource.isInReadOnlyMode
  );
}
