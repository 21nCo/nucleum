import type { Resource } from "./resource.enum";
import type { ResourceActionType } from "./resource.type";
import type { IRecordId } from "$lib/client/types/data.type";

export function resourceAction(resource: Resource, action: ResourceActionType) {
  return `${resource}_${action}`;
}

export function determineResourceType(id: IRecordId) {
  if (typeof id !== "string") return id.tb as Resource;
  const parts = id.split(":");
  if (parts.length > 1) return parts[0] as Resource;
  return id;
}
